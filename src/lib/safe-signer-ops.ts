// Server ops for the WALLET-SIGNED Sepolia Safe route (the SafeSigner UI). Where safe-defense.ts runs
// the whole Safe flow with keystore signatures, this collects the REAL signatures from two browser
// wallets and only proposes + relays server-side (no signing authority on the server).
//
// Proven seam (verified on-chain): `chainwall operations execute --via safe` accepts externally-produced
// `eoa` signatures. So the server runs propose + the CLI `sign` steps ONLY to emit the exact EIP-712
// typed data + file structures, hands that typed data to the wallets, then swaps the wallet signatures
// into the files and executes. The 2 distinct signers are the actor (also a Safe owner) + one co-signer.
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chainConfig, SEPOLIA_ID, type SafeRouteConfig } from "./chains";

interface Sh { code: number; stdout: string; stderr: string }
interface TypedData { domain: Record<string, unknown>; types: Record<string, { name: string; type: string }[]>; primaryType: string; message: Record<string, unknown> }

function resolveBins() {
  const h = process.env.HOME || os.homedir();
  const CHAINWALL = process.env.CHAINWALL_BIN || path.join(h, ".local/bin/chainwall");
  const CAST = process.env.CAST_BIN || path.join(h, ".foundry/bin/cast");
  const PW = process.env.CHAINWALL_PW_FILE || path.join(h, ".config/chainwall-wc.pw");
  const PATHX = `${path.dirname(CHAINWALL)}:${path.dirname(CAST)}:${process.env.PATH || ""}`;
  return { CHAINWALL, CAST, PW, PATHX };
}
function sh(bin: string, args: string[], env: NodeJS.ProcessEnv): Promise<Sh> {
  return new Promise((resolve) => {
    execFile(bin, args, { env, maxBuffer: 16 * 1024 * 1024, timeout: 150_000 }, (err, stdout, stderr) => {
      const code = err ? (typeof (err as unknown as { code: number }).code === "number" ? (err as unknown as { code: number }).code : 1) : 0;
      resolve({ code, stdout: stdout?.toString() ?? "", stderr: stderr?.toString() ?? "" });
    });
  });
}
const firstHash = (s: string) => (s.match(/0x[0-9a-fA-F]{64}/) || [])[0];

const SAFE_RPC = () => process.env.SAFE_DEFENSE_RPC || "https://sepolia.gateway.tenderly.co";
function ctx() {
  const cfg = chainConfig(SEPOLIA_ID);
  const S = cfg.safe!;
  const { CHAINWALL, CAST, PW, PATHX } = resolveBins();
  const env = { ...process.env, PATH: PATHX };
  const rpc = SAFE_RPC();
  const cast = (args: string[]) => sh(CAST, [...args, "--rpc-url", rpc], env);
  const cw = (args: string[]) => sh(CHAINWALL, [...args, "--profile", S.profile, "--password-file", PW], env);
  return { cfg, S, env, rpc, cast, cw };
}

// Sessions live between prepare (emits typed data) and submit (injects wallet sigs + executes).
// Backed by globalThis so the Map is shared across API routes even when Next.js dev recompiles a route
// into a fresh module instance (a plain module-level Map is NOT reliably shared across routes in dev).
interface Session { dir: string; createdAt: number; actorDelegated: boolean }
const g = globalThis as unknown as { __safeSignerSessions?: Map<string, Session> };
const sessions = (g.__safeSignerSessions ??= new Map<string, Session>());
const SESSION_TTL = 15 * 60_000;
function sweepSessions() {
  const now = Date.now();
  for (const [id, s] of sessions) if (now - s.createdAt > SESSION_TTL) { fs.rm(s.dir, { recursive: true, force: true }).catch(() => {}); sessions.delete(id); }
}

