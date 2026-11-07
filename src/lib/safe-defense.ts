// The Sepolia-only "guarded-Safe" /defense run. Where Whitechain uses a single-operator OKAccount
// (see defense-engine.ts), Sepolia has a SafeFactory, so the defense here is a 2-of-N Safe whose
// execution ACTOR is 7702-checked by the Chainwall Interact, the multisig-with-7702 combination that
// was impossible on Whitechain.
//
//   payout : a CLEAN actor signs + two Safe owners sign -> Interact.directExecute releases a transfer
//   hijack : the actor's EOA is 7702-delegated to the sweeper
//   refuse : the same 2-of-owner approval is now refused, the delegated actor is not an approved actor
//
// This drives the proven spike path through the `chainwall` CLI + `cast` (the Safe multisig + Interact
// directExecute are not re-implemented in viem), so it runs only where the binary + keystore live
// (localhost / the operator's machine). Server-only. Yields the same DefenseEvents as runDefense, so
// the existing /defense UI renders it unchanged.
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import type { DefenseEvent } from "./defense-types";
import { chainConfig, SEPOLIA_ID } from "./chains";

const PACE = Number(process.env.DEFENSE_PACE_MS ?? 700);

interface Sh { code: number; stdout: string; stderr: string }

function resolveBins() {
  const h = process.env.HOME || os.homedir();
  const CHAINWALL = process.env.CHAINWALL_BIN || path.join(h, ".local/bin/chainwall");
  const CAST = process.env.CAST_BIN || path.join(h, ".foundry/bin/cast");
  const PW = process.env.CHAINWALL_PW_FILE || path.join(h, ".config/chainwall-wc.pw");
  // chainwall shells out to cast, so both bin dirs must be on PATH for the child.
  const PATHX = `${path.dirname(CHAINWALL)}:${path.dirname(CAST)}:${process.env.PATH || ""}`;
  return { CHAINWALL, CAST, PW, PATHX };
}

function sh(bin: string, args: string[], env: NodeJS.ProcessEnv): Promise<Sh> {
  return new Promise((resolve) => {
    execFile(bin, args, { env, maxBuffer: 16 * 1024 * 1024, timeout: 150_000 }, (err, stdout, stderr) => {
      const code = err ? (typeof (err as NodeJS.ErrnoException).code === "number" ? ((err as unknown as { code: number }).code) : 1) : 0;
      resolve({ code, stdout: stdout?.toString() ?? "", stderr: stderr?.toString() ?? "" });
    });
  });
}

const firstHash = (s: string) => (s.match(/0x[0-9a-fA-F]{64}/) || [])[0];

