import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button, Eyebrow, Reveal } from "@/components/brand";
import { CopyButton } from "./CopyButton";
import { REPO } from "./links";

const CMDS = [
  { cmd: "npm install", note: "dependencies" },
  { cmd: "npm run chain", note: "anvil on the Prague hardfork" },
  { cmd: "npm run setup", note: "deploys the contracts, writes .env" },
  { cmd: "npm run dev", note: "open /attack, press Launch attack" },
];

export function RunIt() {
  const all = CMDS.map((c) => c.cmd).join("\n");
  return (
    <section id="run" className="scroll-mt-16 max-w-page mx-auto px-4 sm:px-6 lg:px-10 py-20 lg:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-20 items-center">
        <div>
          <Reveal><Eyebrow>Run it yourself</Eyebrow></Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-serif font-normal text-display-l text-bn-ink mt-6 mb-0 text-balance">
              Run the drain on your own machine.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-body-l text-bn-ink-2 mt-7 mb-0 max-w-[34rem]">
              Each run tops the test wallet back up to 2,500,000 tUSD, so you can replay it as often as you like. Locally it
              runs in seconds; on Sepolia it waits for real blocks.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex flex-wrap gap-3 mt-9">
              <Button href="/attack" size="lg" icon={<ArrowRight className="h-4 w-4" />}>Run the replay</Button>
              <Button href="/defense" size="lg" variant="secondary">With Chainwall</Button>
              <Button href={REPO} size="lg" variant="ghost" icon={<ArrowUpRight className="h-4 w-4" />}>Source</Button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="rounded-panel bg-bn-night text-bn-fog border border-bn-night-line shadow-bn-3 overflow-hidden">
            <div className="flex items-center gap-3 pl-5 pr-2 h-12 border-b border-bn-night-line">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-bn-fog-2">Terminal</span>
              <span className="ml-auto"><CopyButton text={all} label="Copy all" onNight /></span>
            </div>
            <ol className="m-0 p-5 list-none flex flex-col gap-3.5 font-mono text-[13.5px]">
              {CMDS.map((c) => (
                <li key={c.cmd} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="text-bn-ember-glow select-none" aria-hidden>$</span>
                  <span className="text-bn-fog">{c.cmd}</span>
                  <span className="text-bn-fog-2 text-[12px]"># {c.note}</span>
                </li>
              ))}
            </ol>
            <p className="m-0 border-t border-bn-night-line px-5 py-4 text-[13px] text-bn-fog-2">
              Needs Node 18+ and Foundry’s <code className="font-mono text-bn-fog">anvil</code>. No faucet, no gas, no wallet.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
