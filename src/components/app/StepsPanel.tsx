"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X, ChevronDown } from "lucide-react";
import { Mark } from "@/components/brand";
import type { TraceStatus, Step } from "./chain-bits";

/**
 * The side of the story the portfolio can't show: what the attacker (or the defense) is doing.
 * Follows the live step during a run; any step can be opened to read it.
 */
export function StepsPanel<K extends string>({ title, sub, steps, statuses, evidence, tone = "ember", live, footer }: {
  title: string; sub: string; steps: Step<K>[]; statuses: Record<K, TraceStatus>;
  evidence: (key: K, status: TraceStatus) => ReactNode;
  tone?: "ember" | "seal"; live?: boolean; footer?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const order = steps.map((s) => statuses[s.key]);
  const activeIdx = order.findIndex((s) => s === "active");
  const lastReached = order.reduce((acc, s, i) => (s !== "idle" ? i : acc), -1);
  const following = activeIdx >= 0 ? activeIdx : Math.max(0, lastReached);
  const [open, setOpen] = useState<number | null>(0);
  useEffect(() => { if (lastReached >= 0) setOpen(following); }, [following, lastReached]);
  const done = tone === "seal" ? "bg-bn-seal-glow text-bn-night" : "bg-bn-ember-glow text-bn-night";

  return (
    <section aria-label={title} className="rounded-panel bg-bn-night text-bn-fog border border-bn-night-line shadow-bn-2 overflow-hidden">
      <div className="flex items-center gap-3 px-5 h-14 border-b border-bn-night-line">
        <span className={`h-2 w-2 rounded-full ${live ? (tone === "seal" ? "bg-bn-seal-glow" : "bg-bn-ember-glow") + " animate-beat" : "bg-bn-fog-2/60"}`} aria-hidden />
        <div className="min-w-0">
          <div className="text-[14.5px] text-bn-fog leading-tight">{title}</div>
          <div className="text-[12px] text-bn-fog-2 truncate">{sub}</div>
        </div>
      </div>

      <ol className="m-0 p-0 list-none">
        {steps.map((s, i) => {
          const st = statuses[s.key];
          const isOpen = open === i;
          return (
            <li key={s.key} className="border-b border-bn-night-line last:border-0">
              <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}
                className="bn-focus w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-bn-night-2/60 transition-colors">
                <span className={`mt-0.5 h-6 w-6 flex-none rounded-full grid place-items-center text-[12px] font-medium transition-colors ${
                  st === "done" ? done : st === "fail" ? "bg-bn-ember text-white" : st === "active" ? "border-2 border-bn-fog text-bn-fog" : "border border-bn-night-line text-bn-fog-2"}`}>
                  {st === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : st === "fail" ? <X className="h-3.5 w-3.5" /> : st === "active" ? <Mark size={12} animate="loop" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`text-[14.5px] ${st === "idle" ? "text-bn-fog-2" : "text-bn-fog"}`}>{s.title}</span>
                    {st === "active" && <span className="text-[11.5px] text-bn-amber-glow">now</span>}
                  </span>
                  <span className="block text-[13.5px] leading-snug text-bn-fog-2 mt-0.5">{s.now}</span>
                </span>
                <ChevronDown className={`h-4 w-4 mt-1 flex-none text-bn-fog-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                    <div className="px-5 pb-5 pl-14">
                      <p className="m-0 text-[13.5px] leading-relaxed text-bn-fog-2">{s.why}</p>
                      <div className="mt-3.5">{evidence(s.key, st)}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
      {footer && <div className="border-t border-bn-night-line px-5 py-4">{footer}</div>}
    </section>
  );
}
