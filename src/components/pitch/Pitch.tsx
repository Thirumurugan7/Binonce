"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowDown, ShieldCheck, Skull, ArrowUpRight } from "lucide-react";
import { Button, Mark, Eyebrow, Hl, ThemeToggle } from "@/components/brand";
import { REPO, CHAINWALL } from "@/components/landing/links";

/**
 * The pitch, as a deck you page through. The whole thing is one scroll-snap container: a small
 * scroll clicks to the next full-screen beat instead of free-scrolling. Nine beats, funnelling into
 * the live /attack and /defense demos. Preview route — flip it to "/" when it's locked.
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

// Beats on a dark background — the fixed chrome flips to light text over these.
const DARK_BEATS = new Set(["intro", "danger", "attack", "stakes"]);

export function Pitch() {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Track the beat in view for the progress rail.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) {
          const i = BEATS.findIndex((b) => b.id === (e.target as HTMLElement).id);
          if (i >= 0) setActive(i);
        }
      },
      { root, threshold: 0.6 }
    );
    root.querySelectorAll("section[id]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const go = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(BEATS.length - 1, i));
    document.getElementById(BEATS[clamped].id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Keyboard paging, like a real deck.
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

  // The chrome (logo + rail) sits over slides of both tones, so flip it to match the active slide.
  const dark = DARK_BEATS.has(BEATS[active].id);

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-bn-paper">
      {/* fixed chrome */}
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

      {/* progress rail */}
      <nav aria-label="Beats" className="fixed right-5 sm:right-7 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {BEATS.map((b, i) => (
          <button key={b.id} onClick={() => go(i)} aria-label={b.label} aria-current={i === active}
            className="bn-focus group flex items-center gap-2.5 justify-end">
            <span className={`text-[11px] tracking-wide transition-opacity ${i === active ? `opacity-100 ${dark ? "text-bn-fog-2" : "text-bn-ink-2"}` : `opacity-0 group-hover:opacity-100 ${dark ? "text-bn-fog-2" : "text-bn-muted"}`}`}>{b.label}</span>
            <span className={`h-2 w-2 rounded-full transition-all ${i === active ? `scale-125 ${dark ? "bg-bn-fog" : "bg-bn-ink"}` : (dark ? "bg-bn-fog/25 group-hover:bg-bn-fog/60" : "bg-bn-line group-hover:bg-bn-muted")}`} />
          </button>
        ))}
      </nav>

      {/* the deck */}
      <div ref={scroller} className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scroll-smooth scroll-nice">
        {/* 1 — what is Binonce */}
        <Slide id="intro" tone="night">
          <div className="max-w-4xl">
            <Mark size={72} animate="once" />
            <h1 className="font-serif font-normal text-[clamp(2.8rem,8vw,6rem)] leading-[0.95] tracking-[-0.02em] text-bn-fog mt-7 mb-0">
              One signature can <span className="text-bn-gold">hand over</span> your wallet.
            </h1>
            <p className="text-[clamp(1.1rem,2.2vw,1.5rem)] leading-snug text-bn-fog-2 mt-6 mb-0 max-w-2xl">
              Binonce replays a real EIP-7702 account-takeover on an exchange-style portfolio — then shows the Chainwall vault that refuses the exact same trick.
            </p>
            <ScrollHint />
          </div>
        </Slide>

        {/* 2 — EIP-7702 */}
        <Slide id="eip7702" tone="paper">
          <div className="max-w-4xl">
            <Eyebrow>EIP-7702 · live since Pectra, May 2025</Eyebrow>
            <h2 className="font-serif font-normal text-display-l text-bn-ink mt-6 mb-0 text-balance">A wallet can borrow a contract&apos;s code.</h2>
            <p className="text-body-l text-bn-ink-2 mt-6 mb-0 max-w-prose">
              With a single type-4 authorization, an ordinary account can point its code at a contract. From then on the
              account <Hl>runs that contract&apos;s logic</Hl> — its own balance, someone else&apos;s rules.
            </p>
            <div className="mt-8 inline-flex items-center gap-3 rounded-data border border-bn-line bg-bn-card px-4 py-3 font-mono text-[14px] text-bn-ink">
              <span className="text-bn-ember-ink font-semibold">0xef0100</span>
              <span className="text-bn-muted">+ contract address</span>
              <span className="text-bn-muted">= this account is now delegated</span>
            </div>
          </div>
        </Slide>

        {/* 3 — the danger */}
        <Slide id="danger" tone="night">
          <div className="max-w-4xl">
            <Eyebrow onNight>Why it&apos;s dangerous</Eyebrow>
            <h2 className="font-serif font-normal text-display-l text-bn-fog mt-6 mb-0 text-balance">One leaked key is the whole attack.</h2>
            <p className="text-body-l text-bn-fog-2 mt-6 mb-0 max-w-prose">
              The attacker signs 50 authorizations with the stolen key — one matches the wallet&apos;s nonce and takes effect.
              The account becomes a sweeper, and the entire balance leaves in a single call.
            </p>
            <ul className="mt-8 grid sm:grid-cols-3 gap-4 list-none p-0 m-0">
              {[
                ["No approval", "The owner is never asked."],
                ["No gas", "A relayer pays and broadcasts."],
                ["No warning", "No exchange screen shows the sign step."],
              ].map(([h, b]) => (
                <li key={h} className="rounded-panel border border-bn-night-line bg-bn-night-2 px-4 py-4">
                  <div className="flex items-center gap-2 text-bn-ember-glow"><Skull className="h-4 w-4" /><span className="font-medium text-[14px]">{h}</span></div>
                  <p className="text-[13.5px] text-bn-fog-2 mt-1.5 mb-0 leading-snug">{b}</p>
                </li>
              ))}
            </ul>
          </div>
        </Slide>

        {/* 4 — it already happened */}
        <Slide id="hack" tone="paper">
          <div className="max-w-5xl w-full">
            <Eyebrow>It already happened</Eyebrow>
            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center mt-6">
              <div>
                <div className="font-serif text-[clamp(3.5rem,9vw,6.5rem)] leading-[0.9] tracking-[-0.03em] text-bn-ember-ink">$6.3B</div>
                <p className="text-body-l text-bn-ink mt-4 mb-0 max-w-prose">
                  <Hl>Binance hot wallets, 29 Oct 2026.</Hl> One leaked key, 50 authorizations in a single transaction,
                  and the wallet became a sweeper — across about ten chains in twenty minutes.
                </p>
              </div>
              <div className="rounded-panel border border-bn-line bg-bn-card p-5 sm:p-6">
                <p className="text-[13px] uppercase tracking-wide text-bn-muted m-0">It wasn&apos;t the first</p>
                <ul className="list-none p-0 m-0 mt-3 divide-y divide-bn-line text-[14px]">
                  {[
                    ["80%+ of 7702 delegations", "pointed at copy-paste sweeper code (Wintermute, 2025)"],
                    ["~$1M Uniswap lookalike", "five tokens gone in one batch (Scam Sniffer, 2025)"],
                    ["~$146K phishing batch", "one signature, memecoins swept (Inferno Drainer)"],
                  ].map(([h, b]) => (
                    <li key={h} className="py-3"><span className="font-medium text-bn-ink">{h}</span> <span className="text-bn-ink-2">— {b}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Slide>

        {/* 5 — see the drain (→ /attack) */}
        <Slide id="attack" tone="night">
          <div className="max-w-3xl text-center">
            <Eyebrow onNight>Without Chainwall</Eyebrow>
            <h2 className="font-serif font-normal text-display-l text-bn-fog mt-6 mb-0 text-balance">Watch a real wallet get drained.</h2>
            <p className="text-body-l text-bn-fog-2 mt-6 mb-8 mx-auto max-w-xl">
              A live EIP-7702 attack on a Binance-style portfolio, running on testnet — every step a real transaction you can open in the explorer.
            </p>
            <Button href="/attack" variant="inverse" size="lg" icon={<ArrowRight className="h-4 w-4" />}>Run the drain</Button>
          </div>
        </Slide>

        {/* 6 — what is Chainwall + architecture */}
        <Slide id="chainwall" tone="paper">
          <div className="max-w-5xl w-full">
            <Eyebrow>What stops it · Chainwall</Eyebrow>
            <h2 className="font-serif font-normal text-display-m text-bn-ink mt-6 mb-0 text-balance">Money that checks who&apos;s asking.</h2>
            <p className="text-body-l text-bn-ink-2 mt-5 mb-0 max-w-prose">
              Chainwall keeps funds in a policy-guarded vault. It only moves money through actions its policy already
              approves, and it <Hl>checks the actor every time</Hl> — a delegated signer is turned away.
            </p>
            {/* architecture */}
            <div className="mt-9 flex flex-wrap items-stretch gap-3">
              {[
                ["Registry", "the tenant & policies"],
                ["Interact", "execution engine · checks the actor"],
                ["Vault", "holds the funds"],
              ].map(([h, b], i) => (
                <div key={h} className="flex items-center gap-3">
                  <div className="rounded-panel border border-bn-line bg-bn-card px-4 py-3 min-w-[9.5rem]">
                    <div className="font-mono text-[13px] font-semibold text-bn-ink">{h}</div>
                    <div className="text-[12px] text-bn-muted mt-0.5 leading-snug">{b}</div>
                  </div>
                  {i < 2 && <ArrowRight className="h-4 w-4 text-bn-muted" />}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[12.5px]">
              {["Spending-cap policy", "2-of-2 approvals", "Actor is EIP-7702-checked"].map((t) => (
                <span key={t} className="rounded-full border border-bn-line px-3 py-1 text-bn-ink-2">{t}</span>
              ))}
            </div>
            <p className="text-[14px] text-bn-ink-2 mt-7 mb-0">
              Binonce is <Hl>built on top of Chainwall</Hl>. <a href={CHAINWALL} target="_blank" rel="noopener noreferrer" className="bn-focus rounded underline decoration-bn-line underline-offset-2 hover:decoration-bn-ink">okcontract/chainwall ↗</a>
            </p>
          </div>
        </Slide>

        {/* 7 — see it refused (→ /defense) */}
        <Slide id="defense" tone="seal">
          <div className="max-w-3xl text-center">
            <Eyebrow>With Chainwall</Eyebrow>
            <h2 className="font-serif font-normal text-display-l text-bn-ink mt-6 mb-0 text-balance">The same attack, refused.</h2>
            <p className="text-body-l text-bn-ink-2 mt-6 mb-8 mx-auto max-w-xl">
              Put the same money behind the vault and run the identical trick. The signer is still hijacked — but the
              vault sees the delegation and says no. The funds don&apos;t move.
            </p>
            <Button href="/defense" size="lg" icon={<ShieldCheck className="h-4 w-4" />}>See it refused</Button>
          </div>
        </Slide>

        {/* 8 — the stakes + open-source closer */}
        <Slide id="stakes" tone="night">
          <div className="max-w-4xl">
            <h2 className="font-serif font-normal text-[clamp(2.2rem,5.5vw,4rem)] leading-[1.02] tracking-[-0.02em] text-bn-fog mt-0 mb-0 text-balance">
              Binance. Bybit. The next exchange. If this keeps going, there&apos;s nothing left for us.
            </h2>
            <p className="text-body-l text-bn-fog-2 mt-7 mb-0 max-w-prose">
              The drains are real and they are accelerating. Chainwall is <Hl onNight>open-source</Hl>, and we built Binonce on
              top of it — the replay, the public blacklist, and the vault that refuses the attack.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button href={REPO} variant="inverse" size="lg" icon={<ArrowUpRight className="h-4 w-4" />}>Binonce on GitHub</Button>
              <Button href={CHAINWALL} variant="inverse-ghost" size="lg">Chainwall</Button>
            </div>
          </div>
        </Slide>
      </div>
    </div>
  );
}

function ScrollHint() {
  return (
    <div className="mt-12 inline-flex items-center gap-2 text-[13px] text-bn-fog-2">
      <ArrowDown className="h-4 w-4 animate-bounce" /> scroll to begin
    </div>
  );
}

const TONES = {
  paper: "bg-bn-paper text-bn-ink",
  night: "bg-bn-night text-bn-fog",
  seal: "bg-bn-seal-glow/[0.10] text-bn-ink",
} as const;

function Slide({ id, tone, children }: { id: string; tone: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <section id={id} className={`snap-start snap-always min-h-[100dvh] w-full flex items-center ${TONES[tone]}`}>
      <div className="w-full max-w-page mx-auto px-6 sm:px-10 lg:px-16 py-24">{children}</div>
    </section>
  );
}
