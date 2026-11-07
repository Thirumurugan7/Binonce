"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, ShieldCheck, Ban, Check, Loader2, ArrowUpRight, Skull, RotateCcw, PenLine } from "lucide-react";
import { useOperatorWallet } from "@/app/defense/wallet-context";
import { shortAddr } from "@/lib/format";

const SEPOLIA_ID = 11155111;
const EXPLORER = "https://sepolia.etherscan.io";

interface TypedData { domain: Record<string, unknown>; types: Record<string, { name: string; type: string }[]>; primaryType: string; message: Record<string, unknown> }
interface Prep { sessionId: string; actorTypedData: TypedData; safeTxTypedData: TypedData; signers: { actor: string; coSigner: string } }
interface Collected { actorSig?: string; actorOwnerSig?: string; coSignerSig?: string }
interface Pending extends Prep { sigs: Collected }
interface State { vaultUSDC: string; amountUSDC: string; delegated: boolean; actorCode: string; sweeper: string; signers: { actor: string; coSigner: string }; pending?: Pending | null }
interface Result { ok: boolean; hash?: string; reason?: string }

// Convert uint/int message fields to BigInt for viem; leave addresses/bytes as-is. EIP712Domain is
// stripped (viem derives the domain separately), the proven signing shape.
function coerce(td: TypedData): TypedData {
  const fields = td.types[td.primaryType] || [];
  const message: Record<string, unknown> = { ...td.message };
  for (const f of fields) if (/^u?int\d*$/.test(f.type)) message[f.name] = BigInt(message[f.name] as string);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { EIP712Domain, ...types } = td.types;
  return { domain: td.domain, types, primaryType: td.primaryType, message };
}

/**
 * Wallet-signed, 2-signer Safe defense (Sepolia). Two distinct wallets sign in the browser: the ACTOR
 * (approver-3, also a Safe owner) signs its execution authorization + its owner approval; a CO-SIGNER
 * owner (wc-owner) signs its owner approval. The server only proposes + relays. Clean actor -> executes.
 * 7702-hijack the actor and sign again, the wallets still sign, but the Safe + Chainwall refuse it.
 */