async function codeOf(a: string) { const { cast } = ctx(); return (await cast(["code", a])).stdout.trim(); }
export async function actorDelegated() { return (await codeOf(chainConfig(SEPOLIA_ID).safe!.actor)).toLowerCase().startsWith("0xef0100"); }

export async function safeState() {
  const { cfg, S, cast } = ctx();
  const [safeBal, actorCode] = await Promise.all([
    cast(["call", cfg.token, "balanceOf(address)(uint256)", S.address]).then((r) => r.stdout.trim().split(/\s+/)[0]),
    codeOf(S.actor),
  ]);
  const raw = (() => { try { return BigInt(safeBal); } catch { return 0n; } })();
  return {
    ok: true,
    safe: S.address,
    vaultUSDC: (Number(raw) / 10 ** cfg.usdcDecimals).toLocaleString("en-US"),
    amountUSDC: (Number(BigInt(S.amount)) / 10 ** cfg.usdcDecimals).toLocaleString("en-US"),
    delegated: actorCode.toLowerCase().startsWith("0xef0100"),
    actorCode,
    sweeper: cfg.sweeper,
    signers: signerInfo(S),
  };
}

function signerInfo(S: SafeRouteConfig) {
  // Two distinct signing wallets: the actor (signs actor auth + its owner SafeTx) and the co-signer owner.
  return { actor: S.actor, coSigner: S.coSignerAddress };
}

// Toggle the actor's 7702 delegation via the keystore account (server has the demo key).
async function setDelegation(target: string | null): Promise<string | undefined> {
  const { S, cast } = ctx();
  const auth = target ?? "0x0000000000000000000000000000000000000000";
  const r = await cast(["send", S.actor, "--auth", auth, "--account", S.actorAccount, "--password-file", resolveBins().PW, "--gas-limit", "100000"]);
  const want = target !== null;
  for (let i = 0; i < 24; i++) { if ((await actorDelegated()) === want) break; await new Promise((res) => setTimeout(res, 1500)); }
  return firstHash(r.stdout);
}
export async function hijackActor() { const cfg = chainConfig(SEPOLIA_ID); const hash = await setDelegation(cfg.sweeper); return { ok: true, hash, code: await codeOf(cfg.safe!.actor) }; }
export async function resetActor() { const hash = await setDelegation(null); return { ok: true, hash }; }

/**
 * Propose the operation and emit the exact typed data the two wallets must sign. The keystore `sign`
 * runs here only to produce the canonical typedData + file templates (their signatures are discarded;
 * the wallets' signatures replace them at submit). Co-signer owner = S.coSignerAccount; actor = S.actorAccount
 * (also the second owner). Owner sig array order ascending by address is handled at submit.
 */
export async function prepareSafeOp() {
  sweepSessions();
  const { S, cw } = ctx();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "safesign-"));
  const f = (n: string) => path.join(dir, `${n}.json`);
  try {
    const deadline = String(Math.floor(Date.now() / 1000) + 3600);
    await fs.writeFile(f("op"), JSON.stringify({ safe: S.address, interactionId: S.interactionId, policyId: S.policyId, deadline, args: [S.recipientArg, S.amount], nativeValue: "0" }));
    const p = await cw(["operations", "propose", f("op"), "--out", f("prop"), "--account", S.proposerAccount]);
    if (p.code !== 0) throw new Error(`propose failed: ${(p.stderr || p.stdout).trim().slice(0, 200)}`);
    // Emit typed data: actor auth + owner SafeTx (co-signer owner, then actor-as-owner). Both owners sign
    // the SAME SafeTx, so either file's typedData works for the UI.
    const sa = await cw(["operations", "sign-actor", f("prop"), "--via", "safe", "--out", f("actor"), "--account", S.actorAccount]);
    if (sa.code !== 0) throw new Error(`sign-actor failed: ${(sa.stderr || sa.stdout).trim().slice(0, 200)}`);
    const so1 = await cw(["operations", "sign", f("prop"), "--via", "safe", "--actor-signature-file", f("actor"), "--out", f("ownerA"), "--account", S.coSignerAccount]);
    const so2 = await cw(["operations", "sign", f("prop"), "--via", "safe", "--actor-signature-file", f("actor"), "--out", f("ownerB"), "--account", S.actorAccount]);
    if (so1.code !== 0 || so2.code !== 0) throw new Error(`owner sign failed: ${((so1.stderr || so1.stdout) + (so2.stderr || so2.stdout)).trim().slice(0, 200)}`);
    const actorFile = JSON.parse(await fs.readFile(f("actor"), "utf8"));
    const ownerAFile = JSON.parse(await fs.readFile(f("ownerA"), "utf8"));
    const sessionId = randomBytes(12).toString("hex");
    sessions.set(sessionId, { dir, createdAt: Date.now(), actorDelegated: await actorDelegated() });
    return {
      ok: true,
      sessionId,
      deadline,
      actorTypedData: actorFile.typedData as TypedData,
      safeTxTypedData: ownerAFile.typedData as TypedData,
      signers: signerInfo(S),
    };
  } catch (e) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    throw e;
  }
}

