import { ArrowRight, ArrowDown } from "lucide-react";
import { Button, Eyebrow, Reveal, Hl } from "@/components/brand";
import { MetricsBoard } from "./MetricsBoard";

export function Hero() {
  return (
    <section id="top" className="relative max-w-page mx-auto px-4 sm:px-6 lg:px-10 pt-10 sm:pt-16 lg:pt-20 pb-16 lg:pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-[1.08fr_1fr] gap-12 lg:gap-14 items-center">
        <div>
          <Reveal><Eyebrow>Incident replay · EIP-7702<span className="hidden sm:inline"> · Oct 29, 2026</span></Eyebrow></Reveal>
          <Reveal delay={0.05}>
            <h1 className="font-serif font-normal text-display-xl text-bn-ink mt-6 mb-0 text-balance">
              A valid signature is <em className="text-bn-ember">not</em> an approved action.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="text-body-l text-bn-ink-2 mt-7 mb-0 max-w-[34rem]">
              On 29 October 2026, one stolen key signed 50 authorizations and <Hl>a Binance hot wallet became a contract that emptied itself</Hl>.
              Binonce replays that EIP-7702 drain on a real chain, so you can watch each step and see what stops it.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="flex flex-wrap items-center gap-3 mt-9">
              <Button href="/attack" size="lg" icon={<ArrowRight className="h-4 w-4" />}>Run the replay</Button>
              <Button href="#drain" size="lg" variant="secondary" icon={<ArrowDown className="h-4 w-4" />}>How the drain works</Button>
            </div>
            <p className="font-mono text-[12px] text-bn-muted mt-5 mb-0">
              Real contracts and transactions on local anvil or Sepolia · test tokens only
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1} y={28}>
          <MetricsBoard />
        </Reveal>
      </div>
    </section>
  );
}
