"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { money } from "@/lib/format";

/**
 * Looping illustration of one replay run. The sequence, counts and log lines mirror
 * src/lib/attack.ts; no addresses or hashes are shown because none are real here.
 * The live run at /attack streams the real ones.
 */

const START = 2_500_000;
const N = 50;
type Phase = 0 | 1 | 2 | 3 | 4 | 5;

const STAGES = ["Sign", "Broadcast", "Hijack", "Drain"] as const;
const LOG: Record<Phase, string> = {
  0: "Victim balance before attack: 2,500,000 tUSD",
  1: "Signing 50 authorizations at nonces n … n+49",
  2: "Relayer broadcasting one type-4 tx carrying all 50",
  3: "Victim account is now DELEGATED (0xef0100 marker present)",
  4: "Calling the sweeper through the hijacked account…",
  5: "Drained 2,500,000 tUSD to the attacker",
};
// How long each phase holds before advancing (ms).
const HOLD: Record<Phase, number> = { 0: 1100, 1: 1700, 2: 1300, 3: 1700, 4: 1700, 5: 3400 };

export function HeroReplay() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px" });

  const [phase, setPhase] = useState<Phase>(0);
  const [signed, setSigned] = useState(0);
  const [bal, setBal] = useState(START);
  const [paused, setPaused] = useState(false);

  // Jump straight to a stage (0 = Sign … 3 = Drain) and hold there.
  const jump = (i: number) => {
    const p = (i + 1) as Phase;
    setPaused(true);
    setPhase(p);
    setSigned(p >= 2 ? N : 0);
    setBal(p >= 5 ? 0 : START);
  };

  // Reduced motion: show the end state, no loop.
  useEffect(() => {
    if (reduce) { setPhase(5); setSigned(N); setBal(0); }
  }, [reduce]);

  // Phase clock: only runs while the panel is on screen.
  useEffect(() => {
    if (reduce || !inView || paused) return;
    const id = setTimeout(() => {
      setPhase((p) => {
        const next = ((p + 1) % 6) as Phase;
        if (next === 0) { setSigned(0); setBal(START); }
        return next;
      });
    }, HOLD[phase]);
    return () => clearTimeout(id);
  }, [phase, inView, reduce, paused]);

  // Signing: fill the grid over the phase.
  useEffect(() => {
    if (reduce || phase !== 1) return;
    let i = 0;
    const id = setInterval(() => { i += 1; setSigned(i); if (i >= N) clearInterval(id); }, (HOLD[1] - 250) / N);
    return () => clearInterval(id);
  }, [phase, reduce]);

  // Drain: ease the balance to zero.
  useEffect(() => {
    if (reduce || phase !== 4) return;
    let raf = 0;
    const t0 = performance.now();
    const dur = 1300;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setBal(START * (1 - (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduce]);

  const matched = phase >= 3;
  const delegated = phase >= 3;
  const drained = phase >= 5;
  const stageIdx = phase === 0 ? -1 : Math.min(phase, 4) - 1;

  return (
    <div
      ref={ref}
      className="relative rounded-panel bg-bn-night text-bn-fog shadow-bn-3 overflow-hidden border border-bn-night-line"
      role="group"
      aria-label="Illustration of the replay: 50 authorizations are signed, one transaction is broadcast, the wallet's code becomes 0xef0100 plus the sweeper address, and the 2,500,000 tUSD balance is drained to zero."
    >
      <div className="absolute inset-0 bn-grid-night opacity-60 pointer-events-none" aria-hidden />

      {/* header */}
      <div className="relative flex items-center gap-3 px-5 sm:px-6 h-12 border-b border-bn-night-line">
        <span className={`h-1.5 w-1.5 rounded-full ${drained ? "bg-bn-ember-glow" : "bg-bn-ember-glow animate-beat"}`} aria-hidden />
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-bn-fog">Replay</span>
        <span className="font-mono text-[11px] text-bn-fog-2 hidden sm:inline">anvil · prague · type-4</span>
        <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.12em] text-bn-fog-2">Illustration</span>
        {!reduce && (
          <button onClick={() => setPaused((v) => !v)} aria-label={paused ? "Play the illustration" : "Pause the illustration"}
            className="bn-focus -mr-2 h-8 w-8 grid place-items-center rounded-full text-bn-fog-2 hover:text-bn-fog hover:bg-bn-fog/[0.08]">
            {paused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
          </button>
        )}
      </div>

      <div className="relative p-5 sm:p-6 flex flex-col gap-5">
        {/* balance */}
        <div className="flex items-end justify-between gap-4" aria-hidden>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-bn-fog-2">Victim hot wallet</div>
            <div className={`font-mono tnum text-[clamp(1.6rem,3.4vw,2.25rem)] leading-none mt-2 transition-colors duration-slow ${phase >= 4 ? "text-bn-ember-glow" : "text-bn-fog"}`}>
              {money(bal)}
              <span className="text-bn-fog-2 text-[0.5em] ml-2">tUSD</span>
            </div>
          </div>
          <AnimatePresence>
            {drained && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="font-mono text-[11px] text-bn-ember-glow text-right leading-snug"
              >
                −100.00%<br /><span className="text-bn-fog-2">to attacker</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* nonce grid */}
        <div aria-hidden>
          <div className="flex items-center justify-between font-mono text-[11px] text-bn-fog-2 mb-2">
            <span>authorizations · <span className="text-bn-fog tnum">{signed}</span>/50 signed</span>
            <span>nonce n … n+49</span>
          </div>
          <div className="grid grid-cols-10 gap-[5px]">
            {Array.from({ length: N }, (_, i) => {
              const isSigned = i < signed;
              const isMatch = i === 0 && matched;
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-[3px] border transition-[background-color,border-color,opacity] duration-base ${
                    isMatch
                      ? "bg-bn-ember border-bn-ember-glow"
                      : isSigned
                        ? matched ? "bg-bn-fog/[0.06] border-bn-night-line opacity-50" : "bg-bn-fog/[0.14] border-bn-fog/25"
                        : "border-bn-night-line"
                  }`}
                />
              );
            })}
          </div>
          <div className="h-5 mt-2 font-mono text-[11px]">
            <AnimatePresence>
              {matched && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-bn-ember-glow">
                  ↳ nonce n is the account&apos;s current nonce, so it lands. 49 spares.
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* account code */}
        <div className="rounded-data border border-bn-night-line bg-bn-night-2/80 px-4 py-3" aria-hidden>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-bn-fog-2 mb-1.5">eth_getCode(victim)</div>
          <div className="font-mono text-[13px] min-h-[20px]">
            <AnimatePresence mode="wait">
              {delegated ? (
                <motion.span key="d" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <span className="text-bn-ember-glow">0xef0100</span>
                  <span className="text-bn-fog-2"> ‖ </span>
                  <span className="text-bn-fog">sweeper address</span>
                  <span className="text-bn-fog-2"> · 23 bytes</span>
                </motion.span>
              ) : (
                <motion.span key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <span className="text-bn-fog">0x</span>
                  <span className="text-bn-fog-2"> · empty, a plain EOA</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* stage rail */}
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Jump to a stage">
          {STAGES.map((s, i) => (
            <button key={s} onClick={() => jump(i)} aria-pressed={i === stageIdx}
              className="bn-focus text-left rounded px-1 -mx-1 py-1 hover:bg-bn-fog/[0.05] transition-colors">
              <div className="h-[3px] rounded-full bg-bn-night-line overflow-hidden">
                <div
                  className={`h-full bg-bn-ember-glow transition-[width] ease-bn-out ${i <= stageIdx ? "w-full duration-slow" : "w-0 duration-0"}`}
                />
              </div>
              <div className={`mt-2 font-mono text-[10.5px] uppercase tracking-[0.1em] ${i === stageIdx ? "text-bn-fog" : i < stageIdx ? "text-bn-fog-2" : "text-bn-fog-2/60"}`}>
                <span className="hidden sm:inline">0{i + 1} </span>{s}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* log line */}
      <div className="relative border-t border-bn-night-line px-5 sm:px-6 h-11 flex items-center font-mono text-[11.5px] gap-3" aria-live="off">
        <span className="text-bn-fog-2">$</span>
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={`truncate ${phase >= 3 ? "text-bn-ember-glow" : "text-bn-fog"}`}
          >
            {LOG[phase]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
