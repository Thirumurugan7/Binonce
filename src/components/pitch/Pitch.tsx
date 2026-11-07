"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, animate as fmAnimate, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowDown, ShieldCheck, Skull, ArrowUpRight, Check, Ban } from "lucide-react";
import { Button, Mark, Eyebrow, Hl, ThemeToggle } from "@/components/brand";
import { REPO, CHAINWALL } from "@/components/landing/links";

/**
 * The pitch, as a deck you page through. One scroll-snap container: a small scroll clicks to the next
 * full-screen beat. Each beat carries its own illustration, animated when the slide becomes active,
 * plus an interactive Chainwall diagram and a hack-comparison chart. Funnels into /attack and /defense.
 */
const BEATS = [
  { id: "intro", label: "Binonce" },
  { id: "eip7702", label: "EIP-7702" },
  { id: "danger", label: "The danger" },
  { id: "hack", label: "It happened" },
  { id: "attack", label: "See the drain" },
  { id: "chainwall", label: "Chainwall" },
  { id: "defense", label: "See it refused" },
  { id: "stakes", label: "The stakes" },
] as const;

const DARK_BEATS = new Set(["intro", "danger", "attack", "stakes"]);

// Each slide shares whether it is the active beat, so its illustration animates in (and replays on return).
const ActiveCtx = createContext(false);
const useActive = () => useContext(ActiveCtx);

