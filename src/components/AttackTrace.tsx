"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PenLine, Radio, ShieldOff, Banknote, Check, Loader2, type LucideIcon } from "lucide-react";
import { shortAddr, clock } from "@/lib/format";

export type TraceStatus = "idle" | "active" | "done" | "fail";
export interface ConsoleLine { t: number; msg: string; kind?: "hot" | "ok" | "go"; tx?: string }
export interface Nonces { start: number; signedUpto: number; matchIndex: number | null; show: boolean }
export interface TraceState {
  steps: Record<"sign" | "delegate" | "verify" | "sweep", TraceStatus>;
  nonces: Nonces;
  lines: ConsoleLine[];
  attackerRecv: string | null;
}

const STEP_META: { key: keyof TraceState["steps"]; n: string; title: string; sub: string; icon: LucideIcon }[] = [
  { key: "sign", n: "01", title: "Sign 50 authorizations", sub: "Stolen victim key, 50 consecutive nonces.", icon: PenLine },
  { key: "delegate", n: "02", title: "Broadcast delegation", sub: "Relayer sends the type-4 transaction.", icon: Radio },
  { key: "verify", n: "03", title: "Wallet hijacked", sub: "Victim code becomes 0xef0100 + sweeper.", icon: ShieldOff },
  { key: "sweep", n: "04", title: "Drain to attacker", sub: "Sweeper empties the balance.", icon: Banknote },
];

export function AttackTrace({ open, onClose, state }: { open: boolean; onClose: () => void; state: TraceState }) {
  const { steps, nonces, lines, attackerRecv } = state;
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [lines]);

  return (
    <motion.aside
      initial={false}
      animate={{ x: open ? 0 : "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="fixed top-0 right-0 bottom-0 w-[440px] max-w-[92vw] z-[60] bg-night text-[#EAECEF] border-l border-night-line flex flex-col"
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#12161d] to-transparent pointer-events-none" />
      <div className="relative flex items-center gap-2.5 px-[18px] py-4 border-b border-night-line">
        <span className="h-2 w-2 rounded-full bg-down animate-beat" />
        <b className="text-sm tracking-tight">Attack trace</b>
        <span className="font-mono text-[11px] text-dim-2">EIP-7702</span>
        <button onClick={onClose} className="ml-auto h-7 w-7 grid place-items-center rounded-md text-dim hover:text-white hover:bg-white/5 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative overflow-auto scroll-dark px-[18px] py-4">
        <div className="flex flex-col gap-2">
          {STEP_META.map((s) => {
            const st = steps[s.key];
            const Icon = s.icon;
            return (
              <div key={s.key} className={`flex gap-3 px-3 py-3 border rounded-data transition-all duration-300 ${
                st === "idle" ? "opacity-45 border-night-line"
                  : st === "active" ? "opacity-100 border-yellow/40 bg-yellow/[0.06]"
                  : "opacity-100 border-night-line"}`}>
                <div className={`h-8 w-8 flex-none rounded-md grid place-items-center ${
                  st === "done" ? "bg-up/15 text-up" : st === "fail" ? "bg-down/15 text-down"
                    : st === "active" ? "bg-yellow/15 text-yellow" : "bg-white/5 text-dim-2"}`}>
                  {st === "done" ? <Check className="h-4 w-4" /> : st === "active" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[13px] flex items-center gap-2">
                    <span className="font-mono text-[10px] text-dim-2">{s.n}</span>{s.title}
                  </div>
                  <div className="text-dim text-[12px] mt-0.5 leading-snug">{s.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {nonces.show && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-5 overflow-hidden">
              <h5 className="m-0 mb-2.5 text-[11px] text-dim font-medium uppercase tracking-wide">50 authorizations — one nonce matches</h5>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 50 }, (_, i) => {
                  const match = nonces.matchIndex === i;
                  const signed = i < nonces.signedUpto;
                  return (
                    <motion.div key={i} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.004, 0.2) }}
                      className={`aspect-square rounded-chip border grid place-items-center font-mono text-[9px] transition-colors ${
                        match ? "bg-down border-down text-white font-semibold shadow-[0_0_0_2px_rgba(246,70,93,0.35)]"
                          : signed ? "border-[#2d4a7a] text-[#7aa2e3] bg-night-2" : "bg-night-2 border-night-line text-dim-2"}`}>
                      {nonces.start + i}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {attackerRecv && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-4 py-3 border border-down/30 bg-down/[0.06] rounded-data flex justify-between items-center">
              <span className="text-dim text-[12px]">Attacker received</span>
              <span className="font-mono text-[#ff6b78] font-semibold">+{attackerRecv} tUSD</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={consoleRef} className="mt-4 bg-night-3 border border-night-line rounded-data font-mono text-[11.5px] max-h-[240px] overflow-auto scroll-dark">
          {lines.length === 0 ? (
            <div className="px-3 py-2.5 text-dim-2">Waiting for a run…</div>
          ) : (
            lines.map((l, i) => (
              <div key={i} className="px-3 py-1.5 border-b border-white/[0.03] last:border-0 flex gap-2.5 leading-normal">
                <span className="text-dim-2 whitespace-nowrap">{clock(l.t)}</span>
                <span className={l.kind === "hot" ? "text-[#ff6b78]" : l.kind === "ok" ? "text-[#36d399]" : l.kind === "go" ? "text-yellow" : "text-dim"}>
                  {l.msg}{l.tx ? <span className="text-[#7aa2e3]"> {shortAddr(l.tx)}</span> : null}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.aside>
  );
}
