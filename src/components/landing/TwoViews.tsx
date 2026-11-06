"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button, Eyebrow, Reveal } from "@/components/brand";
import { money } from "@/lib/format";

/**
 * The replay's core idea: the dashboard stays calm while the chain tells the truth.
 * Toast, alert and log text below is the exact copy the /attack page emits.
 */

interface Line { msg: string; hot?: boolean }
interface Stage {
  label: string; balance: number; alert: string | null; note: string; log: Line[];
  toasts: { kind: "warn" | "ok"; title: string; sub: string }[];
}

const STAGES: Stage[] = [
  {
    label: "Before",
    balance: 2_500_000,
    toasts: [],
    alert: null,
    note: "A funded hot wallet. Nothing to see.",
    log: [{ msg: "Victim balance before attack: 2,500,000 tUSD" }],
  },
  {
    label: "Signing",
    balance: 2_500_000,
    toasts: [],
    alert: null,
    note: "Nothing changes here. Signatures leave no trace until they are used.",
    log: [
      { msg: "Victim current nonce is n. Signing 50 authorizations at nonces n..n+49" },
      { msg: "All 50 authorizations signed. Exactly one (nonce n) matches and takes effect.", hot: true },
      { msg: "Relayer broadcasting type-4 transaction carrying all 50 authorizations..." },
    ],
  },
  {
    label: "Hijacked",
    balance: 2_500_000,
    toasts: [{ kind: "warn", title: "Security notice", sub: "A smart-contract delegation was added to your account." }],
    alert: "Unusual account activity detected. A delegation was added to this wallet.",
    note: "The balance is all still there, but the wallet now runs someone else’s code.",
    log: [
      { msg: "Delegation mined" },
      { msg: "Victim account is now DELEGATED to the sweeper (0xef0100 marker present)", hot: true },
    ],
  },
  {
    label: "Drained",
    balance: 0,
    toasts: [
      { kind: "warn", title: "Withdrawal submitted", sub: "tUSD 2,500,000.00 · processing" },
      { kind: "ok", title: "Withdrawal completed", sub: "tUSD 2,500,000.00 sent to an external address" },
    ],
    alert: "Unusual account activity detected. A delegation was added to this wallet.",
    note: "To the owner it looks like an ordinary withdrawal.",
    log: [
      { msg: "Calling sweeper to drain victim tUSD to attacker...", hot: true },
      { msg: "Sweep mined" },
      { msg: "Drained 2,500,000 tUSD to attacker", hot: true },
    ],
  },
];

