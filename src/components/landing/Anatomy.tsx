"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eyebrow, Reveal, Hl } from "@/components/brand";
import { NonceWindow, CodeDecoder } from "./Explainers";

const STEPS = [
  {
    n: "01",
    title: "Sign",
    head: "The stolen key signs 50 authorizations.",
    body: "Each one says “let this account run the sweeper’s code,” at consecutive nonces. These are only signatures: nothing touches the chain, no gas is spent, and no wallet shows a prompt.",
  },
  {
    n: "02",
    title: "Broadcast",
    head: "A relayer sends them in one transaction.",
    body: "All 50 ride in a single type-4 transaction. The relayer pays the gas. The wallet’s owner never approves anything, because nothing asks them to.",
  },
  {
    n: "03",
    title: "Hijack",
    head: "One authorization lands, and the wallet becomes the sweeper.",
    body: "Only the authorization at the account’s current nonce takes effect. The other 49 are spares in case the nonce moves. The wallet’s code is now 0xef0100 followed by the sweeper’s address, so it runs the attacker’s contract as its own.",
  },
  {
    n: "04",
    title: "Drain",
    head: "One call empties it.",
    body: "The relayer calls the sweeper through the hijacked wallet. The contract reads its own balance and sends all of it to a hardcoded address, in a single on-chain call.",
  },
] as const;

export function Anatomy() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  // The step nearest the middle of the viewport drives the sticky visual.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="drain" className="scroll-mt-16 max-w-page mx-auto px-4 sm:px-6 lg:px-10 py-20 lg:py-32">
      <div className="max-w-[46rem]">
        <Reveal><Eyebrow>How the drain works</Eyebrow></Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-serif font-normal text-display-l text-bn-ink mt-6 mb-0 text-balance">
            Four steps from a leaked key to an empty wallet.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-body-l text-bn-ink-2 mt-6 mb-0 max-w-prose">
            EIP-7702 lets an ordinary account temporarily run a contract’s code. With the account’s key, <Hl>an attacker can point it at a
            contract that sends everything away</Hl>. Four steps, and the replay runs every one of them on-chain.
          </p>
        </Reveal>
      </div>

      <div className="mt-14 lg:mt-20 grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-20">
        <ol className="m-0 p-0 list-none">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              ref={(el) => { refs.current[i] = el; }}
              data-i={i}
              className="lg:min-h-[62vh] flex flex-col justify-center py-8 lg:py-0 border-t border-bn-line lg:border-0"
            >
              <div className={`transition-opacity duration-slow ${active === i ? "lg:opacity-100" : "lg:opacity-35"}`}>
                <div className="font-mono text-eyebrow uppercase text-bn-ember-ink">{s.n} · {s.title}</div>
                <h3 className="font-serif font-normal text-display-s text-bn-ink mt-3 mb-0">{s.head}</h3>
                <p className="text-[16px] leading-relaxed text-bn-ink-2 mt-4 mb-0 max-w-[32rem]">{s.body}</p>
              </div>
              {/* Mobile: the visual sits under its step. */}
              <div className="lg:hidden mt-6"><StepVisual step={i} /></div>
            </li>
          ))}
        </ol>

        <div className="hidden lg:block">
          <div className="sticky top-[calc(50vh-210px)]">
            <StepVisual step={active} />
          </div>
        </div>
      </div>

      <div className="mt-16 lg:mt-24 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Reveal><NonceWindow /></Reveal>
        <Reveal delay={0.08}><CodeDecoder /></Reveal>
      </div>
    </section>
  );
}

