// Granular server operations for the WALLET-DRIVEN /defense flow: the connected operator wallet
// signs the DirectExecuteFromAccount typed data in the browser (Privy); these helpers build the
// payload, relay the signed operation, and run the server-side attack (7702 delegation) + reads.
// The signing key never lives here, only the relayer (gas) and the attacker's delegation of the
// demo operator do. Mirrors the mechanism in defense-engine.ts (the no-wallet fallback run).
import {
  createWalletClient, createPublicClient, http, defineChain, keccak256,
  encodeAbiParameters, getContract, zeroAddress, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const MODE = (process.env.DEFENSE_MODE || "testnet").toLowerCase();
const RPC = process.env.DEFENSE_RPC || process.env.DEFENSE_FORK_RPC ||
  (MODE === "fork" ? "http://localhost:8549" : "https://rpc.ankr.com/whitechain_testnet");
const chain = defineChain({
  id: 1874, name: "Whitechain Testnet",
  nativeCurrency: { name: "WhiteBIT Coin", symbol: "WBT", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const INTERACT = "0xE389bE2d72c618290E1AdFF7B8BbEE39eC356e45" as const;
const VAULT = "0x371B4E49A510Ee007d7879783B309128975CC1A1" as const;
const TOKEN = "0x1d9F8351F788278D3E181908cEE14c7F5766157F" as const;
const OPPOL = "0x16c6cdf01674895064373cb0d719b21d67853b8f64a24a73d7c419b6e0817772" as const;
const IID = "0xc918a5f1cb2670f14afa8bb1928f6a298e37fe1eb914df1b4ec7da9e9f38222a" as const;
const SWEEPER = "0xb17f589b3dd10a05d4ef4ed1bdbe4cee8ec2da25" as const;
const RECIP = "0xcBAee4793486f3Df37dbb584F5a3610ff581A614" as const;
const ANVIL0_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OPERATOR_PK = (process.env.DEFENSE_OPERATOR_PK || "").trim() as Hex;
const RELAYER_PK = (process.env.DEFENSE_RELAYER_PK || ANVIL0_PK).trim() as Hex;
const AMOUNT = 1_000_000_000n; // 1,000 USDC
const SELECTORS: Record<string, string> = { "0xb3c56776": "InvalidActorSignature", "0xc59401f3": "ActorDelegated" };

const INTERACT_ABI = [
  { type: "function", name: "getExecutionBindingHash", stateMutability: "view", inputs: [{ name: "id", type: "bytes32" }, { name: "policyId", type: "bytes32" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "directExecuteNonce", stateMutability: "view", inputs: [{ name: "actor", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "directExecuteFromAccount", stateMutability: "payable", inputs: [
    { name: "account", type: "address" }, { name: "policyId", type: "bytes32" }, { name: "id", type: "bytes32" },
    { name: "args", type: "uint256[]" }, { name: "maxSteps", type: "uint256" }, { name: "maxNativeValue", type: "uint256" },
    { name: "deadline", type: "uint256" }, { name: "actor", type: "address" }, { name: "actorSignature", type: "bytes" },
  ], outputs: [{ type: "uint256" }] },
] as const;
const ERC20_ABI = [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }] as const;

const pub = createPublicClient({ chain, transport: http(RPC) });
const operator = OPERATOR_PK ? privateKeyToAccount(OPERATOR_PK) : null;
const relayer = privateKeyToAccount(RELAYER_PK);
const relayerWallet = createWalletClient({ account: relayer, chain, transport: http(RPC) });
const operatorWallet = operator ? createWalletClient({ account: operator, chain, transport: http(RPC) }) : null;
const interact = getContract({ address: INTERACT, abi: INTERACT_ABI, client: pub });

export const OPERATOR_ADDRESS = operator?.address ?? zeroAddress;
export const RELAYER_ADDRESS = relayer.address;
export const EXPLORER = "https://explorer.testnet.whitechain.io";
const fmt = (raw: bigint) => (Number(raw) / 1e6).toLocaleString("en-US");
const reason = (e: unknown): string => {
  const msg = e instanceof Error ? e.message : String(e);
  const sel = (msg.match(/0x[0-9a-fA-F]{8}/) || [])[0]?.toLowerCase();
  return (sel && SELECTORS[sel]) || (/InvalidActorSignature/.test(msg) ? "InvalidActorSignature" : /ActorDelegated/.test(msg) ? "ActorDelegated" : "reverted");
};
const bal = (a: `0x${string}`) => pub.readContract({ address: TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [a] });
const isDelegated = async () => ((await pub.getCode({ address: OPERATOR_ADDRESS })) ?? "0x").toLowerCase().startsWith("0xef0100");

/** Live balances + operator delegation state. */
export async function readState() {
  return {
    vault: VAULT, operator: OPERATOR_ADDRESS, relayer: RELAYER_ADDRESS,
    vaultUSDC: fmt(await bal(VAULT)), recipientUSDC: fmt(await bal(RECIP)),
    operatorCode: (await pub.getCode({ address: OPERATOR_ADDRESS })) ?? "0x",
    delegated: await isDelegated(),
    amount: fmt(AMOUNT), sweeper: SWEEPER,
  };
}

/** Build the exact DirectExecuteFromAccount EIP-712 payload for the operator wallet to sign. */
export async function buildPayoutTypedData() {
  const argsHash = keccak256(encodeAbiParameters([{ type: "uint256[]" }], [[BigInt(RECIP), AMOUNT]]));
  const executionBindingHash = await interact.read.getExecutionBindingHash([IID, OPPOL]);
  const nonce = await interact.read.directExecuteNonce([OPERATOR_ADDRESS]);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const message = {
    actor: OPERATOR_ADDRESS, forwarder: RELAYER_ADDRESS, account: VAULT, policyId: OPPOL, interactionId: IID,
    argsHash, executionBindingHash, maxSteps: "100000", nativeValue: "0", deadline: deadline.toString(), chainId: "1874", nonce: nonce.toString(),
  };
  return {
    deadline: deadline.toString(),
    typedData: {
      domain: { name: "Interact", version: "1", chainId: 1874, verifyingContract: INTERACT },
      types: { DirectExecuteFromAccount: [
        { name: "actor", type: "address" }, { name: "forwarder", type: "address" }, { name: "account", type: "address" },
        { name: "policyId", type: "bytes32" }, { name: "interactionId", type: "bytes32" }, { name: "argsHash", type: "bytes32" },
        { name: "executionBindingHash", type: "bytes32" }, { name: "maxSteps", type: "uint256" }, { name: "nativeValue", type: "uint256" },
        { name: "deadline", type: "uint256" }, { name: "chainId", type: "uint256" }, { name: "nonce", type: "uint256" },
      ] },
      primaryType: "DirectExecuteFromAccount",
      message,
    },
  };
}

/** Relay a wallet-signed payout. Broadcasts with an explicit gas cap (skips eth_estimateGas, which
 *  can falsely revert on a stale load-balanced node) and judges by the receipt status (real state). */
export async function submitPayout(deadline: string, signature: Hex, expectRefusal: boolean) {
  const call = { address: INTERACT, abi: INTERACT_ABI, functionName: "directExecuteFromAccount",
    args: [VAULT, OPPOL, IID, [BigInt(RECIP), AMOUNT], 100000n, 0n, BigInt(deadline), OPERATOR_ADDRESS, signature] } as const;
  try {
    const hash = await relayerWallet.writeContract({ ...call, gas: 2_000_000n });
    const rc = await pub.waitForTransactionReceipt({ hash });
    const vaultUSDC = fmt(await bal(VAULT)); const recipientUSDC = fmt(await bal(RECIP));
    if (expectRefusal) {
      return rc.status === "success"
        ? { ok: true, hash, vaultUSDC, recipientUSDC }
        : { ok: false, reason: "InvalidActorSignature", hash, vaultUSDC, recipientUSDC };
    }
    if (rc.status === "success") return { ok: true, hash, vaultUSDC, recipientUSDC };
    return { ok: false, reason: "reverted", hash, vaultUSDC, recipientUSDC };
  } catch (e) {
    return { ok: false, reason: reason(e), vaultUSDC: fmt(await bal(VAULT)), recipientUSDC: fmt(await bal(RECIP)) };
  }
}

async function waitForDelegation(delegated: boolean) {
  for (let i = 0; i < 24; i++) { if ((await isDelegated()) === delegated) return; await new Promise((r) => setTimeout(r, 1500)); }
}

/** The attacker 7702-delegates the demo operator to the sweeper (server-side; needs the operator key). */
export async function hijackOperator() {
  if (!operatorWallet) throw new Error("DEFENSE_OPERATOR_PK not set on the server.");
  const auth = await operatorWallet.signAuthorization({ contractAddress: SWEEPER, executor: "self" });
  const hash = await operatorWallet.sendTransaction({ authorizationList: [auth], to: OPERATOR_ADDRESS });
  await pub.waitForTransactionReceipt({ hash });
  await waitForDelegation(true);
  return { hash, code: (await pub.getCode({ address: OPERATOR_ADDRESS })) ?? "0x", sweeper: SWEEPER };
}

/** Restore the operator to a clean key (clears any 7702 delegation). */
export async function resetOperator() {
  if (!operatorWallet) throw new Error("DEFENSE_OPERATOR_PK not set on the server.");
  if (!(await isDelegated())) return { hash: null, delegated: false };
  const auth = await operatorWallet.signAuthorization({ contractAddress: zeroAddress, executor: "self" });
  const hash = await operatorWallet.sendTransaction({ authorizationList: [auth], to: OPERATOR_ADDRESS });
  await pub.waitForTransactionReceipt({ hash });
  await waitForDelegation(false);
  return { hash, delegated: false };
}