export function Pitch() {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) {
        const i = BEATS.findIndex((b) => b.id === (e.target as HTMLElement).id);
        if (i >= 0) setActive(i);
      } },
      { root, threshold: 0.6 }
    );
    root.querySelectorAll("section[id]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const go = useCallback((i: number) => {
    const c = Math.max(0, Math.min(BEATS.length - 1, i));
    document.getElementById(BEATS[c].id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) { e.preventDefault(); go(active + 1); }
      else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) { e.preventDefault(); go(active - 1); }
      else if (e.key === "Home") { e.preventDefault(); go(0); }
      else if (e.key === "End") { e.preventDefault(); go(BEATS.length - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, go]);

  const dark = DARK_BEATS.has(BEATS[active].id);
  const activeId = BEATS[active].id;

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-bn-paper">
      <header className="fixed top-0 inset-x-0 z-50 h-16 flex items-center gap-4 px-5 sm:px-8 pointer-events-none">
        <Link href="/pitch" className="pointer-events-auto bn-focus rounded inline-flex items-center gap-2.5">
          <Mark size={22} />
          <span className={`font-serif text-[26px] leading-none tracking-[-0.01em] transition-colors ${dark ? "text-bn-fog" : "text-bn-ink"}`}>Binonce</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 pointer-events-auto">
          <Link href="/attack" className={`bn-focus rounded-full border h-9 px-4 grid place-items-center text-[13px] backdrop-blur transition-colors ${dark ? "border-bn-fog/20 bg-bn-fog/[0.06] text-bn-fog hover:bg-bn-fog/[0.12]" : "border-bn-line bg-bn-card/70 text-bn-ink hover:bg-bn-paper-2"}`}>Open the app</Link>
          <ThemeToggle />
        </div>
      </header>

      <nav aria-label="Beats" className="fixed right-5 sm:right-7 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {BEATS.map((b, i) => (
          <button key={b.id} onClick={() => go(i)} aria-label={b.label} aria-current={i === active} className="bn-focus group flex items-center gap-2.5 justify-end">
            <span className={`text-[11px] tracking-wide transition-opacity ${i === active ? `opacity-100 ${dark ? "text-bn-fog-2" : "text-bn-ink-2"}` : `opacity-0 group-hover:opacity-100 ${dark ? "text-bn-fog-2" : "text-bn-muted"}`}`}>{b.label}</span>
            <span className={`h-2 w-2 rounded-full transition-all ${i === active ? `scale-125 ${dark ? "bg-bn-fog" : "bg-bn-ink"}` : (dark ? "bg-bn-fog/25 group-hover:bg-bn-fog/60" : "bg-bn-line group-hover:bg-bn-muted")}`} />
          </button>
        ))}
      </nav>

      <div ref={scroller} className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scroll-smooth scroll-nice">
        {/* 1 — what is Binonce */}
        <Slide id="intro" tone="night" activeId={activeId}>
          <div className="max-w-4xl">
            <Mark size={72} animate="once" />
            <Rise delay={0.05}><h1 className="font-serif font-normal text-[clamp(2.8rem,8vw,6rem)] leading-[0.95] tracking-[-0.02em] text-bn-fog mt-7 mb-0">One signature can <span className="text-bn-gold">hand over</span> your wallet.</h1></Rise>
            <Rise delay={0.18}><p className="text-[clamp(1.1rem,2.2vw,1.5rem)] leading-snug text-bn-fog-2 mt-6 mb-0 max-w-2xl">Binonce replays a real EIP-7702 account-takeover on an exchange-style portfolio, then shows the Chainwall vault that refuses the exact same trick.</p></Rise>
            <Rise delay={0.3}><ScrollHint /></Rise>
          </div>
        </Slide>

        {/* 2 — EIP-7702 */}
        <Slide id="eip7702" tone="paper" activeId={activeId}>
          <div className="max-w-5xl w-full grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-center">
            <div>
              <Rise><Eyebrow>EIP-7702 · live since Pectra, May 2025</Eyebrow></Rise>
              <Rise delay={0.08}><h2 className="font-serif font-normal text-display-m text-bn-ink mt-6 mb-0 text-balance">A wallet can borrow a contract&apos;s code.</h2></Rise>
              <Rise delay={0.16}><p className="text-body-l text-bn-ink-2 mt-5 mb-0 max-w-prose">With a single type-4 authorization, an ordinary account can point its code at a contract. From then on the account <Hl>runs that contract&apos;s logic</Hl>: its own balance, someone else&apos;s rules.</p></Rise>
            </div>
            <Rise delay={0.2}><DelegationViz /></Rise>
          </div>
        </Slide>

        {/* 3 — the danger */}
        <Slide id="danger" tone="night" activeId={activeId}>
          <div className="max-w-5xl w-full">
            <Rise><Eyebrow onNight>Why it&apos;s dangerous</Eyebrow></Rise>
            <Rise delay={0.06}><h2 className="font-serif font-normal text-display-m text-bn-fog mt-6 mb-0 text-balance">One leaked key is the whole attack.</h2></Rise>
            <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center mt-7">
              <div>
                <Rise delay={0.12}><p className="text-body-l text-bn-fog-2 mt-0 mb-6 max-w-prose">The attacker signs 50 authorizations with the stolen key. One matches the wallet&apos;s nonce and takes effect, the account becomes a sweeper, and the entire balance leaves in a single call.</p></Rise>
                <Rise delay={0.2}>
                  <ul className="grid sm:grid-cols-3 gap-3 list-none p-0 m-0">
                    {[["No approval", "The owner is never asked."], ["No gas", "A relayer pays and broadcasts."], ["No warning", "No screen shows the sign step."]].map(([h, b]) => (
                      <li key={h} className="rounded-panel border border-bn-night-line bg-bn-night-2 px-4 py-4">
                        <div className="flex items-center gap-2 text-bn-ember-glow"><Skull className="h-4 w-4" /><span className="font-medium text-[14px]">{h}</span></div>
                        <p className="text-[13px] text-bn-fog-2 mt-1.5 mb-0 leading-snug">{b}</p>
                      </li>
                    ))}
                  </ul>
                </Rise>
              </div>
              <Rise delay={0.16}><DrainViz /></Rise>
            </div>
          </div>
        </Slide>

        {/* 4 — it already happened */}
        <Slide id="hack" tone="paper" activeId={activeId}>
          <div className="max-w-5xl w-full">
            <Rise><Eyebrow>It already happened</Eyebrow></Rise>
            <div className="grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-center mt-6">
              <div>
                <Rise delay={0.08}><HackCounter /></Rise>
                <Rise delay={0.16}><p className="text-body-l text-bn-ink mt-5 mb-0 max-w-prose"><Hl>Binance hot wallets, 29 Oct 2026.</Hl> One leaked key, 50 authorizations in a single transaction, and the wallet became a sweeper across about ten chains in twenty minutes.</p></Rise>
              </div>
              <Rise delay={0.2}>
                <div className="rounded-panel border border-bn-line bg-bn-card p-5 sm:p-6">
                  <p className="text-[13px] uppercase tracking-wide text-bn-muted m-0">It wasn&apos;t the first</p>
                  <ul className="list-none p-0 m-0 mt-3 divide-y divide-bn-line text-[14px]">
                    {[["80%+ of 7702 delegations", "pointed at copy-paste sweeper code (Wintermute, 2025)"], ["~$1M Uniswap lookalike", "five tokens gone in one batch (Scam Sniffer, 2025)"], ["~$146K phishing batch", "one signature, memecoins swept (Inferno Drainer)"]].map(([h, b]) => (
                      <li key={h} className="py-3"><span className="font-medium text-bn-ink">{h}</span> <span className="text-bn-ink-2">· {b}</span></li>
                    ))}
                  </ul>
                </div>
              </Rise>
            </div>
          </div>
        </Slide>

        {/* 5 — see the drain (→ /attack) */}
        <Slide id="attack" tone="night" activeId={activeId}>
          <div className="max-w-3xl text-center mx-auto">
            <Rise><Eyebrow onNight>Without Chainwall</Eyebrow></Rise>
            <Rise delay={0.08}><h2 className="font-serif font-normal text-display-l text-bn-fog mt-6 mb-0 text-balance">Watch a real wallet get drained.</h2></Rise>
            <Rise delay={0.16}><p className="text-body-l text-bn-fog-2 mt-6 mb-8 mx-auto max-w-xl">A live EIP-7702 attack on a Binance-style portfolio, running on testnet. Every step is a real transaction you can open in the explorer.</p></Rise>
            <Rise delay={0.24}><Button href="/attack" variant="inverse" size="lg" icon={<ArrowRight className="h-4 w-4" />}>Run the drain</Button></Rise>
          </div>
        </Slide>

        {/* 6 — what is Chainwall + architecture */}
        <Slide id="chainwall" tone="paper" activeId={activeId}>
          <div className="max-w-5xl w-full">
            <Rise><Eyebrow>What stops it · Chainwall</Eyebrow></Rise>
            <Rise delay={0.08}><h2 className="font-serif font-normal text-display-m text-bn-ink mt-6 mb-0 text-balance">Money that checks who&apos;s asking.</h2></Rise>
            <Rise delay={0.16}><p className="text-body-l text-bn-ink-2 mt-5 mb-0 max-w-prose">Chainwall keeps funds in a policy-guarded vault. It only moves money through actions its policy already approves, and it <Hl>checks the actor every time</Hl>, so a delegated signer is turned away.</p></Rise>
            <Rise delay={0.22}><ArchFlow /></Rise>
            <Rise delay={0.3}><p className="text-[14px] text-bn-ink-2 mt-6 mb-0">Binonce is <Hl>built on top of Chainwall</Hl>. <a href={CHAINWALL} target="_blank" rel="noopener noreferrer" className="bn-focus rounded underline decoration-bn-line underline-offset-2 hover:decoration-bn-ink">okcontract/chainwall ↗</a></p></Rise>
          </div>
        </Slide>

        {/* 7 — see it refused (→ /defense) */}
        <Slide id="defense" tone="seal" activeId={activeId}>
          <div className="max-w-3xl text-center mx-auto">
            <Rise><Eyebrow>With Chainwall</Eyebrow></Rise>
            <Rise delay={0.08}><h2 className="font-serif font-normal text-display-l text-bn-ink mt-6 mb-0 text-balance">The same attack, refused.</h2></Rise>
            <Rise delay={0.16}><p className="text-body-l text-bn-ink-2 mt-6 mb-8 mx-auto max-w-xl">Put the same money behind the vault and run the identical trick. The signer is still hijacked, but the vault sees the delegation and says no. The funds don&apos;t move.</p></Rise>
            <Rise delay={0.24}><Button href="/defense" size="lg" icon={<ShieldCheck className="h-4 w-4" />}>See it refused</Button></Rise>
          </div>
        </Slide>

        {/* 8 — the stakes + open-source closer */}
        <Slide id="stakes" tone="night" activeId={activeId}>
          <div className="max-w-5xl w-full grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center">
            <div>
              <Rise><h2 className="font-serif font-normal text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.03] tracking-[-0.02em] text-bn-fog mt-0 mb-0 text-balance">If this keeps going, there&apos;s nothing left for us.</h2></Rise>
              <Rise delay={0.12}><p className="text-body-l text-bn-fog-2 mt-6 mb-0 max-w-prose">The drains are real and they are accelerating. Chainwall is <Hl onNight>open-source</Hl>, and we built Binonce on top of it: the replay, the public blacklist, and the vault that refuses the attack.</p></Rise>
              <Rise delay={0.2}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button href={REPO} variant="inverse" size="lg" icon={<ArrowUpRight className="h-4 w-4" />}>Binonce on GitHub</Button>
                  <Button href={CHAINWALL} variant="inverse-ghost" size="lg">Chainwall</Button>
                </div>
              </Rise>
            </div>
            <Rise delay={0.18}><HackBars /></Rise>
          </div>
        </Slide>
      </div>
    </div>
  );
}

