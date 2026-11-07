// Standalone verification of the full /defense flow against the Whitechain anvil fork.
// Proves, with the REAL deployed Chainwall contracts (no Safe):
//   legit  : a clean operator's signed authorization -> directExecuteFromAccount executes the transfer
//   hijack : the operator is 7702-delegated to the sweeper
//   refuse : the same operator's signed authorization is refused (isValidSignature routed to the sweeper)
//
// Run: node scripts/defense-run.mjs   (needs the fork on :8549 and .env.approver3)
import { createWalletClient, createPublicClient, http, defineChain, keccak256, encodeAbiParameters, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";

const RPC = process.env.FORK_RPC || "http://localhost:8549";
const chain = defineChain({ id: 1874, name: "Whitechain Fork", nativeCurrency: { name: "WBT", symbol: "WBT", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });

const INTERACT = "0xE389bE2d72c618290E1AdFF7B8BbEE39eC356e45";
const VAULT    = "0x371B4E49A510Ee007d7879783B309128975CC1A1";
const TOKEN    = "0x1d9F8351F788278D3E181908cEE14c7F5766157F";
const OPPOL    = "0x16c6cdf01674895064373cb0d719b21d67853b8f64a24a73d7c419b6e0817772"; // operator-1of
const IID      = "0xc918a5f1cb2670f14afa8bb1928f6a298e37fe1eb914df1b4ec7da9e9f38222a"; // tier-transfer
const SWEEPER  = "0xb17f589b3dd10a05d4ef4ed1bdbe4cee8ec2da25";
const RECIP    = "0xcBAee4793486f3Df37dbb584F5a3610ff581A614";
const ANVIL0_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // relayer (prefunded)

const operatorPk = readFileSync(new URL("../.env.approver3", import.meta.url), "utf8").match(/APPROVER3_PK=(.*)/)[1].trim();
const operator = privateKeyToAccount(operatorPk);
const relayer  = privateKeyToAccount(ANVIL0_PK);

const pub = createPublicClient({ chain, transport: http(RPC) });
const relayerWallet  = createWalletClient({ account: relayer,  chain, transport: http(RPC) });
const operatorWallet = createWalletClient({ account: operator, chain, transport: http(RPC) });

const INTERACT_ABI = [
  { type: "function", name: "getExecutionBindingHash", stateMutability: "view", inputs: [{ name: "id", type: "bytes32" }, { name: "policyId", type: "bytes32" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "directExecuteNonce", stateMutability: "view", inputs: [{ name: "actor", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "directExecuteFromAccount", stateMutability: "payable",
    inputs: [{ name: "account", type: "address" }, { name: "policyId", type: "bytes32" }, { name: "id", type: "bytes32" }, { name: "args", type: "uint256[]" }, { name: "maxSteps", type: "uint256" }, { name: "maxNativeValue", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "actor", type: "address" }, { name: "actorSignature", type: "bytes" }], outputs: [{ type: "uint256" }] },
];
const ERC20_ABI = [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }];
const interact = getContract({ address: INTERACT, abi: INTERACT_ABI, client: pub });
const usdc = (raw) => (Number(raw) / 1e6).toLocaleString();
const bal = (a) => pub.readContract({ address: TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [a] });

const AMOUNT = 1_000_000_000n; // 1,000 USDC
const recipAsWord = BigInt(RECIP);

// Build the exact DirectExecuteFromAccount EIP-712 request the contract validates.
async function buildSignedRequest({ forwarder }) {
  const argsHash = keccak256(encodeAbiParameters([{ type: "uint256[]" }], [[recipAsWord, AMOUNT]]));
  const executionBindingHash = await interact.read.getExecutionBindingHash([IID, OPPOL]);
  const nonce = await interact.read.directExecuteNonce([operator.address]);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const message = {
    actor: operator.address, forwarder, account: VAULT, policyId: OPPOL, interactionId: IID,
    argsHash, executionBindingHash, maxSteps: 100000n, nativeValue: 0n, deadline, chainId: 1874n, nonce,
  };
  const signature = await operatorWallet.signTypedData({
    domain: { name: "Interact", version: "1", chainId: 1874, verifyingContract: INTERACT },
    types: { DirectExecuteFromAccount: [
      { name: "actor", type: "address" }, { name: "forwarder", type: "address" }, { name: "account", type: "address" },
      { name: "policyId", type: "bytes32" }, { name: "interactionId", type: "bytes32" }, { name: "argsHash", type: "bytes32" },
      { name: "executionBindingHash", type: "bytes32" }, { name: "maxSteps", type: "uint256" }, { name: "nativeValue", type: "uint256" },
      { name: "deadline", type: "uint256" }, { name: "chainId", type: "uint256" }, { name: "nonce", type: "uint256" } ] },
    primaryType: "DirectExecuteFromAccount", message,
  });
  return { signature, deadline };
}

async function tryPayout(label) {
  const { signature, deadline } = await buildSignedRequest({ forwarder: relayer.address });
  const args = { address: INTERACT, abi: INTERACT_ABI, functionName: "directExecuteFromAccount",
    args: [VAULT, OPPOL, IID, [recipAsWord, AMOUNT], 100000n, 0n, deadline, operator.address, signature] };
  try {
    await pub.simulateContract({ ...args, account: relayer }); // will throw on revert
    const hash = await relayerWallet.writeContract(args);
    const rcpt = await pub.waitForTransactionReceipt({ hash });
    console.log(`  ${label}: EXECUTED  tx=${hash} status=${rcpt.status}`);
    return { ok: true, hash };
  } catch (e) {
    const m = (e.shortMessage || e.message || "").split("\n")[0];
    const sel = (m.match(/0x[0-9a-fA-F]{8}/) || [])[0] || (/InvalidActorSignature/.test(e.message) ? "InvalidActorSignature" : "");
    console.log(`  ${label}: REFUSED   ${sel || m}`);
    return { ok: false, reason: sel || m };
  }
}

async function setCode(addr, code) { await pub.request({ method: "anvil_setCode", params: [addr, code] }); }
async function setBalance(addr) { await pub.request({ method: "anvil_setBalance", params: [addr, "0x3635c9adc5dea00000"] }); }

(async () => {
  await setBalance(relayer.address); await setBalance(operator.address);
  console.log("STEP vault   : vault USDC =", usdc(await bal(VAULT)), " recipient USDC =", usdc(await bal(RECIP)));

  console.log("STEP cleanup : ensure operator starts as a clean EOA");
  await setCode(operator.address, "0x");
  console.log("  operator code =", (await pub.getCode({ address: operator.address })) || "0x (clean)");

  console.log("STEP payout  : clean operator signs a 1,000 USDC payout, relayer broadcasts");
  const legit = await tryPayout("payout");
  console.log("  vault USDC after =", usdc(await bal(VAULT)), " recipient USDC after =", usdc(await bal(RECIP)));

  console.log("STEP hijack  : 7702-delegate the operator to the sweeper");
  await setCode(operator.address, "0xef0100" + SWEEPER.slice(2).toLowerCase());
  console.log("  operator code =", await pub.getCode({ address: operator.address }));

  console.log("STEP refuse  : the SAME operator signs another payout -> Chainwall refuses");
  const refused = await tryPayout("refuse");
  console.log("  vault USDC after =", usdc(await bal(VAULT)), " recipient USDC after =", usdc(await bal(RECIP)));

  console.log("\nRESULT:", legit.ok && !refused.ok
    ? "PASS — clean operator executed, 7702-delegated operator refused. Funds safe."
    : "FAIL — unexpected: legit.ok=" + legit.ok + " refused.ok=" + refused.ok);
  await setCode(operator.address, "0x"); // leave clean
})().catch((e) => { console.error(e); process.exit(1); });
