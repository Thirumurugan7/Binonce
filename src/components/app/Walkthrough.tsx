"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Mark } from "@/components/brand";
import type { TraceStatus } from "./chain-bits";

export interface Step<K extends string> {
  key: K;
  title: string;      // short, for the tracker
  now: string;        // one plain sentence: what is happening
  why: string;        // why it matters / how it works, in plain words
}

/**
 * Step tracker + narrator. During a run it follows the live step; any step can be opened at any time to read it.
 * `finale` replaces the narration once the run is over.
 */
export function Walkthrough<K extends string>({ steps, statuses, evidence, finale, tone = "ember" }: {
  steps: Step<K>[]; statuses: Record<K, TraceStatus>;
  evidence: (key: K, status: TraceStatus) => ReactNode;
  finale?: ReactNode; tone?: "ember" | "seal";
}) {
  const reduce = useReducedMotion();
  const order = steps.map((s) => statuses[s.key]);
  const activeIdx = order.findIndex((s) => s === "active");
  const lastReached = order.reduce((acc, s, i) => (s !== "idle" ? i : acc), -1);
  const following = activeIdx >= 0 ? activeIdx : Math.max(0, lastReached);
  const [view, setView] = useState(0);
  useEffect(() => { if (lastReached >= 0) setView(following); }, [following, lastReached]);
  const step = steps[view];
  const st = statuses[step.key];
  const showFinale = finale && view === steps.length - 1 && st === "done";
  const accent = tone === "seal" ? "bg-bn-seal" : "bg-bn-ember";

  return (
    <div className="rounded-panel border border-bn-line bg-bn-card overflow-hidden">
      {/* tracker */}
      <ol className="m-0 p-0 list-none grid border-b border-bn-line" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => {
          const ss = statuses[s.key];
          const on = i === view;
          return (
            <li key={s.key} className="border-r border-bn-line last:border-r-0">
              <button onClick={() => setView(i)} aria-current={on ? "step" : undefined}
                className={`bn-focus relative w-full h-full text-left px-3 sm:px-4 pt-3.5 pb-3 transition-colors ${on ? "bg-bn-paper-2/70" : "hover:bg-bn-paper-2/40"}`}>
                <span className="flex items-center gap-2">
                  <span className={`h-6 w-6 flex-none rounded-full grid place-items-center text-[12px] font-medium transition-colors ${
                    ss === "done" ? `${accent} text-white` : ss === "fail" ? "bg-bn-ember text-white" : ss === "active" ? "border-2 border-bn-ink text-bn-ink" : "border border-bn-line text-bn-muted"}`}>
                    {ss === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : ss === "fail" ? <X className="h-3.5 w-3.5" /> : ss === "active" ? <Mark size={12} animate="loop" /> : i + 1}
                  </span>
                  <span className={`hidden sm:block text-[13.5px] leading-tight ${on ? "text-bn-ink font-medium" : "text-bn-ink-2"}`}>{s.title}</span>
                </span>
                {on && <motion.span layoutId={`wt-${steps[0].key}`} className={`absolute left-0 right-0 bottom-0 h-[2px] ${accent}`} />}
              </button>
            </li>
          );
        })}
      </ol>

      {/* narrator */}
      <div className="p-5 sm:p-7">
        <AnimatePresence mode="wait">
          <motion.div key={`${view}-${showFinale ? "f" : ""}`} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="text-[13px] text-bn-muted">
              Step {view + 1} of {steps.length}
              <span className="mx-2">·</span>
              <span className={st === "active" ? "text-bn-amber" : st === "done" ? "text-bn-seal" : st === "fail" ? "text-bn-ember-ink" : ""}>
                {st === "active" ? "happening now" : st === "done" ? "done" : st === "fail" ? "failed" : "preview"}
              </span>
            </div>
            {showFinale ? finale : (
              <>
                <h2 className="font-serif font-normal text-[clamp(1.6rem,2.6vw,2.1rem)] leading-tight text-bn-ink mt-2 mb-0">{step.now}</h2>
                <p className="text-[15.5px] leading-relaxed text-bn-ink-2 mt-3 mb-0 max-w-[44rem]">{step.why}</p>
              </>
            )}
            <div className="mt-5 rounded-data bg-bn-night text-bn-fog p-4 sm:p-5">{evidence(step.key, st)}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