/**
 * Inject the three wallet signatures into the emitted files and execute via the relayer. actorSig over
 * the ExecutionActor typed data; coSignerSig + actorOwnerSig over the SafeTx (owner approvals). Judges
 * by exit code AND Safe-USDC delta. A 7702-delegated actor -> execute reverts -> refused, funds held.
 */
export async function submitSafeOp(input: { sessionId: string; actorSig: string; coSignerSig: string; actorOwnerSig: string }) {
  const s = sessions.get(input.sessionId);
  if (!s) return { ok: false, reason: "session expired, prepare again" };
  const { cfg, S, cw, cast } = ctx();
  const dir = s.dir;
  const f = (n: string) => path.join(dir, `${n}.json`);
  try {
    const setSig = async (name: string, sig: string, out: string) => {
      const obj = JSON.parse(await fs.readFile(f(name), "utf8"));
      obj.signature = sig;
      await fs.writeFile(f(out), JSON.stringify(obj));
    };
    await setSig("actor", input.actorSig, "actor-vi");
    await setSig("ownerA", input.coSignerSig, "ownerA-vi"); // co-signer owner (wc-owner 0x3ae7…)
    await setSig("ownerB", input.actorOwnerSig, "ownerB-vi"); // actor-as-owner (approver-3 0x8C46…)
    // Safe owner sig array MUST be ascending by signer address: co-signer 0x3ae7 < actor 0x8C46.
    const a = JSON.parse(await fs.readFile(f("ownerA-vi"), "utf8"));
    const b = JSON.parse(await fs.readFile(f("ownerB-vi"), "utf8"));
    const ascending = BigInt(S.coSignerAddress) < BigInt(S.actor) ? [a, b] : [b, a];
    await fs.writeFile(f("sigs-vi"), JSON.stringify(ascending));
    const before = BigInt((await cast(["call", cfg.token, "balanceOf(address)(uint256)", S.address])).stdout.trim().split(/\s+/)[0] || "0");
    const e = await cw(["operations", "execute", f("prop"), "--via", "safe", "--actor-signature-file", f("actor-vi"), "--signatures-file", f("sigs-vi"), "--out", f("exec-vi"), "--account", S.relayerAccount]);
    const after = BigInt((await cast(["call", cfg.token, "balanceOf(address)(uint256)", S.address])).stdout.trim().split(/\s+/)[0] || "0");
    const executed = e.code === 0 && after < before;
    const hash = firstHash(`${e.stdout}\n${e.stderr}`);
    if (executed) return { ok: true, hash };
    // Not executed: the delegated-actor refusal (or any revert). Funds held.
    const delegated = await actorDelegated();
    return { ok: false, reason: delegated ? "ActorDelegated" : "reverted", hash };
  } finally {
    sessions.delete(input.sessionId);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
