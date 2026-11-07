"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, ShieldCheck, Ban, Check, Loader2, ArrowUpRight, Skull, RotateCcw } from "lucide-react";
import { useOperatorWallet } from "@/app/defense/wallet-context";
import { shortAddr } from "@/lib/format";

const OPERATOR_ADDRESS = "0x3ae7F2767111D8700F82122A373792B99d605749";
const EXPLORER = "https://explorer.testnet.whitechain.io";
const uintFields = ["maxSteps", "nativeValue", "deadline", "chainId", "nonce"];

interface State { vaultUSDC: string; recipientUSDC: string; delegated: boolean; operatorCode: string; sweeper: string }
interface Result { ok: boolean; hash?: string; reason?: string }

/**
 * Hands-on, /demo-style vault signing for the Chainwall side: the connected operator wallet signs a
 * real payout. Clean signer -> executes. After a 7702 hijack, the SAME wallet still produces a
 * signature, but Chainwall refuses it on-chain — showing a 7702-delegated signer can't sign.
 */
export function DefenseSigner() {
  const wallet = useOperatorWallet();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<null | "sign" | "hijack" | "restore">(null);
  const [result, setResult] = useState<Result | null>(null);

  const isOperator = wallet?.address?.toLowerCase() === OPERATOR_ADDRESS.toLowerCase();
  const ready = !!wallet?.connected && isOperator && !wallet.wrongChain;

  const refresh = useCallback(async () => {
    try { const s = await fetch("/api/defense/state").then((r) => r.json()); if (s.ok) setState(s); } catch {}
  }, []);
  useEffect(() => { if (ready) refresh(); }, [ready, refresh]);

  const signPayout = useCallback(async () => {
    if (!wallet || !state) return;
    setBusy("sign"); setResult(null);
    try {
      const prep = await fetch("/api/defense/prepare", { method: "POST" }).then((r) => r.json());
      if (!prep.ok) throw new Error(prep.error || "prepare failed");
      const td = prep.typedData;
      const message: Record<string, unknown> = { ...td.message };
      for (const k of uintFields) message[k] = BigInt(message[k] as string);
      const signature = await wallet.signTypedData({ ...td, message }); // the wallet still signs even when delegated
      const res = await fetch("/api/defense/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline: prep.deadline, signature, expectRefusal: state.delegated }),
      }).then((r) => r.json());
      setResult({ ok: !!res.ok, hash: res.hash, reason: res.reason });
      await refresh();
    } catch (e) {
      setResult({ ok: false, reason: e instanceof Error ? (e.message.includes("rejected") || e.message.includes("denied") ? "You rejected the signature" : "Signing failed") : "Signing failed" });
    } finally { setBusy(null); }
  }, [wallet, state, refresh]);

  const toggle = useCallback(async (to: "hijack" | "restore") => {
    setBusy(to); setResult(null);
    try { await fetch(`/api/defense/${to === "hijack" ? "hijack" : "reset"}`, { method: "POST" }); await refresh(); }
    finally { setBusy(null); }
  }, [refresh]);

  return (
    <section className="rounded-panel border border-bn-line bg-bn-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-1">
        <Wallet className="h-4 w-4 text-bn-ink-2" />
        <h2 className="font-serif font-normal text-[clamp(1.3rem,2vw,1.6rem)] text-bn-ink m-0">Sign it yourself</h2>
        <div className="ml-auto">
          {!wallet || !wallet.connected ? (
            <span className="text-[12.5px] text-bn-muted">Connect your wallet from the top bar</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-[12.5px] text-bn-muted">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${wallet.wrongChain ? "bg-bn-amber-glow" : isOperator ? "bg-bn-seal" : "bg-bn-amber-glow"}`} />
              {shortAddr(wallet.address)}
            </span>
          )}
        </div>
      </div>
      <p className="text-[14px] leading-relaxed text-bn-ink-2 mt-2 mb-5 max-w-[46rem]">
        Connect the operator wallet and sign a real payout from the Chainwall vault. Then hijack your own account
        with EIP-7702 and sign again — your wallet still produces a signature, but Chainwall refuses it.
      </p>

      {!ready ? (
        <div className="rounded-data border border-bn-line bg-bn-paper-2/40 px-4 py-4 text-[13.5px] text-bn-ink-2">
          {!wallet || !wallet.connected ? "Connect the operator wallet to sign." :
            !isOperator ? <>Connect the <b className="text-bn-ink">operator wallet</b> <span className="font-mono">{shortAddr(OPERATOR_ADDRESS)}</span> — Chainwall only accepts its signature.</> :
            "Switch to Whitechain testnet 1874 to sign."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1fr_minmax(0,320px)] items-start">
          <div className="flex flex-col gap-3">
            <button onClick={signPayout} disabled={busy !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-bn-ink text-bn-paper h-11 px-5 text-[14px] font-semibold disabled:opacity-50">
              {busy === "sign" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Sign &amp; send a 1,000 USDC payout
            </button>

            {result && (
              result.ok ? (
                <div className="rounded-data border border-bn-seal/40 bg-bn-seal-glow/[0.06] px-4 py-3 text-[13.5px]">
                  <div className="flex items-center gap-2 text-bn-seal font-medium"><Check className="h-4 w-4" /> Executed — 1,000 USDC moved from the vault</div>
                  {result.hash && <a href={`${EXPLORER}/tx/${result.hash}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[12px] text-bn-muted hover:text-bn-ink">{shortAddr(result.hash)} <ArrowUpRight className="h-3 w-3" /></a>}
                </div>
              ) : (
                <div className="rounded-data border border-bn-ember-glow/40 bg-bn-ember/[0.07] px-4 py-3 text-[13.5px]">
                  <div className="flex items-center gap-2 text-bn-ember-ink font-medium"><Ban className="h-4 w-4" /> Refused — {result.reason || "InvalidActorSignature"}</div>
                  <div className="mt-1 text-[12.5px] text-bn-ink-2">{state?.delegated ? "Your account is 7702-delegated, so your signature is answered by the sweeper, not you. Chainwall won’t move funds." : "No funds moved."}</div>
                  {result.hash && <a href={`${EXPLORER}/tx/${result.hash}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[12px] text-bn-muted hover:text-bn-ink">{shortAddr(result.hash)} <ArrowUpRight className="h-3 w-3" /></a>}
                </div>
              )
            )}
          </div>

          <div className={`rounded-data border p-4 ${state?.delegated ? "border-bn-ember-glow/40 bg-bn-ember/[0.06]" : "border-bn-line bg-bn-paper-2/40"}`}>
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-bn-ink-2">Your operator account</span>
              {state?.delegated
                ? <span className="inline-flex items-center gap-1 text-[12px] text-bn-ember-ink font-medium"><Skull className="h-3.5 w-3.5" /> hijacked</span>
                : <span className="text-[12px] text-bn-seal">clean key</span>}
            </div>
            <div className="font-mono text-[12px] text-bn-ink mt-1 break-all">
              {state?.delegated
                ? <><span className="text-bn-ember-glow font-semibold">0xef0100</span>{(state.operatorCode || "").replace(/^0xef0100/i, "")}</>
                : <span className="text-bn-muted">0x — a normal account</span>}
            </div>
            <div className="mt-3 pt-3 border-t border-bn-line flex items-baseline justify-between text-[13px]">
              <span className="text-bn-ink-2">Vault</span><span className="font-mono tabular-nums text-bn-ink">{state?.vaultUSDC ?? "…"} USDC</span>
            </div>
            <div className="mt-3">
              {!state?.delegated ? (
                <button onClick={() => toggle("hijack")} disabled={busy !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-bn-ember-glow/50 text-bn-ember-ink h-9 text-[13px] font-medium hover:bg-bn-ember/[0.08] disabled:opacity-50">
                  {busy === "hijack" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Skull className="h-4 w-4" />} Hijack my account (EIP-7702)
                </button>
              ) : (
                <button onClick={() => toggle("restore")} disabled={busy !== null}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-bn-line text-bn-ink-2 h-9 text-[13px] font-medium hover:text-bn-ink disabled:opacity-50">
                  {busy === "restore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Restore clean key
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
