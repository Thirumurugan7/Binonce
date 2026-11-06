"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, ArrowUpRight, Coins } from "lucide-react";
import { money } from "@/lib/format";
import { toast } from "@/components/toast";

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
    const tid = toast.loading({ title: `Minting ${money(Number(amount)).replace(".00", "")} tUSD`, body: "Topping up the test wallet. The relayer pays the gas." });
    try {
      const r = await fetch("/api/mint", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount }),
      }).then((x) => x.json());
      if (!r.ok) throw new Error(r.error || "Mint failed");
      setResult(r);
      setState("done");
      onMinted(Number(r.balance));
      toast.success({
        title: "Wallet topped up", body: `New balance ${money(Number(r.balance))} tUSD${r.arkivKey ? " · saved to Arkiv" : ""}.`,
        link: explorer ? { href: `${explorer}/tx/${r.tx}`, label: `tx ${r.tx.slice(0, 10)}…` } : undefined,
      }, tid);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
      toast.error({ title: "Top-up failed", body: e instanceof Error ? e.message : String(e) }, tid);
    }
  };

  const n = Number(amount);
  const valid = Number.isFinite(n) && n > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-bn-night/60 backdrop-blur-[2px]" onClick={() => state !== "minting" && onClose()} />
          <motion.div
            role="dialog" aria-modal="true" aria-label="Mint test USD"
            initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="relative w-full max-w-[420px] shadow-bn-3 bg-bn-card border border-bn-line rounded-panel overflow-hidden"
            
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-bn-line">
              <span className="h-8 w-8 grid place-items-center rounded-full bg-bn-paper-2 text-bn-ink-2"><Coins className="h-[18px] w-[18px]" /></span>
              <div>
                <div className="font-semibold text-[15px] leading-none">Top up the test wallet</div>
                <div className="text-bn-muted text-[11.5px] mt-1">Mints open-mint test tokens · relayer pays gas</div>
              </div>
              <button onClick={() => state !== "minting" && onClose()} className="ml-auto bn-focus h-9 w-9 grid place-items-center rounded-full text-bn-muted hover:text-bn-ink hover:bg-bn-ink/[0.06] transition-colors">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="p-5">
              {state === "done" && result ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 grid place-items-center rounded-full bg-bn-seal/10 text-bn-seal"><Check className="h-5 w-5" strokeWidth={2.5} /></span>
                    <div>
                      <div className="font-semibold text-[14px]">Minted {money(Number(result.amount))} tUSD</div>
                      <div className="text-bn-muted text-[12.5px]">New balance {money(Number(result.balance))} tUSD</div>
                    </div>
                  </div>
                  <div className="rounded-data border border-bn-line divide-y divide-bn-line text-[12.5px]">
                    <KV label="Transaction">
                      {explorer ? (
                        <a href={`${explorer}/tx/${result.tx}`} target="_blank" rel="noopener noreferrer" className="font-mono inline-flex items-center gap-1 hover:underline">
                          {result.tx.slice(0, 10)}… <ArrowUpRight className="h-3.5 w-3.5 text-bn-muted" />
                        </a>
                      ) : <span className="font-mono">{result.tx.slice(0, 10)}…</span>}
                    </KV>
                    <KV label="Recorded on Arkiv">
                      {result.arkivKey ? <span className="font-mono text-bn-ink">{result.arkivKey.slice(0, 10)}…</span>
                        : <span className="text-bn-muted">{arkiv ? "—" : "not configured"}</span>}
                    </KV>
                  </div>
                  <button onClick={onClose} className="bn-focus rounded-full border border-bn-ink/25 hover:border-bn-ink text-bn-ink font-medium text-[14px] h-11 transition-colors">Done</button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-[12px] text-bn-muted font-medium">Amount (tUSD)</label>
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      inputMode="decimal"
                      disabled={state === "minting"}
                      className="mt-1.5 w-full tnum font-mono text-[18px] bg-bn-paper border border-bn-line rounded-data px-3.5 py-3 outline-none focus:border-bn-ink text-bn-ink transition-colors disabled:opacity-60"
                    />
                    <div className="flex gap-2 mt-2.5">
                      {PRESETS.map((p) => (
                        <button key={p} onClick={() => setAmount(p)} disabled={state === "minting"}
                          className={`text-[12px] font-medium bn-focus rounded-full px-3 py-1.5 border transition-colors ${amount === p ? "border-bn-ink text-bn-ink" : "border-bn-line text-bn-muted hover:text-bn-ink"}`}>
                          {money(Number(p)).replace(".00", "")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <div className="text-[12.5px] text-bn-ember-ink bg-bn-ember/[0.08] border border-bn-ember/30 rounded-data px-3 py-2.5">{error}</div>}
                  {!arkiv && <div className="text-[11.5px] text-bn-muted">Arkiv not configured — this mint runs on-chain but won&apos;t be recorded to the registry yet.</div>}

                  <button
                    onClick={submit} disabled={!valid || state === "minting"}
                    className="inline-flex items-center justify-center gap-2 bn-focus rounded-full bg-bn-ink text-bn-paper hover:bg-bn-ember-ink font-medium text-[14px] h-11 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
      <span className="text-bn-muted">{label}</span>
      <span className="text-bn-ink">{children}</span>
    </div>
  );
}