/* ─────────────────────────── reveal + slide ─────────────────────────── */

function Rise({ delay = 0, className = "", children }: { delay?: number; className?: string; children: React.ReactNode }) {
  const show = useActive();
  const reduce = useReducedMotion();
  return (
    <motion.div className={className}
      initial={{ opacity: 0, y: 22 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
      transition={reduce ? { duration: 0 } : { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

function ScrollHint() {
  return <div className="mt-12 inline-flex items-center gap-2 text-[13px] text-bn-fog-2"><ArrowDown className="h-4 w-4 animate-bounce" /> scroll to begin</div>;
}

const TONES = {
  paper: "bg-bn-paper text-bn-ink",
  night: "bg-bn-night text-bn-fog",
  seal: "bg-bn-seal-glow/[0.10] text-bn-ink",
} as const;

function Slide({ id, tone, activeId, children }: { id: string; tone: keyof typeof TONES; activeId: string; children: React.ReactNode }) {
  return (
    <ActiveCtx.Provider value={activeId === id}>
      <section id={id} className={`snap-start snap-always min-h-[100dvh] w-full flex items-center ${TONES[tone]}`}>
        <div className="w-full max-w-page mx-auto px-6 sm:px-10 lg:px-16 py-24">{children}</div>
      </section>
    </ActiveCtx.Provider>
  );
}

/* ─────────────────────────── illustrations ─────────────────────────── */

// Count a value up when the slide becomes active.
function CountUp({ to, decimals = 0, prefix = "", suffix = "", className = "" }: { to: number; decimals?: number; prefix?: string; suffix?: string; className?: string }) {
  const show = useActive();
  const reduce = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!show) { setV(0); return; }
    if (reduce) { setV(to); return; }
    const c = fmAnimate(0, to, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: setV });
    return () => c.stop();
  }, [show, to, reduce]);
  return <span className={className}>{prefix}{v.toFixed(decimals)}{suffix}</span>;
}

// EIP-7702: an EOA gets a 0xef0100 delegation marker and starts running a contract's code.
function DelegationViz() {
  const show = useActive();
  return (
    <div className="rounded-panel border border-bn-line bg-bn-card p-6 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 rounded-data border border-bn-line bg-bn-paper-2/50 px-4 py-4 text-center">
          <div className="text-[12px] text-bn-muted">Your account</div>
          <div className="font-mono text-[13px] text-bn-ink mt-1">0xA11ce…</div>
        </div>
        <motion.div initial={{ opacity: 0, x: -6 }} animate={show ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }} transition={{ delay: 0.5, duration: 0.5 }} className="flex flex-col items-center text-bn-muted">
          <span className="text-[11px] mb-1">authorize</span><ArrowRight className="h-4 w-4" />
        </motion.div>
        <div className="flex-1 rounded-data border border-bn-line bg-bn-paper-2/50 px-4 py-4 text-center">
          <div className="text-[12px] text-bn-muted">Sweeper contract</div>
          <div className="font-mono text-[13px] text-bn-ink mt-1">0x5weep…</div>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }} transition={{ delay: 1.0, duration: 0.5 }}
        className="mt-5 rounded-data border border-bn-ember-glow/40 bg-bn-ember/[0.07] px-4 py-3 text-center">
        <div className="text-[11.5px] text-bn-ink-2">Your account&apos;s code is now</div>
        <div className="font-mono text-[15px] mt-1"><span className="text-bn-ember-ink font-semibold">0xef0100</span><span className="text-bn-ink"> 5weep…</span></div>
        <div className="text-[11.5px] text-bn-muted mt-1">it runs the sweeper&apos;s logic</div>
      </motion.div>
    </div>
  );
}

