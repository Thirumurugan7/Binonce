import { ArrowUpRight } from "lucide-react";
import { Eyebrow, Reveal, Hl } from "@/components/brand";
import { Classifier } from "./Classifier";
import { CopyButton } from "./CopyButton";
import { ARKIV_EXPLORER, ARKIV_WRITER, REPO } from "./links";

const QUERY = `const { entities } = await pub
  .select({ $key: true, address: true, label: true, delegatorCount: true })
  .from(Delegate)            // schema "chainwall.delegate"
  .ownedBy("${ARKIV_WRITER}")
  .fetch();`;

export function Blacklist() {
  return (
    <section id="blacklist" className="scroll-mt-16 relative bg-bn-night text-bn-fog overflow-hidden">
      <div className="absolute inset-0 bn-grid-night opacity-40 pointer-events-none" aria-hidden />
      <div className="relative max-w-page mx-auto px-4 sm:px-6 lg:px-10 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-14 lg:gap-20">
          <div>
            <Reveal><Eyebrow onNight>The Blacklist</Eyebrow></Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-serif font-normal text-display-l text-bn-fog mt-6 mb-0 text-balance">
                A public list of contracts that drain wallets.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-body-l text-bn-fog-2 mt-6 mb-0 max-w-prose">
                Every delegate contract Binonce sees goes to Arkiv, a database on its own chain. Entries are signed by our writer
                wallet and stamped with a block, anyone can read them without asking us, and a flag can only change through a
                public transaction. <Hl onNight>Labels come from fixed rules on the bytecode, not guesses.</Hl>
              </p>
            </Reveal>

            <Reveal delay={0.12} className="mt-10"><Classifier /></Reveal>
          </div>

          <div className="lg:pt-24"><div className="lg:sticky lg:top-24">
            <Reveal delay={0.1}>
              <figure className="m-0 rounded-panel border border-bn-night-line bg-bn-night-2 shadow-bn-3 overflow-hidden">
                <div className="flex items-center gap-3 pl-5 pr-2 h-12 border-b border-bn-night-line">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-bn-fog-2">query.ts</span>
                  <span className="ml-auto"><CopyButton text={QUERY} label="Copy query" onNight /></span>
                </div>
                <pre className="m-0 p-5 overflow-x-auto scroll-nice font-mono text-[12.5px] leading-[1.75] text-bn-fog"><code>{QUERY}</code></pre>
                <figcaption className="border-t border-bn-night-line px-5 py-4 text-[13px] text-bn-fog-2 leading-relaxed">
                  Runs against the live registry with your own free Arkiv access key. The full script is in the{" "}
                  <a href={`${REPO}#one-query-you-can-run`} target="_blank" rel="noopener noreferrer" className="bn-focus rounded text-bn-fog underline underline-offset-4 decoration-bn-night-line hover:decoration-bn-fog">README</a>.
                </figcaption>
              </figure>
            </Reveal>

            <Reveal delay={0.15}>
              <dl className="mt-6 m-0 grid grid-cols-1 sm:grid-cols-2 gap-px rounded-panel overflow-hidden border border-bn-night-line bg-bn-night-line">
                <Fact k="Writer wallet">
                  <a href={`${ARKIV_EXPLORER}/address/${ARKIV_WRITER}`} target="_blank" rel="noopener noreferrer"
                    className="bn-focus rounded font-mono text-bn-fog hover:text-bn-ember-glow inline-flex items-center gap-1">
                    {ARKIV_WRITER.slice(0, 8)}…{ARKIV_WRITER.slice(-6)}<ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </Fact>
                <Fact k="Network"><span className="font-mono text-bn-fog">Arkiv Rabdi · 7794095</span></Fact>
                <Fact k="Sources">Mainnet 7702 scan + every replay</Fact>
                <Fact k="License">Data CC0 · code MIT</Fact>
              </dl>
            </Reveal>
          </div></div>
        </div>
      </div>
    </section>
  );
}

function Fact({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="bg-bn-night px-5 py-4">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-bn-fog-2">{k}</dt>
      <dd className="m-0 mt-1.5 text-[14px] text-bn-fog">{children}</dd>
    </div>
  );
}
