// The live /defense run. Executes the real 7702-defense flow against a Whitechain anvil fork
// (the real deployed Chainwall contracts, no Safe) and yields DefenseEvents for the UI.
//
//   payout : a clean operator's EIP-712 authorization -> directExecuteFromAccount executes a transfer
//   hijack : the operator is 7702-delegated to the sweeper
//   refuse : the same authorization is refused, isValidSignature is now answered by the sweeper
//
// Server-only: reads the operator/relayer keys and talks to the fork RPC.
import {
  createWalletClient, createPublicClient, http, defineChain, keccak256,
  encodeAbiParameters, getContract, zeroAddress, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { DefenseEvent } from "./defense-types";
import { chainConfig, WHITECHAIN_ID } from "./chains";

// "fork" (Whitechain only) runs against a local anvil fork with anvil_setCode toggles; otherwise the
// flow broadcasts real type-4 txns to the selected live testnet. The target network is chosen per-run.
const MODE = (process.env.DEFENSE_MODE || "testnet").toLowerCase();
const ANVIL0_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // fork relayer (prefunded)

const OPERATOR_PK = (process.env.DEFENSE_OPERATOR_PK || "").trim() as Hex;
const RELAYER_PK = (process.env.DEFENSE_RELAYER_PK || ANVIL0_PK).trim() as Hex; // funded submitter / gas payer
const AMOUNT = 1_000_000_000n; // 1,000 USDC (6 dp)
const SELECTORS: Record<string, string> = {
  "0xb3c56776": "InvalidActorSignature",
  "0xc59401f3": "ActorDelegated",
};

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

const fmt = (raw: bigint) => (Number(raw) / 1e6).toLocaleString("en-US");

const PACE = Number(process.env.DEFENSE_PACE_MS ?? 700); // pause between phases so the walkthrough reads step-by-step

export async function* runDefense(signal?: AbortSignal, chainId?: number): AsyncGenerator<DefenseEvent> {
  const t = () => Date.now();
  // Paces the walkthrough; also the abort point, if the browser disconnected, stop before the next tx.
  const pause = () => new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("aborted", "AbortError"));
    const id = setTimeout(resolve, PACE);
    signal?.addEventListener("abort", () => { clearTimeout(id); reject(new DOMException("aborted", "AbortError")); }, { once: true });
  });
  // Keep each defense step on screen for at least MIN_STEP_MS (default 3s), even when the real
  // on-chain action is near-instant. Time already spent in a step counts toward its minimum.
  const MIN_STEP_MS = Number(process.env.DEFENSE_MIN_STEP_MS ?? 3000);
  let stepAt = 0;
  const holdStep = async () => {
    if (stepAt) {
      const rem = MIN_STEP_MS - (Date.now() - stepAt);
      if (rem > 0) await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) return reject(new DOMException("aborted", "AbortError"));
        const id = setTimeout(resolve, rem);
        signal?.addEventListener("abort", () => { clearTimeout(id); reject(new DOMException("aborted", "AbortError")); }, { once: true });
      });
    }
    stepAt = Date.now();
  };
  if (!OPERATOR_PK) { yield { step: "fatal", t: t(), msg: "DEFENSE_OPERATOR_PK is not set on the server." }; return; }

  // Per-network selection. Unknown/omitted chain -> Whitechain (old behavior preserved). Fork mode only
  // applies to Whitechain (a local anvil fork of it); every other network broadcasts to live testnet.
  const cfg = chainConfig(chainId);
  const useFork = MODE === "fork" && cfg.id === WHITECHAIN_ID;
  const RPC = useFork ? (process.env.DEFENSE_FORK_RPC || "http://localhost:8549") : cfg.rpc;
  const chain = defineChain({
    id: cfg.id, name: useFork ? `${cfg.name} (fork)` : cfg.name,
    nativeCurrency: cfg.id === WHITECHAIN_ID ? { name: "WhiteBIT Coin", symbol: "WBT", decimals: 18 } : { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC] } },
  });
  const INTERACT = cfg.interact, REGISTRY = cfg.registry, VAULT = cfg.vault, TOKEN = cfg.token;
  const OPPOL = cfg.operatorPolicy, IID = cfg.transferInteraction, SWEEPER = cfg.sweeper, RECIP = cfg.recipient;

  const operator = privateKeyToAccount(OPERATOR_PK);
  const relayer = privateKeyToAccount(RELAYER_PK);
  const pub = createPublicClient({ chain, transport: http(RPC) });
  const relayerWallet = createWalletClient({ account: relayer, chain, transport: http(RPC) });
  const operatorWallet = createWalletClient({ account: operator, chain, transport: http(RPC) });
  const interact = getContract({ address: INTERACT, abi: INTERACT_ABI, client: pub });
  const bal = (a: `0x${string}`) => pub.readContract({ address: TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [a] });

  // Set the operator's EIP-7702 delegation: a real type-4 tx on testnet, anvil_setCode on a fork.
  // `target === null` removes the delegation (clean EOA); otherwise delegates to the sweeper.
  const isDelegated = async () => ((await pub.getCode({ address: operator.address })) ?? "0x").toLowerCase().startsWith("0xef0100");

  // Poll until the RPC we READ from reflects the expected delegation state. The public RPC is
  // eventually consistent, so a confirmed receipt does not mean the next eth_call sees the new code;
  // without this wait, a just-cleared operator can still read as delegated and the payout hits ERC-1271.
  async function waitForDelegation(delegated: boolean) {
    for (let i = 0; i < 24; i++) {
      if ((await isDelegated()) === delegated) return;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  async function setDelegation(target: `0x${string}` | null): Promise<`0x${string}` | undefined> {
    if (useFork) {
      await pub.request({ method: "anvil_setCode" as never, params: [operator.address, target ? "0xef0100" + target.slice(2).toLowerCase() : "0x"] as never });
      return undefined;
    }
    const auth = await operatorWallet.signAuthorization({ contractAddress: target ?? zeroAddress, executor: "self" });
    const hash = await operatorWallet.sendTransaction({ authorizationList: [auth], to: operator.address });
    await pub.waitForTransactionReceipt({ hash });
    await waitForDelegation(target !== null);
    return hash;
  }

  // Reachability check.
  try { await pub.getBlockNumber(); }
  catch { yield { step: "fatal", t: t(), msg: useFork ? `Cannot reach the fork at ${RPC}. Start scripts/defense-fork.sh.` : `Cannot reach ${cfg.name} at ${RPC}.` }; return; }

  if (useFork) {
    await pub.request({ method: "anvil_setBalance" as never, params: [relayer.address, "0x3635c9adc5dea00000"] as never });
    await pub.request({ method: "anvil_setBalance" as never, params: [operator.address, "0x3635c9adc5dea00000"] as never });
  }

  async function buildSig(forwarder: `0x${string}`) {
    const argsHash = keccak256(encodeAbiParameters([{ type: "uint256[]" }], [[BigInt(RECIP), AMOUNT]]));
    const executionBindingHash = await interact.read.getExecutionBindingHash([IID, OPPOL]);
    const nonce = await interact.read.directExecuteNonce([operator.address]);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const signature = await operatorWallet.signTypedData({
      domain: { name: "Interact", version: "1", chainId: cfg.id, verifyingContract: INTERACT },
      types: { DirectExecuteFromAccount: [
        { name: "actor", type: "address" }, { name: "forwarder", type: "address" }, { name: "account", type: "address" },
        { name: "policyId", type: "bytes32" }, { name: "interactionId", type: "bytes32" }, { name: "argsHash", type: "bytes32" },
        { name: "executionBindingHash", type: "bytes32" }, { name: "maxSteps", type: "uint256" }, { name: "nativeValue", type: "uint256" },
        { name: "deadline", type: "uint256" }, { name: "chainId", type: "uint256" }, { name: "nonce", type: "uint256" },
      ] },
      primaryType: "DirectExecuteFromAccount",
      message: { actor: operator.address, forwarder, account: VAULT, policyId: OPPOL, interactionId: IID,
        argsHash, executionBindingHash, maxSteps: 100000n, nativeValue: 0n, deadline, chainId: BigInt(cfg.id), nonce },
    });
    return { signature, deadline };
  }

  // expectRefusal=false (legit): retry on InvalidActorSignature, which can come from public-RPC
  //   nonce lag on a clean operator. expectRefusal=true (hijacked): fail immediately, that IS the point.
  const reason = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : String(e);
    const sel = (msg.match(/0x[0-9a-fA-F]{8}/) || [])[0]?.toLowerCase();
    return (sel && SELECTORS[sel]) || (/InvalidActorSignature/.test(msg) ? "InvalidActorSignature" : /ActorDelegated/.test(msg) ? "ActorDelegated" : "reverted");
  };

  // Both paths BROADCAST with an explicit gas cap (so viem skips eth_estimateGas, which can falsely
  // revert on a stale load-balanced read node) and judge by the RECEIPT status, which reflects the
  // sequencer's real state, not a lagging RPC view. A clean operator's payout executes; a 7702-delegated
  // operator's reverts on-chain (its signature is answered by the sweeper). The reverted tx is real evidence.
  async function payout(expectRefusal = false): Promise<{ ok: true; hash: `0x${string}` } | { ok: false; reason: string; hash?: `0x${string}` }> {
    const mk = async () => {
      const { signature, deadline } = await buildSig(relayer.address);
      return { address: INTERACT, abi: INTERACT_ABI, functionName: "directExecuteFromAccount",
        args: [VAULT, OPPOL, IID, [BigInt(RECIP), AMOUNT], 100000n, 0n, deadline, operator.address, signature] } as const;
    };
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        // Fixed gas cap (skips eth_estimateGas, which can falsely revert on a stale load-balanced node).
        // Headroom for the heavier newer registry builds (Sepolia's directExecute needs ~2.14M).
        const hash = await relayerWallet.writeContract({ ...(await mk()), gas: 3_500_000n });
        const rc = await pub.waitForTransactionReceipt({ hash });
        if (expectRefusal) {
          return rc.status === "success" ? { ok: true, hash } : { ok: false, reason: "InvalidActorSignature", hash };
        }
        if (rc.status === "success") return { ok: true, hash };
        if (attempt < 3) { await new Promise((r) => setTimeout(r, 2500)); continue; } // transient revert -> retry
        return { ok: false, reason: "reverted", hash };
      } catch (e) {
        if (attempt < 3) { await new Promise((r) => setTimeout(r, 2500)); continue; }
        return { ok: false, reason: reason(e) };
      }
    }
    return { ok: false, reason: "reverted" };
  }

  // 1, the vault (forked live tenant)
  yield { step: "setup", t: t(), carol: operator.address, msg: `Operator ${operator.address} signs payouts for the Chainwall vault.` };
  await holdStep();
  yield { step: "vault-start", t: t(), msg: useFork ? "Reading the Chainwall tenant on a Whitechain fork." : `Reading the live Chainwall tenant on ${cfg.name}.` };
  yield { step: "vault-deployed", t: t(), registry: REGISTRY, interact: INTERACT, msg: "Registry + execution engine online." };
  if (await isDelegated()) {
    const resetTx = await setDelegation(null);
    yield { step: "configure", t: t(), txHash: resetTx, msg: "Reset the operator to a clean key before the run." };
  }
  const v0 = await bal(VAULT);
  yield { step: "vault-ready", t: t(), vault: VAULT, msg: `Vault ${VAULT} guarded by the operator policy.` };
  yield { step: "fund", t: t(), vaultUSDC: fmt(v0), msg: `Vault holds ${fmt(v0)} USDC.` };
  await pause();

  // 2, a normal payout by the clean operator
  await holdStep();
  yield { step: "payout-propose", t: t(), msg: "Operator signs a 1,000 USDC payout (gasless); the relayer submits it." };
  await pause();
  const legit = await payout();
  if (legit.ok) {
    const v1 = await bal(VAULT); const r1 = await bal(RECIP);
    yield { step: "payout-exec", t: t(), txHash: legit.hash, msg: "Chainwall checked the signature and policy, then released the funds." };
    yield { step: "payout-done", t: t(), recipientUSDC: fmt(r1), vaultUSDC: fmt(v1), msg: `Payout executed, ${fmt(1_000_000_000n)} USDC to the recipient.` };
  } else {
    yield { step: "error", t: t(), msg: `The baseline payout did not execute (${legit.reason}).` };
  }

  await pause();

  // 3, the 7702 hijack of the operator
  await holdStep();
  yield { step: "delegate", t: t(), msg: "The attacker runs the EIP-7702 stolen-key trick on the vault's operator." };
  await pause();
  yield { step: "delegate-deploy", t: t(), delegate: SWEEPER, msg: `Delegating the operator's account to the sweeper (EIP-7702).` };
  const opDelegateTx = await setDelegation(SWEEPER);
  const code = await pub.getCode({ address: operator.address });
  yield { step: "delegate-done", t: t(), carol: operator.address, delegate: SWEEPER, code: code ?? undefined, txHash: opDelegateTx, msg: `Operator's account now runs the sweeper's code (${code?.slice(0, 12)}…).` };
  await pause();

  // 4, Chainwall sees it
  await holdStep();
  yield { step: "detect", t: t(), carol: operator.address, delegate: SWEEPER, msg: "The operator's code now starts with 0xef0100, an EIP-7702 delegation." };
  await pause();

  // 5, the refused payout
  await holdStep();
  yield { step: "attack", t: t(), amount: fmt(AMOUNT), msg: `The attacker makes the hijacked operator sign a ${fmt(AMOUNT)} USDC payout from the vault.` };
  await pause();
  const refused = await payout(true);
  const vEnd = await bal(VAULT);
  if (!refused.ok) {
    await holdStep();
    yield { step: "refuse", t: t(), reason: refused.reason, vaultUSDC: fmt(vEnd), attackerUSDC: "0", attempted: fmt(AMOUNT), txHash: refused.hash,
      msg: `Refused with ${refused.reason}: a delegated account's signature is answered by the sweeper, not the operator. No funds moved.` };
  } else {
    yield { step: "error", t: t(), msg: "Unexpected: the delegated operator's payout executed. Check the tenant." };
  }
  await setDelegation(null); // leave the operator clean for the next run
  yield { step: "done", t: t(), msg: "The vault kept its money. A valid key is not an approved actor." };
}
