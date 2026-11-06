"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Hero metrics. Incident figures come from docs/attack/binance-incident.md (public post-mortems);
 * the Blacklist count is read live from Arkiv.
 */
function CountUp({ to, decimals = 0, prefix = "", suffix = "", duration = 1.6 }: { to: number; decimals?: number; prefix?: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduce) { setV(to); return; }
    const c = animate(0, to, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setV });
    return () => c.stop();
  }, [seen, reduce, to, duration]);
  return <span ref={ref} className="tnum">{prefix}{v.toFixed(decimals)}{suffix}</span>;
}

export function MetricsBoard() {
  const [flagged, setFlagged] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/arkiv/activity").then((r) => r.json()).then((d) => { if (d.enabled) setFlagged(d.delegates?.length ?? 0); }).catch(() => {});
  }, []);

  return (
    <div className="relative rounded-panel bg-bn-night text-bn-fog border border-bn-night-line shadow-bn-3 overflow-hidden">
      <div className="absolute inset-0 bn-grid-night opacity-50 pointer-events-none" aria-hidden />

      <div className="relative flex items-center gap-3 px-5 sm:px-7 h-12 border-b border-bn-night-line text-[12.5px]">
        <span className="h-1.5 w-1.5 rounded-full bg-bn-ember-glow" aria-hidden />
        <span className="text-bn-fog">The largest case: Binance, 29 Oct 2026</span>
        <a href="#cases" className="bn-focus rounded ml-auto text-bn-fog-2 hover:text-bn-fog underline decoration-bn-night-line underline-offset-4">other cases</a>
      </div>

      {/* headline metric */}
      <div className="relative px-5 sm:px-7 pt-7 pb-6">
        <div className="font-serif text-[clamp(4rem,9vw,6.5rem)] leading-[0.9] tracking-[-0.03em] text-bn-ember-glow">
          <CountUp to={6.3} decimals={1} prefix="$" suffix="B" />
        </div>
        <p className="m-0 mt-3 text-[16px] leading-snug text-bn-fog max-w-[22rem]">
          left Binance hot wallets across about ten chains.
        </p>
      </div>

      <dl className="relative m-0 grid grid-cols-2 border-t border-bn-night-line">
        <Metric k={<CountUp to={20} prefix="~" suffix=" min" />} v="for most of it to leave" />
        <Metric k={<CountUp to={2.5} decimals={1} prefix="$" suffix="B" />} v="from one wallet, in a single transaction" left />
        <Metric k={<CountUp to={50} />} v={<>authorizations signed, <span className="text-bn-ember-glow">1 landed</span></>} top>
          <div className="mt-2.5 grid grid-cols-[repeat(25,minmax(0,1fr))] gap-[2px] max-w-[180px]" aria-hidden>
            {Array.from({ length: 50 }, (_, i) => <span key={i} className={`aspect-square rounded-[1px] ${i === 0 ? "bg-bn-ember-glow" : "bg-bn-fog/20"}`} />)}
          </div>
        </Metric>
        <Metric k="0" v="approvals asked of the owner" top left accent />
      </dl>

      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 px-5 sm:px-7 py-4 border-t border-bn-night-line bg-bn-night-2/70 text-[13px]">
        <span className="inline-flex items-center gap-1.5 text-bn-seal-glow"><span className="h-1.5 w-1.5 rounded-full bg-bn-seal-glow animate-beat" aria-hidden />live</span>
        <span className="text-bn-fog">
          <span className="font-mono tnum">{flagged ?? "…"}</span> delegate contracts in the public Blacklist on Arkiv
        </span>
      </div>
      <p className="relative m-0 px-5 sm:px-7 pb-4 pt-0 bg-bn-night-2/70 text-[11.5px] text-bn-fog-2">
        Sources: Blockaid, Fireblocks, TRM Labs, TechFlow. Figures vary slightly between them.
      </p>
    </div>
  );
}

function Metric({ k, v, top, left, accent, children }: { k: React.ReactNode; v: React.ReactNode; top?: boolean; left?: boolean; accent?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`px-5 sm:px-7 py-5 ${top ? "border-t border-bn-night-line" : ""} ${left ? "border-l border-bn-night-line" : ""}`}>
      <dt className={`font-serif text-[clamp(2rem,3.4vw,2.6rem)] leading-none ${accent ? "text-bn-ember-glow" : "text-bn-fog"}`}>{k}</dt>
      <dd className="m-0 mt-2 text-[13.5px] leading-snug text-bn-fog-2">{v}{children}</dd>
    </div>
  );
}