export function TwoViews() {
  const [stage, setStage] = useState(0);
  const [auto, setAuto] = useState(true);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const seen = useInView(panel, { once: true, margin: "0px 0px -30% 0px" });
  const reduce = useReducedMotion();

  // Play the stages once when the panel first comes into view; any click or key stops it.
  useEffect(() => {
    if (!seen || !auto || reduce || stage >= STAGES.length - 1) return;
    const id = setTimeout(() => setStage((s) => s + 1), stage === 0 ? 1200 : 2200);
    return () => clearTimeout(id);
  }, [seen, auto, reduce, stage]);
  const pick = (i: number) => { setAuto(false); setStage(i); };
  const s = STAGES[stage];
  const log = STAGES.slice(0, stage + 1).flatMap((x) => x.log);

  // Arrow-key navigation for the tablist (WAI-ARIA tabs pattern).
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (stage + d + STAGES.length) % STAGES.length;
    pick(next);
    tabs.current[next]?.focus();
  };

  return (
    <section id="two-views" className="scroll-mt-16 bg-bn-paper-2/60 border-y border-bn-line">
      <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-10 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end">
          <div className="max-w-[44rem]">
            <Reveal><Eyebrow>Inside the replay</Eyebrow></Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-serif font-normal text-display-l text-bn-ink mt-6 mb-0 text-balance">
                What the owner sees, next to what the chain records.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-body-l text-bn-ink-2 mt-6 mb-0 max-w-prose">
                The replay page puts the two side by side. The wallet stays calm until the money is gone; the trace shows
                every signature, transaction and block as it happens.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <Button href="/attack" variant="secondary" icon={<ArrowRight className="h-4 w-4" />}>Open the live replay</Button>
          </Reveal>
        </div>

        {/* stage control */}
        <Reveal delay={0.05}>
          <div role="tablist" aria-label="Attack stage" onKeyDown={onKey}
            className="mt-12 grid grid-cols-4 sm:inline-flex gap-1 p-1 rounded-full border border-bn-line bg-bn-paper w-full sm:w-auto">
            {STAGES.map((x, i) => (
              <button
                key={x.label}
                ref={(el) => { tabs.current[i] = el; }}
                role="tab"
                id={`stage-tab-${i}`}
                aria-selected={stage === i}
                aria-controls="stage-panel"
                tabIndex={stage === i ? 0 : -1}
                onClick={() => pick(i)}
                className={`bn-focus relative h-10 px-2 sm:px-5 rounded-full text-[14px] transition-colors ${stage === i ? "text-bn-paper" : "text-bn-ink-2 hover:text-bn-ink"}`}
              >
                {stage === i && <motion.span layoutId="stage-pill" className="absolute inset-0 rounded-full bg-bn-ink" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                <span className="relative font-mono text-[11px] mr-1.5 opacity-60 hidden sm:inline">0{i + 1}</span>
                <span className="relative">{x.label}</span>
              </button>
            ))}
          </div>
        </Reveal>

        <div ref={panel} id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${stage}`} className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-0 rounded-panel overflow-hidden lg:border lg:border-bn-line lg:shadow-bn-2">
          {/* What the user sees */}
          <div className="bg-bn-card text-bn-ink p-5 sm:p-7 rounded-panel lg:rounded-none border border-bn-line lg:border-0 lg:min-h-[400px] flex flex-col">
            <div className="font-mono text-eyebrow uppercase text-bn-muted">What the owner sees</div>
            <div className="mt-6 text-[13px] text-bn-muted">Balance</div>
            <div className={`mt-2 font-sans font-semibold tnum text-[clamp(1.75rem,3.5vw,2.25rem)] leading-none transition-colors duration-slow ${s.balance === 0 ? "text-bn-ember" : ""}`}>
              {money(s.balance)} <span className="text-[14px] font-medium text-bn-muted">tUSD</span>
            </div>

            <AnimatePresence>
              {s.alert && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-4 flex items-center gap-2.5 px-3.5 py-3 rounded-lg bg-bn-ember/[0.08] border border-bn-ember/25 text-bn-ember-ink text-[13px] font-medium">
                    <ShieldAlert className="h-4 w-4 flex-none" /> {s.alert}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5 flex flex-col gap-2.5">
              <AnimatePresence initial={false}>
                {s.toasts.map((t) => (
                  <motion.div key={t.title} layout initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="flex gap-3 items-start border border-bn-line rounded-data px-4 py-3 bg-bn-card shadow-bn-1">
                    <span className={`h-6 w-6 flex-none rounded-full grid place-items-center ${t.kind === "ok" ? "bg-bn-seal/10 text-bn-seal" : "bg-bn-ember/10 text-bn-ember-ink"}`}>
                      {t.kind === "ok" ? <CheckCircle2 className="h-[15px] w-[15px]" /> : <ShieldAlert className="h-[15px] w-[15px]" />}
                    </span>
                    <div>
                      <div className="font-semibold text-[13px] leading-tight">{t.title}</div>
                      <div className="text-bn-muted text-[12.5px] mt-0.5">{t.sub}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <p className="mt-auto pt-6 mb-0 font-serif italic text-[19px] leading-snug text-bn-ink-2">{s.note}</p>
          </div>

          {/* What the chain records */}
          <div className="relative bg-bn-night text-bn-fog p-5 sm:p-7 rounded-panel lg:rounded-none min-h-[260px] lg:min-h-[400px] flex flex-col">
            <div className="absolute inset-0 bn-grid-night opacity-40 pointer-events-none" aria-hidden />
            <div className="relative font-mono text-eyebrow uppercase text-bn-fog-2">What the chain records</div>
            <ol className="relative mt-6 m-0 p-0 list-none font-mono text-[12.5px] leading-relaxed flex flex-col gap-2.5" aria-live="polite">
              <AnimatePresence initial={false}>
                {log.map((l, i) => (
                  <motion.li key={l.msg} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * (i % 3) }}
                    className="flex gap-3">
                    <span className="text-bn-fog-2/70 tnum select-none">{String(i + 1).padStart(2, "0")}</span>
                    <span className={l.hot ? "text-bn-ember-glow" : "text-bn-fog"}>{l.msg}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
            <p className="relative mt-auto pt-6 mb-0 font-mono text-[11.5px] text-bn-fog-2">
              In the live replay each line links to its transaction and block.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