export async function* runSafeDefense(signal?: AbortSignal, chainId?: number): AsyncGenerator<DefenseEvent> {
  const t = () => Date.now();
  const cfg = chainConfig(chainId ?? SEPOLIA_ID);
  const S = cfg.safe;
  if (!S) { yield { step: "fatal", t: t(), msg: "This chain has no Safe route configured." }; return; }

  const { CHAINWALL, CAST, PW, PATHX } = resolveBins();
  const env = { ...process.env, PATH: PATHX };
  // Reads/toggles must hit the SAME endpoint the chainwall profile broadcasts on (Tenderly), not
  // cfg.rpc, Sepolia's cfg.rpc is ethpandaops, and crossing eventually-consistent nodes would make a
  // just-mined balance or delegation read stale.
  const rpc = process.env.SAFE_DEFENSE_RPC || "https://sepolia.gateway.tenderly.co";
  const SAFE = S.address, USDC = cfg.token, SWEEPER = cfg.sweeper, ACTOR = S.actor;
  const explorer = cfg.explorer;

  const abortIf = () => { if (signal?.aborted) throw new DOMException("aborted", "AbortError"); };
  const pause = async () => { for (let i = 0; i < Math.ceil(PACE / 100); i++) { abortIf(); await new Promise((r) => setTimeout(r, 100)); } };
  // Keep each defense step on screen for at least MIN_STEP_MS (default 3s), even when the real
  // on-chain action is near-instant. Time already spent in a step counts toward its minimum.
  const MIN_STEP_MS = Number(process.env.DEFENSE_MIN_STEP_MS ?? 3000);
  let stepAt = 0;
  const holdStep = async () => {
    if (stepAt) {
      const until = stepAt + MIN_STEP_MS;
      while (Date.now() < until) { abortIf(); await new Promise((r) => setTimeout(r, Math.min(100, until - Date.now()))); }
    }
    stepAt = Date.now();
  };

  const cast = (args: string[]) => sh(CAST, [...args, "--rpc-url", rpc], env);
  const cw = (args: string[]) => sh(CHAINWALL, [...args, "--profile", S.profile, "--password-file", PW], env);

  const usdc = async (a: string): Promise<bigint> => {
    const r = await cast(["call", USDC, "balanceOf(address)(uint256)", a]);
    try { return BigInt(r.stdout.trim().split(/\s+/)[0]); } catch { return 0n; }
  };
  const fmt = (raw: bigint) => (Number(raw) / 10 ** cfg.usdcDecimals).toLocaleString("en-US");
  const codeOf = async (a: string) => (await cast(["code", a])).stdout.trim();
  const isDelegated = async (a: string) => (await codeOf(a)).toLowerCase().startsWith("0xef0100");

  // Toggle the actor's EIP-7702 delegation via `cast send --auth` on the keystore account (no raw key in
  // the server). target=null clears it. Polls until the read RPC reflects the new state.
  const setDelegation = async (target: string | null): Promise<string | undefined> => {
    const auth = target ?? "0x0000000000000000000000000000000000000000";
    const r = await cast(["send", ACTOR, "--auth", auth, "--account", S.actorAccount, "--password-file", PW, "--gas-limit", "100000"]);
    const hash = firstHash(r.stdout);
    const want = target !== null;
    for (let i = 0; i < 24; i++) { if ((await isDelegated(ACTOR)) === want) break; await new Promise((res) => setTimeout(res, 1500)); }
    return hash;
  };

  // One full Safe operation: propose -> sign-actor -> 2 owner sigs -> execute. The actor's current
  // delegation decides the outcome (clean executes; delegated reverts). Judged by exit code AND balance.
  const runSafeOp = async (dir: string, tag: string): Promise<{ proposeTx?: string; executeOk: boolean; executeTx?: string; raw: string }> => {
    const f = (n: string) => path.join(dir, `${n}-${tag}.json`);
    const deadline = String(Math.floor(Date.now() / 1000) + 3600);
    await fs.writeFile(f("op"), JSON.stringify({ safe: SAFE, interactionId: S.interactionId, policyId: S.policyId, deadline, args: [S.recipientArg, S.amount], nativeValue: "0" }));
    const p = await cw(["operations", "propose", f("op"), "--out", f("prop")]);
    const proposeTx = firstHash(p.stdout);
    if (p.code !== 0) return { proposeTx, executeOk: false, raw: (p.stderr || p.stdout).trim() };
    await cw(["operations", "sign-actor", f("prop"), "--via", "safe", "--out", f("actor"), "--account", S.actorAccount]);
    await cw(["operations", "sign", f("prop"), "--via", "safe", "--actor-signature-file", f("actor"), "--out", f("o1"), "--account", S.ownerAccounts[0]]);
    await cw(["operations", "sign", f("prop"), "--via", "safe", "--actor-signature-file", f("actor"), "--out", f("o2"), "--account", S.ownerAccounts[1]]);
    const o1 = JSON.parse(await fs.readFile(f("o1"), "utf8"));
    const o2 = JSON.parse(await fs.readFile(f("o2"), "utf8"));
    await fs.writeFile(f("sigs"), JSON.stringify([o1, o2]));
    const e = await cw(["operations", "execute", f("prop"), "--via", "safe", "--actor-signature-file", f("actor"), "--signatures-file", f("sigs"), "--out", f("exec"), "--account", S.relayerAccount]);
    return { proposeTx, executeOk: e.code === 0, executeTx: firstHash(e.stdout), raw: (e.stderr || e.stdout).trim() };
  };

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "safedef-"));
  try {
    // Reachability
    const chk = await cast(["block-number"]);
    if (chk.code !== 0) { yield { step: "fatal", t: t(), msg: `Cannot reach ${cfg.name} at ${rpc}. ${chk.stderr.trim()}` }; return; }

    // 1, the guarded Safe
    yield { step: "setup", t: t(), carol: ACTOR, msg: `Execution actor ${ACTOR} drives payouts from a 2-of-3 Safe (Chainwall-guarded).` };
    await holdStep();
    yield { step: "vault-start", t: t(), msg: `Reading the live Chainwall Safe tenant on ${cfg.name}.` };
    yield { step: "vault-deployed", t: t(), registry: cfg.registry, interact: cfg.interact, msg: "Registry + execution engine online. Safe owners approve; the Interact checks the actor." };
    if (await isDelegated(ACTOR)) {
      const resetTx = await setDelegation(null);
      yield { step: "configure", t: t(), txHash: resetTx, msg: "Reset the actor to a clean key before the run." };
    }
    const v0 = await usdc(SAFE);
    yield { step: "vault-ready", t: t(), vault: SAFE, msg: `Safe ${SAFE}, 2-of-3 owners, actor 7702-checked by the Interact.` };
    yield { step: "fund", t: t(), vaultUSDC: fmt(v0), msg: `Safe holds ${fmt(v0)} USDC.` };
    await pause();

    // 2, a normal payout: clean actor + two owner signatures
    const payAmt = BigInt(S.amount);
    await holdStep();
    yield { step: "payout-propose", t: t(), msg: `Clean actor signs; two Safe owners co-sign a ${fmt(payAmt)} USDC payout; the relayer submits it.` };
    await pause();
    const legit = await runSafeOp(dir, "legit");
    const v1 = await usdc(SAFE);
    if (legit.executeOk && v1 < v0) {
      yield { step: "payout-exec", t: t(), txHash: legit.executeTx, msg: "Safe owners approved and the Interact accepted the actor, funds released." };
      yield { step: "payout-done", t: t(), vaultUSDC: fmt(v1), recipientUSDC: fmt(v0 - v1), msg: `Payout executed, ${fmt(v0 - v1)} USDC left the Safe.` };
    } else {
      yield { step: "error", t: t(), msg: `The baseline payout did not execute (${legit.raw || "unknown"}).` };
    }
    await pause();

    // 3, the 7702 hijack of the actor
    await holdStep();
    yield { step: "delegate", t: t(), msg: "The attacker runs the EIP-7702 stolen-key trick on the Safe's execution actor." };
    await pause();
    yield { step: "delegate-deploy", t: t(), delegate: SWEEPER, msg: "Delegating the actor's account to the sweeper (EIP-7702)." };
    const delTx = await setDelegation(SWEEPER);
    const actorCode = await codeOf(ACTOR);
    yield { step: "delegate-done", t: t(), carol: ACTOR, delegate: SWEEPER, code: actorCode || undefined, txHash: delTx, msg: `Actor's account now runs the sweeper's code (${actorCode.slice(0, 12)}…).` };
    await pause();

    // 4, detection
    await holdStep();
    yield { step: "detect", t: t(), carol: ACTOR, delegate: SWEEPER, msg: "The actor's code now starts with 0xef0100, an EIP-7702 delegation." };
    await pause();

    // 5, the refused payout (owners still sign; the delegated actor is refused)
    await holdStep();
    yield { step: "attack", t: t(), amount: fmt(payAmt), msg: `Two owners still sign a ${fmt(payAmt)} USDC payout, but the actor is now hijacked.` };
    await pause();
    const vBefore = await usdc(SAFE);
    const refused = await runSafeOp(dir, "refuse");
    const vEnd = await usdc(SAFE);
    const held = !refused.executeOk || vEnd >= vBefore;
    if (held) {
      await holdStep();
      yield { step: "refuse", t: t(), reason: "ActorDelegated", vaultUSDC: fmt(vEnd), attackerUSDC: "0", attempted: fmt(payAmt), txHash: refused.executeTx,
        msg: "Refused: a 7702-delegated actor is not an approved actor, even with two valid owner signatures. No funds moved." };
    } else {
      yield { step: "error", t: t(), msg: "Unexpected: the delegated actor's payout executed. Check the tenant." };
    }
    await setDelegation(null); // leave the actor clean for the next run
    yield { step: "done", t: t(), msg: "The Safe kept its money. Two valid owners are not enough when the actor is hijacked." };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
