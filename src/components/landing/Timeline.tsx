"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useMotionValueEvent, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow, Reveal } from "@/components/brand";

// From docs/attack/binance-incident.md (public post-mortems; figures vary slightly by source).
const BINANCE_14 = "0x28C6c06298d514Db089934071355E5743bf21d60";
const EVENTS = [
  { at: "~20:20 UTC", big: "1 tx", title: "Fifty authorizations in one transaction",
    body: <>The attacker broadcasts a single type-4 transaction carrying 50 EIP-7702 authorizations, all signed with the key of
      Binance 14, one of the exchange’s largest Ethereum hot wallets, for nonces <span className="font-mono">18,914,775</span> to <span className="font-mono">18,914,824</span>.</> },
  { at: "same block", big: "23 bytes", title: "The hot wallet becomes a sweeper",
    body: <>The authorization matching the wallet’s current nonce lands. Its code is now <span className="font-mono">0xef0100</span> plus the
      sweeper’s address. From here on, the wallet runs the attacker’s contract.</> },
  { at: "~3 min later", big: "$2.5B", title: "One call drains Binance 14",
    body: <>The attacker calls the sweeper through the hijacked wallet. About $2.5B leaves in a single transaction.</> },
  { at: "~20 min in", big: "$6.3B", title: "It spreads to other chains",
    body: <>The same pattern hits Binance wallets on Optimism, Arbitrum, Avalanche and more. Roughly $6.3B leaves across about ten
      chains. Binance’s preliminary cause: a compromised DevOps laptop.</> },
];

/**
 * Scroll-driven: the section pins while you scroll through it, and each quarter of the scroll
 * selects the next moment. Clicking a moment (or arrow keys) scrolls to it.
 */
export function Timeline() {
  const [on, setOn] = useState(0);
  const outer = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => setOn(Math.min(EVENTS.length - 1, Math.max(0, Math.floor(p * EVENTS.length)))));
  const line = useTransform(scrollYProgress, [0, 1], ["1%", "76%"]);

  const go = (i: number) => {
    const el = outer.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + travel * ((i + 0.5) / EVENTS.length), behavior: "smooth" });
  };
  const e = EVENTS[on];

  return (
    <section ref={outer} aria-labelledby="incident" className="relative border-y border-bn-line bg-bn-paper-2/60" style={{ height: `${EVENTS.length * 55 + 45}vh` }}>
      <div className="sticky top-16 h-[calc(100vh-4rem)] flex flex-col justify-center max-w-page mx-auto px-4 sm:px-6 lg:px-10 py-10">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
          <Reveal><Eyebrow>29 October 2026</Eyebrow></Reveal>
          <Reveal delay={0.05} className="flex-1 min-w-[16rem]">
            <h2 id="incident" className="font-serif font-normal text-display-s text-bn-ink m-0">What happened, in four moments.</h2>
          </Reveal>
          <span className="font-mono text-[11.5px] text-bn-muted" aria-hidden>{on + 1} / {EVENTS.length} · keep scrolling</span>
        </div>

        <Reveal delay={0.08}>
          <div role="tablist" aria-label="Incident timeline" onKeyDown={(k) => { const d = k.key === "ArrowRight" ? 1 : k.key === "ArrowLeft" ? -1 : 0; if (!d) return; k.preventDefault(); const n = Math.min(EVENTS.length - 1, Math.max(0, on + d)); go(n); document.getElementById(`ev-${n}`)?.focus({ preventScroll: true }); }} className="mt-10 relative grid grid-cols-2 lg:grid-cols-4 gap-px">
            <div className="hidden lg:block absolute left-0 right-0 top-[7px] h-px bg-bn-line" aria-hidden />
            <motion.div className="hidden lg:block absolute left-0 top-[7px] h-px bg-bn-ember" aria-hidden style={{ width: line }} />
            {EVENTS.map((ev, i) => (
              <button key={ev.at} role="tab" aria-selected={on === i} aria-controls="incident-detail" id={`ev-${i}`}
                onClick={() => go(i)} tabIndex={on === i ? 0 : -1}
                className="bn-focus group relative text-left pt-0 pb-4 pr-4 rounded">
                <span className={`relative z-10 block h-[15px] w-[15px] rounded-full border-2 transition-colors duration-base ${i <= on ? "bg-bn-ember border-bn-ember" : "bg-bn-paper border-bn-line group-hover:border-bn-ink"}`} aria-hidden />
                <span className="block mt-4 font-mono text-[11.5px] text-bn-muted">{ev.at}</span>
                <span className={`block mt-1 font-serif text-display-s transition-colors ${on === i ? "text-bn-ink" : "text-bn-muted group-hover:text-bn-ink-2"}`}>{ev.big}</span>
              </button>
            ))}
          </div>
        </Reveal>

        <div id="incident-detail" role="tabpanel" aria-labelledby={`ev-${on}`} className="mt-4 min-h-[150px] lg:min-h-[120px]">
          <AnimatePresence mode="wait">
            <motion.div key={on} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}
              className="grid lg:grid-cols-[19rem_1fr] gap-x-10 gap-y-2 border-t border-bn-line pt-6">
              <h3 className="m-0 text-[17px] font-medium text-bn-ink">{e.title}</h3>
              <p className="m-0 text-[16px] leading-relaxed text-bn-ink-2 max-w-prose">{e.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="m-0 mt-6 font-mono text-[11px] text-bn-muted flex flex-wrap gap-x-4 gap-y-1">
          <span>Sources: Blockaid, Fireblocks, TRM Labs, TechFlow. Figures vary slightly between them.</span>
          <a href={`https://etherscan.io/address/${BINANCE_14}`} target="_blank" rel="noopener noreferrer" className="bn-focus rounded inline-flex items-center gap-0.5 underline underline-offset-4 decoration-bn-line hover:decoration-bn-ink hover:text-bn-ink">
            Binance 14 on Etherscan<ArrowUpRight className="h-3 w-3" />
          </a>
        </p>
      </div>
    </section>
  );
}