// The danger: 50 authorizations sign, one lands, the balance drains to zero.
function DrainViz() {
  const show = useActive();
  const cells = Array.from({ length: 50 }, (_, i) => i);
  return (
    <div className="rounded-panel border border-bn-night-line bg-bn-night-2 p-6">
      <div className="flex items-center justify-between text-[12px] text-bn-fog-2"><span>50 authorizations signed</span><span>one matches</span></div>
      <div className="grid grid-cols-10 gap-1.5 mt-3">
        {cells.map((i) => (
          <motion.span key={i} initial={{ opacity: 0, scale: 0.2 }} animate={show ? { opacity: i === 0 ? 1 : 0.4, scale: 1 } : { opacity: 0, scale: 0.2 }}
            transition={{ delay: 0.2 + i * 0.012, duration: 0.3 }}
            className={`h-3 rounded-[2px] ${i === 0 ? "bg-bn-ember-glow" : "bg-bn-fog/30"}`} />
        ))}
      </div>
      <div className="mt-6">
        <div className="flex items-baseline justify-between text-[12px] text-bn-fog-2"><span>Wallet balance</span>
          <span className="font-mono tabular-nums text-bn-fog"><CountDown to={0} from={2500000} /> tUSD</span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-bn-fog/15 overflow-hidden">
          <motion.div initial={{ width: "100%" }} animate={show ? { width: "0%" } : { width: "100%" }} transition={{ delay: 1.0, duration: 1.4, ease: [0.4, 0, 0.2, 1] }} className="h-full bg-bn-ember-glow" />
        </div>
        <div className="mt-2 text-[12px] text-bn-ember-glow">drained to the attacker in one call</div>
      </div>
    </div>
  );
}

