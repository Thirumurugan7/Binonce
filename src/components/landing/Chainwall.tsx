import { ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Eyebrow, Reveal, Hl, Button } from "@/components/brand";
import { CHAINWALL } from "./links";

const NODES = [
  { k: "Registry", d: "the tenant & its policies" },
  { k: "Interact", d: "execution engine · checks the actor" },
  { k: "Vault", d: "holds the funds" },
];

const ONELINERS = [
  { h: "A policy-guarded vault", b: "Funds sit in a vault, not on a bare key. Money moves only through actions the policy already approved." },
  { h: "Every actor is checked", b: "Before it acts, the engine reads the signer’s code. A 7702-delegated account is refused with ActorDelegated." },
  { h: "Open-source infrastructure", b: "Chainwall is open, audited policy infrastructure. Binonce wires its replay and defense on top of it." },
];

/** What Chainwall is and how it works, the solution the whole project is built on top of. */
export function Chainwall() {
  return (
    <section id="chainwall" className="scroll-mt-16 max-w-page mx-auto px-4 sm:px-6 lg:px-10 py-20 lg:py-28">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-20 items-start">
        <div>
          <Reveal><Eyebrow>Chainwall</Eyebrow></Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-serif font-normal text-display-l text-bn-ink mt-6 mb-0 text-balance">Money that checks who’s asking.</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-body-l text-bn-ink-2 mt-6 mb-0 max-w-prose">
              The attack works because a plain wallet obeys any valid signature. <Hl>Chainwall</Hl> keeps funds in a
              policy-guarded vault instead: it only moves money through actions its policy already approves, and it checks
              the actor every time, so a hijacked signer is turned away before anything moves.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/defense" icon={<ShieldCheck className="h-4 w-4" />}>See it with Chainwall</Button>
              <a href={CHAINWALL} target="_blank" rel="noopener noreferrer"
                className="bn-focus rounded-full border border-bn-line h-11 px-5 inline-flex items-center gap-1.5 text-[14px] text-bn-ink-2 hover:text-bn-ink hover:bg-bn-paper-2 transition-colors">
                okcontract/chainwall <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="rounded-panel border border-bn-line bg-bn-card p-5 sm:p-7 shadow-bn-1">
            {/* architecture */}
            <div className="text-[12px] font-mono uppercase tracking-wide text-bn-muted mb-4">How it works</div>
            <div className="flex flex-wrap items-stretch gap-2.5">
              {NODES.map((n, i) => (
                <div key={n.k} className="flex items-center gap-2.5">
                  <div className="rounded-data border border-bn-line bg-bn-paper-2/50 px-3.5 py-3 min-w-[9.5rem]">
                    <div className="font-mono text-[13px] font-semibold text-bn-ink">{n.k}</div>
                    <div className="text-[11.5px] text-bn-muted mt-0.5 leading-snug">{n.d}</div>
                  </div>
                  {i < NODES.length - 1 && <ArrowRight className="h-4 w-4 text-bn-muted flex-none" />}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[12.5px]">
              {["Spending-cap policy", "2-of-2 approvals", "Actor is EIP-7702-checked"].map((t) => (
                <span key={t} className="rounded-full border border-bn-line px-3 py-1 text-bn-ink-2">{t}</span>
              ))}
            </div>

            {/* one-liners */}
            <div className="mt-6 pt-6 border-t border-bn-line grid sm:grid-cols-3 gap-5">
              {ONELINERS.map((o) => (
                <div key={o.h}>
                  <div className="text-[14px] font-medium text-bn-ink">{o.h}</div>
                  <p className="text-[13px] leading-relaxed text-bn-ink-2 mt-1.5 mb-0">{o.b}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