/** Night panel that illustrates one step. Static content; it only cross-fades between steps. */
function StepVisual({ step }: { step: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative rounded-panel bg-bn-night text-bn-fog border border-bn-night-line shadow-bn-2 overflow-hidden lg:h-[420px]" aria-hidden>
      <div className="absolute inset-0 bn-grid-night opacity-50" />
      <div className="relative flex items-center justify-between px-5 h-11 border-b border-bn-night-line font-mono text-[11px] uppercase tracking-[0.12em] text-bn-fog-2">
        <span>{STEPS[step].n} · {STEPS[step].title}</span>
        <span>{["signatures only", "type 0x04", "eth_getCode", "sweepToken()"][step]}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative p-5 sm:p-7 lg:h-[calc(100%-44px)] flex flex-col justify-center"
        >
          {step === 0 && <SignVisual />}
          {step === 1 && <BroadcastVisual />}
          {step === 2 && <HijackVisual />}
          {step === 3 && <DrainVisual />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SignVisual() {
  return (
    <div>
      <div className="grid grid-cols-10 gap-[6px]">
        {Array.from({ length: 50 }, (_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.15 }} animate={{ opacity: 1 }}
            transition={{ delay: i * 0.018, duration: 0.2 }}
            className="aspect-square rounded-[3px] border border-bn-fog/25 bg-bn-fog/[0.12] grid place-items-center font-mono text-[9px] text-bn-fog-2"
          >
            {i === 0 ? "n" : ""}
          </motion.div>
        ))}
      </div>
      <div className="mt-5 font-mono text-[12px] leading-relaxed text-bn-fog-2">
        sign({"{"} contract: <span className="text-bn-fog">sweeper</span>, chainId, nonce: <span className="text-bn-fog">n + i</span> {"}"}) × 50
        <br />on-chain effect: <span className="text-bn-fog">none yet</span>
      </div>
    </div>
  );
}

function BroadcastVisual() {
  return (
    <div className="font-mono text-[12.5px] leading-[1.9] rounded-data border border-bn-night-line bg-bn-night-2/80 p-5">
      <div className="text-bn-fog-2">{"{"}</div>
      <div className="pl-4"><span className="text-bn-fog-2">type:</span> <span className="text-bn-fog">0x04</span>,</div>
      <div className="pl-4"><span className="text-bn-fog-2">from:</span> <span className="text-bn-fog">relayer</span>, <span className="text-bn-fog-2">// pays the gas</span></div>
      <div className="pl-4"><span className="text-bn-fog-2">to:</span> <span className="text-bn-fog">victim</span>,</div>
      <div className="pl-4"><span className="text-bn-fog-2">authorizationList:</span> [</div>
      <div className="pl-8 text-bn-ember-glow">auth(nonce n),</div>
      <div className="pl-8 text-bn-fog">auth(nonce n+1), … auth(nonce n+49)</div>
      <div className="pl-4">]</div>
      <div className="text-bn-fog-2">{"}"}</div>
    </div>
  );
}

function HijackVisual() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-data border border-bn-night-line px-4 py-3.5">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-bn-fog-2 mb-1.5">Before</div>
        <code className="font-mono text-[14px] text-bn-fog">0x <span className="text-bn-fog-2">· no code, a plain EOA</span></code>
      </div>
      <div className="rounded-data border border-bn-ember-glow/40 bg-bn-ember/[0.08] px-4 py-3.5">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-bn-ember-glow mb-1.5">After · delegated</div>
        <code className="font-mono text-[14px]">
          <span className="text-bn-ember-glow">0xef0100</span><span className="text-bn-fog"> ‖ sweeper address</span>
        </code>
      </div>
      <div>
        <div className="grid grid-cols-[3fr_20fr] gap-1">
          <div className="h-2 rounded-sm bg-bn-ember-glow" />
          <div className="h-2 rounded-sm bg-bn-fog/30" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10.5px] text-bn-fog-2">
          <span><span className="text-bn-ember-glow">■</span> 3 bytes: the delegation marker</span>
          <span><span className="text-bn-fog/60">■</span> 20 bytes: the contract it now runs</span>
        </div>
      </div>
    </div>
  );
}

function DrainVisual() {
  return (
    <div className="flex flex-col gap-5">
      <Row label="Victim balance" from="2,500,000.00" to="0.00" tone="ember" />
      <Row label="Attacker balance" from="0.00" to="2,500,000.00" tone="fog" />
      <div className="font-mono text-[12px] text-bn-fog-2 leading-relaxed">
        victim.<span className="text-bn-fog">sweepToken</span>(tUSD)
        <br />→ transfer(<span className="text-bn-fog">attacker</span>, balanceOf(this))
      </div>
    </div>
  );
}

function Row({ label, from, to, tone }: { label: string; from: string; to: string; tone: "ember" | "fog" }) {
  return (
    <div className="rounded-data border border-bn-night-line px-4 py-3.5">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-bn-fog-2 mb-2">{label} · tUSD</div>
      <div className="font-mono tnum text-[15px] flex items-center gap-3 flex-wrap">
        <span className="text-bn-fog-2 line-through decoration-bn-fog-2/50">{from}</span>
        <span className="text-bn-fog-2">→</span>
        <span className={tone === "ember" ? "text-bn-ember-glow text-[20px]" : "text-bn-fog text-[20px]"}>{to}</span>
      </div>
    </div>
  );
}