function CountDown({ from, to }: { from: number; to: number }) {
  const show = useActive();
  const reduce = useReducedMotion();
  const [v, setV] = useState(from);
  useEffect(() => {
    if (!show) { setV(from); return; }
    if (reduce) { setV(to); return; }
    const c = fmAnimate(from, to, { duration: 1.4, delay: 1.0, ease: [0.4, 0, 0.2, 1], onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [show, from, to, reduce]);
  return <>{v.toLocaleString("en-US")}</>;
}

// Binance incident headline figure + the ten chains lighting up.
function HackCounter() {
  const show = useActive();
  const chains = ["ETH", "BNB", "OP", "ARB", "AVAX", "BASE", "POLY", "SOL", "FTM", "ZK"];
  return (
    <div>
      <div className="font-serif text-[clamp(3.5rem,9vw,6.5rem)] leading-[0.9] tracking-[-0.03em] text-bn-ember-ink"><CountUp to={6.3} decimals={1} prefix="$" suffix="B" /></div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {chains.map((c, i) => (
          <motion.span key={c} initial={{ opacity: 0, y: 4 }} animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }} transition={{ delay: 0.6 + i * 0.08, duration: 0.3 }}
            className="rounded-full border border-bn-line px-2.5 py-1 text-[11.5px] font-mono text-bn-ink-2">{c}</motion.span>
        ))}
      </div>
      <div className="text-[12.5px] text-bn-muted mt-2">about ten chains · twenty minutes</div>
    </div>
  );
}

// Interactive Chainwall pipeline: toggle a clean vs hijacked signer and watch the request execute or get refused.
function ArchFlow() {
  const show = useActive();
  const [hijacked, setHijacked] = useState(false);
  const NODES = [
    { k: "Registry", d: "tenant & policies" },
    { k: "Interact", d: "checks the actor" },
    { k: "Vault", d: "holds the funds" },
  ];
  return (
    <div className="mt-8 rounded-panel border border-bn-line bg-bn-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[12px] text-bn-muted mr-1">Signer:</span>
        <button onClick={() => setHijacked(false)} className={`rounded-full px-3 h-8 text-[12.5px] font-medium border transition-colors ${!hijacked ? "border-bn-seal/50 text-bn-seal bg-bn-seal-glow/[0.08]" : "border-bn-line text-bn-ink-2 hover:text-bn-ink"}`}>Clean key</button>
        <button onClick={() => setHijacked(true)} className={`rounded-full px-3 h-8 text-[12.5px] font-medium border transition-colors ${hijacked ? "border-bn-ember-glow/60 text-bn-ember-ink bg-bn-ember/[0.08]" : "border-bn-line text-bn-ink-2 hover:text-bn-ink"}`}>Hijacked (7702)</button>
      </div>
      {/* pipeline */}
      <div className="relative">
        <div className="flex items-stretch gap-2 sm:gap-3">
          {NODES.map((n, i) => {
            const refusedHere = hijacked && i === 1;
            return (
              <div key={n.k} className="flex items-center gap-2 sm:gap-3 flex-1">
                <div className={`flex-1 rounded-data border px-3 py-3 text-center transition-colors ${refusedHere ? "border-bn-ember-glow/60 bg-bn-ember/[0.07]" : "border-bn-line bg-bn-paper-2/40"}`}>
                  <div className="font-mono text-[13px] font-semibold text-bn-ink">{n.k}</div>
                  <div className="text-[11px] text-bn-muted mt-0.5">{n.d}</div>
                </div>
                {i < 2 && <ArrowRight className={`h-4 w-4 flex-none ${hijacked && i === 1 ? "text-bn-ember-glow/40" : "text-bn-muted"}`} />}
              </div>
            );
          })}
        </div>
        {/* travelling request */}
        <motion.div aria-hidden className="absolute -top-2 h-3 w-3 rounded-full bg-bn-ink shadow"
          initial={{ left: "2%", opacity: 0 }}
          animate={show ? { left: hijacked ? "48%" : "90%", opacity: 1 } : { left: "2%", opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }} />
      </div>
      {/* outcome */}
      <div className="mt-5">
        {hijacked ? (
          <div className="flex items-center gap-2 rounded-data border border-bn-ember-glow/40 bg-bn-ember/[0.07] px-4 py-2.5 text-[13.5px] text-bn-ember-ink"><Ban className="h-4 w-4" /> Refused: <span className="font-mono">ActorDelegated</span>. The funds never move.</div>
        ) : (
          <div className="flex items-center gap-2 rounded-data border border-bn-seal/40 bg-bn-seal-glow/[0.08] px-4 py-2.5 text-[13.5px] text-bn-seal"><Check className="h-4 w-4" /> Approved by policy. The payout executes.</div>
        )}
      </div>
    </div>
  );
}

// The stakes: major thefts, bars growing. Binance is the modelled EIP-7702 case.
function HackBars() {
  const show = useActive();
  const MAX = 6.3;
  const DATA = [
    { name: "Poly Network", year: "2021", v: 0.61, note: "" },
    { name: "Ronin", year: "2022", v: 0.62, note: "" },
    { name: "Bybit", year: "2025", v: 1.5, note: "" },
    { name: "Binance", year: "2026", v: 6.3, note: "modelled 7702 case", hot: true },
  ];
  return (
    <div className="rounded-panel border border-bn-night-line bg-bn-night-2 p-6">
      <div className="text-[12px] uppercase tracking-wide text-bn-fog-2 mb-4">Major crypto thefts · $B stolen</div>
      <div className="flex flex-col gap-3.5">
        {DATA.map((d, i) => (
          <div key={d.name}>
            <div className="flex items-baseline justify-between text-[13px] mb-1">
              <span className={d.hot ? "text-bn-ember-glow font-medium" : "text-bn-fog"}>{d.name} <span className="text-bn-fog-2 text-[11.5px]">{d.year}</span></span>
              <span className={`font-mono tabular-nums ${d.hot ? "text-bn-ember-glow" : "text-bn-fog-2"}`}>${d.v.toFixed(2)}B</span>
            </div>
            <div className="h-3 rounded-full bg-bn-fog/10 overflow-hidden">
              <motion.div className={`h-full rounded-full ${d.hot ? "bg-bn-ember-glow" : "bg-bn-fog/50"}`}
                initial={{ width: 0 }} animate={show ? { width: `${(d.v / MAX) * 100}%` } : { width: 0 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            {d.note && <div className="text-[11px] text-bn-fog-2 mt-1">{d.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