export function SafeSigner() {
  const wallet = useOperatorWallet();
  const [state, setState] = useState<State | null>(null);
  const [prep, setPrep] = useState<Prep | null>(null);
  const [sigs, setSigs] = useState<Collected>({});
  const [busy, setBusy] = useState<null | "prepare" | "actor" | "cosigner" | "submit" | "hijack" | "restore">(null);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSepolia = !!wallet?.connected && wallet.chainId === SEPOLIA_ID;
  const connected = wallet?.address?.toLowerCase();
  const isActor = !!connected && !!state && connected === state.signers.actor.toLowerCase();
  const isCoSigner = !!connected && !!state && connected === state.signers.coSigner.toLowerCase();

  // Load live state AND restore any pending payout (survives a wallet account-switch / page reload).
  const refresh = useCallback(async () => {
    try {
      const s = await fetch("/api/defense/safe/state").then((r) => r.json());
      if (!s.ok) return;
      setState(s);
      if (s.pending) {
        setPrep({ sessionId: s.pending.sessionId, actorTypedData: s.pending.actorTypedData, safeTxTypedData: s.pending.safeTxTypedData, signers: s.pending.signers });
        setSigs(s.pending.sigs ?? {});
      }
    } catch {}
  }, []);
  // Re-run on connect, on network change, AND on account change — so switching wallets restores the flow.
  useEffect(() => { if (onSepolia) refresh(); }, [onSepolia, connected, refresh]);

  const prepare = useCallback(async () => {
    setBusy("prepare"); setErr(null); setResult(null); setSigs({});
    try {
      const p = await fetch("/api/defense/safe/prepare", { method: "POST" }).then((r) => r.json());
      if (!p.ok) throw new Error(p.error || "prepare failed");
      setPrep(p);
    } catch (e) { setErr(e instanceof Error ? e.message : "prepare failed"); setPrep(null); }
    finally { setBusy(null); }
  }, []);

  const signErr = (e: unknown) => (e instanceof Error && (e.message.includes("rejected") || e.message.includes("denied")) ? "You rejected the signature" : "Signing failed");

  // Actor wallet (approver-3): signs its execution authorization AND its owner approval (2 prompts).
  // Persist a collected signature server-side so it survives an account-switch / reload.
  const persist = (sessionId: string, sigs: Collected) =>
    fetch("/api/defense/safe/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, ...sigs }) }).catch(() => {});

  const signAsActor = useCallback(async () => {
    if (!wallet || !prep) return;
    setBusy("actor"); setErr(null);
    try {
      const actorSig = await wallet.signTypedData(coerce(prep.actorTypedData));
      const actorOwnerSig = await wallet.signTypedData(coerce(prep.safeTxTypedData));
      await persist(prep.sessionId, { actorSig, actorOwnerSig });
      setSigs((s) => ({ ...s, actorSig, actorOwnerSig }));
    } catch (e) { setErr(signErr(e)); }
    finally { setBusy(null); }
  }, [wallet, prep]);

  // Co-signer owner (wc-owner): signs its owner approval (1 prompt).
  const signAsCoSigner = useCallback(async () => {
    if (!wallet || !prep) return;
    setBusy("cosigner"); setErr(null);
    try {
      const coSignerSig = await wallet.signTypedData(coerce(prep.safeTxTypedData));
      await persist(prep.sessionId, { coSignerSig });
      setSigs((s) => ({ ...s, coSignerSig }));
    } catch (e) { setErr(signErr(e)); }
    finally { setBusy(null); }
  }, [wallet, prep]);

  const ready = !!sigs.actorSig && !!sigs.actorOwnerSig && !!sigs.coSignerSig;
  const submit = useCallback(async () => {
    if (!prep || !ready) return;
    setBusy("submit"); setErr(null);
    try {
      const res = await fetch("/api/defense/safe/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: prep.sessionId, actorSig: sigs.actorSig, actorOwnerSig: sigs.actorOwnerSig, coSignerSig: sigs.coSignerSig }),
      }).then((r) => r.json());
      setResult({ ok: !!res.ok, hash: res.hash, reason: res.reason });
      setPrep(null); setSigs({});
      await refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "submit failed"); }
    finally { setBusy(null); }
  }, [prep, ready, sigs, refresh]);

  const toggle = useCallback(async (to: "hijack" | "restore") => {
    // Keep any pending payout + collected signatures: the demo is "two valid approvals, still refused".
    setBusy(to); setErr(null); setResult(null);
    try { await fetch(`/api/defense/safe/${to === "hijack" ? "hijack" : "reset"}`, { method: "POST" }); await refresh(); }
    finally { setBusy(null); }
  }, [refresh]);

  const SignerRow = ({ label, who, addr, done, isConnectedSigner, onSign, busyKey, hint }: {
    label: string; who: string; addr: string; done: boolean; isConnectedSigner: boolean;
    onSign: () => void; busyKey: "actor" | "cosigner"; hint: string;
  }) => (
    <div className={`rounded-data border px-4 py-3 ${done ? "border-bn-seal/40 bg-bn-seal-glow/[0.05]" : "border-bn-line bg-bn-paper-2/40"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13.5px] text-bn-ink font-medium">{label}</div>
          <div className="text-[12px] text-bn-ink-2">{who} · <span className="font-mono">{shortAddr(addr)}</span></div>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-[12.5px] text-bn-seal font-medium shrink-0"><Check className="h-4 w-4" /> signed</span>
        ) : isConnectedSigner ? (
          <button onClick={onSign} disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-full bg-bn-ink text-bn-paper h-8 px-3 text-[12.5px] font-semibold disabled:opacity-50 shrink-0">
            {busy === busyKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />} Sign
          </button>
        ) : (
          <span className="text-[11.5px] text-bn-muted text-right shrink-0">{hint}</span>
        )}
      </div>
    </div>
  );

  return (
    <section className="rounded-panel border border-bn-line bg-bn-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-1">
        <Wallet className="h-4 w-4 text-bn-ink-2" />
        <h2 className="font-serif font-normal text-[clamp(1.3rem,2vw,1.6rem)] text-bn-ink m-0">Sign it yourself, 2-of-3 Safe</h2>
        <div className="ml-auto">
          {!wallet || !wallet.connected ? (
            <span className="text-[12.5px] text-bn-muted">Connect your wallet from the top bar</span>
          ) : !onSepolia ? (
            <span className="text-[12.5px] text-bn-amber">Switch to Sepolia in the top bar</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-[12.5px] text-bn-muted">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${isActor || isCoSigner ? "bg-bn-seal" : "bg-bn-amber-glow"}`} />
              {shortAddr(wallet.address)} {isActor ? "· actor" : isCoSigner ? "· co-signer" : "· not a signer"}
            </span>
          )}
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-bn-ink-2 mt-2 mb-5 max-w-[48rem]">
        Two owners approve a real payout from the Safe in their own wallets, the actor (who is also an owner)
        signs its execution authorization + its approval, a co-signer owner signs the second approval, and a
        relayer submits. Then 7702-hijack the actor and sign again: both owners still sign, but the vault refuses.
      </p>

      {!onSepolia ? (
        <div className="rounded-data border border-bn-line bg-bn-paper-2/40 px-4 py-4 text-[13.5px] text-bn-ink-2">
          {!wallet || !wallet.connected ? "Connect a signer wallet on Sepolia to begin." : "Switch your wallet to Sepolia (11155111), this Safe lives there."}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,320px)] items-start">
          <div className="flex flex-col gap-3">
            {/* Step 1: prepare */}
            <div className="flex items-center gap-3">
              <button onClick={prepare} disabled={busy !== null}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-bn-line text-bn-ink h-10 px-4 text-[13.5px] font-medium hover:bg-bn-paper-2 disabled:opacity-50">
                {busy === "prepare" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {prep ? "Re-prepare payout" : `Prepare a ${state?.amountUSDC ?? ""} USDC payout`}
              </button>
              {prep && <span className="text-[12px] text-bn-muted">proposed · collect 2 approvals</span>}
            </div>

            {/* Step 2: the two signers */}
            {prep && state && (
              <div className="flex flex-col gap-2.5">
                <SignerRow
                  label="Approval 1, operator (actor)" who="signs auth + approval" addr={state.signers.actor}
                  done={!!sigs.actorSig && !!sigs.actorOwnerSig} isConnectedSigner={isActor}
                  onSign={signAsActor} busyKey="actor" hint={`connect ${shortAddr(state.signers.actor)}`}
                />
                <SignerRow
                  label="Approval 2, co-signer owner" who="signs approval" addr={state.signers.coSigner}
                  done={!!sigs.coSignerSig} isConnectedSigner={isCoSigner}
                  onSign={signAsCoSigner} busyKey="cosigner" hint={`connect ${shortAddr(state.signers.coSigner)}`}
                />
              </div>
            )}

            {/* Step 3: submit */}
            {prep && (
              <button onClick={submit} disabled={!ready || busy !== null}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-bn-ink text-bn-paper h-11 px-5 text-[14px] font-semibold disabled:opacity-40">
                {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Submit the payout {ready ? "" : "(need both approvals)"}
              </button>
            )}

            {err && <div className="rounded-data border border-bn-amber/40 bg-bn-amber/[0.07] px-4 py-2.5 text-[13px] text-bn-ink-2">{err}</div>}

            {result && (
              result.ok ? (
                <div className="rounded-data border border-bn-seal/40 bg-bn-seal-glow/[0.06] px-4 py-3 text-[13.5px]">
                  <div className="flex items-center gap-2 text-bn-seal font-medium"><Check className="h-4 w-4" /> Executed, {state?.amountUSDC ?? ""} USDC moved from the Safe</div>
                  {result.hash && <a href={`${EXPLORER}/tx/${result.hash}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[12px] text-bn-muted hover:text-bn-ink">{shortAddr(result.hash)} <ArrowUpRight className="h-3 w-3" /></a>}
                </div>
              ) : (
                <div className="rounded-data border border-bn-ember-glow/40 bg-bn-ember/[0.07] px-4 py-3 text-[13.5px]">
                  <div className="flex items-center gap-2 text-bn-ember-ink font-medium"><Ban className="h-4 w-4" /> Refused, {result.reason || "ActorDelegated"}</div>
                  <div className="mt-1 text-[12.5px] text-bn-ink-2">{state?.delegated ? "The actor is 7702-delegated, so its execution authorization is answered by the sweeper, two valid owner approvals still can’t move funds." : "No funds moved."}</div>
                  {result.hash && <a href={`${EXPLORER}/tx/${result.hash}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[12px] text-bn-muted hover:text-bn-ink">{shortAddr(result.hash)} <ArrowUpRight className="h-3 w-3" /></a>}
                </div>
              )
            )}
          </div>

          {/* Side: the actor's account + the attack toggle */}
          <div className={`rounded-data border p-4 ${state?.delegated ? "border-bn-ember-glow/40 bg-bn-ember/[0.06]" : "border-bn-line bg-bn-paper-2/40"}`}>
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-bn-ink-2">Execution actor</span>
              {state?.delegated
                ? <span className="inline-flex items-center gap-1 text-[12px] text-bn-ember-ink font-medium"><Skull className="h-3.5 w-3.5" /> hijacked</span>
                : <span className="text-[12px] text-bn-seal">clean key</span>}
            </div>
            <div className="font-mono text-[12px] text-bn-ink mt-1 break-all">
              {state?.delegated
                ? <><span className="text-bn-ember-glow font-semibold">0xef0100</span>{(state.actorCode || "").replace(/^0xef0100/i, "")}</>
                : <span className="text-bn-muted">0x, a normal account</span>}
            </div>
            <div className="mt-3 pt-3 border-t border-bn-line flex items-baseline justify-between text-[13px]">
              <span className="text-bn-ink-2">Safe</span><span className="font-mono tabular-nums text-bn-ink">{state?.vaultUSDC ?? "…"} USDC</span>
            </div>
            <div className="mt-3">
              {!state?.delegated ? (
                <button onClick={() => toggle("hijack")} disabled={busy !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-bn-ember-glow/50 text-bn-ember-ink h-9 text-[13px] font-medium hover:bg-bn-ember/[0.08] disabled:opacity-50">
                  {busy === "hijack" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Skull className="h-4 w-4" />} Hijack the actor (EIP-7702)
                </button>
              ) : (
                <button onClick={() => toggle("restore")} disabled={busy !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-bn-line text-bn-ink-2 h-9 text-[13px] font-medium hover:text-bn-ink disabled:opacity-50">
                  {busy === "restore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Restore clean key
                </button>
              )}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-bn-muted">
              The actor is also one of the two approving owners. Hijacking it leaves both owner signatures valid —
              only its execution authorization fails.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
