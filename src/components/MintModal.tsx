"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, ArrowUpRight, Coins } from "lucide-react";
import { money } from "@/lib/format";

interface MintResult { tx: string; block: number; amount: string; balance: string; arkivKey?: string | null }

const PRESETS = ["100000", "1000000", "2500000"];

export function MintModal({
  open, onClose, onMinted, explorer, arkiv,
}: {
  open: boolean;
  onClose: () => void;
  onMinted: (balance: number) => void;
  explorer: string | null;
  arkiv: boolean;
}) {
  const [amount, setAmount] = useState("2500000");
  const [state, setState] = useState<"idle" | "minting" | "done" | "error">("idle");
  const [result, setResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setState("idle"); setResult(null); setError(null); setAmount("2500000"); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && state !== "minting") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, state]);

  const submit = async () => {
    if (state === "minting") return;
    setState("minting"); setError(null);
    try {
      const r = await fetch("/api/mint", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount }),
      }).then((x) => x.json());
      if (!r.ok) throw new Error(r.error || "Mint failed");
      setResult(r);
      setState("done");
      onMinted(Number(r.balance));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  };

  const n = Number(amount);
  const valid = Number.isFinite(n) && n > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/45" onClick={() => state !== "minting" && onClose()} />
          <motion.div
            role="dialog" aria-modal="true" aria-label="Mint test USD"
            initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="relative w-full max-w-[420px] bg-surface border border-line rounded-card overflow-hidden"
            style={{ boxShadow: "0 24px 60px -12px rgba(0,0,0,0.35)" }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
              <span className="h-8 w-8 grid place-items-center rounded-md bg-surface-fill text-ink-3"><Coins className="h-[18px] w-[18px]" /></span>
              <div>
                <div className="font-semibold text-[15px] leading-none">Deposit test USD</div>
                <div className="text-ink-4 text-[11.5px] mt-1">Mints tUSD to the demo wallet · relayer pays gas</div>
              </div>
              <button onClick={() => state !== "minting" && onClose()} className="ml-auto h-8 w-8 grid place-items-center rounded-md text-ink-4 hover:text-ink hover:bg-surface-fill transition-colors">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="p-5">
              {state === "done" && result ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 grid place-items-center rounded-full bg-up/15 text-up"><Check className="h-5 w-5" strokeWidth={2.5} /></span>
                    <div>
                      <div className="font-semibold text-[14px]">Minted {money(Number(result.amount))} tUSD</div>
                      <div className="text-ink-3 text-[12.5px]">New balance {money(Number(result.balance))} tUSD</div>
                    </div>
                  </div>
                  <div className="rounded-data border border-line divide-y divide-line text-[12.5px]">
                    <KV label="Transaction">
                      {explorer ? (
                        <a href={`${explorer}/tx/${result.tx}`} target="_blank" rel="noopener noreferrer" className="font-mono inline-flex items-center gap-1 hover:underline">
                          {result.tx.slice(0, 10)}… <ArrowUpRight className="h-3.5 w-3.5 text-ink-4" />
                        </a>
                      ) : <span className="font-mono">{result.tx.slice(0, 10)}…</span>}
                    </KV>
                    <KV label="Recorded on Arkiv">
                      {result.arkivKey ? <span className="font-mono text-ink">{result.arkivKey.slice(0, 10)}…</span>
                        : <span className="text-ink-4">{arkiv ? "—" : "not configured"}</span>}
                    </KV>
                  </div>
                  <button onClick={onClose} className="rounded-btn bg-surface-fill hover:bg-line text-ink font-semibold text-[13px] py-2.5 transition-colors">Done</button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[12px] text-ink-3 font-medium">Amount (tUSD)</label>
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      inputMode="decimal"
                      disabled={state === "minting"}
                      className="mt-1.5 w-full tnum font-mono text-[18px] bg-surface-fill border border-line rounded-data px-3.5 py-3 outline-none focus:border-ink-4 transition-colors disabled:opacity-60"
                    />
                    <div className="flex gap-2 mt-2.5">
                      {PRESETS.map((p) => (
                        <button key={p} onClick={() => setAmount(p)} disabled={state === "minting"}
                          className={`text-[12px] font-medium rounded-chip px-2.5 py-1.5 border transition-colors ${amount === p ? "border-ink text-ink" : "border-line text-ink-3 hover:text-ink"}`}>
                          {money(Number(p)).replace(".00", "")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <div className="text-[12.5px] text-down bg-down/10 border border-down/30 rounded-data px-3 py-2.5">{error}</div>}
                  {!arkiv && <div className="text-[11.5px] text-ink-4">Arkiv not configured — this mint runs on-chain but won&apos;t be recorded to the registry yet.</div>}

                  <button
                    onClick={submit} disabled={!valid || state === "minting"}
                    className="inline-flex items-center justify-center gap-2 rounded-btn bg-yellow text-[#1E2026] hover:bg-yellow-hi font-semibold text-[13px] py-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {state === "minting" ? <><Loader2 className="h-4 w-4 animate-spin" /> Minting…</> : <>Mint {valid ? money(n).replace(".00", "") : ""} tUSD</>}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-ink-3">{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}
