import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Eyebrow, Reveal, Tag, Hl, type TagTone } from "@/components/brand";
import { CHAINWALL } from "./links";
import { LockCompare } from "./LockCompare";

/**
 * Status is stated plainly, from the repo:
 *  - The Blacklist is implemented (Arkiv reads/writes + importer).
 *  - The Lock has its walkthrough UI at /defense; its on-chain integration is being rebuilt.
 *  - The Alarm is designed in docs/tracks/chainlink-alarm.md but not built.
 */
const LAYERS: {
  name: string; role: string; by: string; status: string; tone: TagTone; body: string;
  detail: React.ReactNode; link?: { href: string; label: string };
}[] = [
  {
    name: "The Lock",
    role: "Keeps the door shut",
    by: "Chainwall",
    status: "In progress",
    tone: "progress",
    body: "Treasury funds sit in a governed vault instead of a bare key. Money moves only through interactions the policy already approved, so a stolen signature has nothing it is allowed to do.",
    detail: (
      <>The walkthrough UI is built; its on-chain run is being rewired. The engine checks every signer first. If the signer’s account has become delegated code, the call reverts with{" "}
        <code className="font-mono text-[0.92em] text-bn-ink">ActorDelegated</code> before any signature is even looked at.</>
    ),
    link: { href: "/defense", label: "See the defense walkthrough" },
  },
  {
    name: "The Blacklist",
    role: "Knows who the thieves are",
    by: "Arkiv",
    status: "Live on Arkiv testnet",
    tone: "live",
    body: "Every sweeper the replay uses, plus delegate contracts scanned from Ethereum mainnet, goes into a public, wallet-signed registry. Anyone can query it without asking us.",
    detail: <>Labels come from bytecode and reuse heuristics, recorded with their evidence. Nothing is called a thief on a guess.</>,
    link: { href: "#blacklist", label: "How entries are labelled" },
  },
  {
    name: "The Alarm",
    role: "Spots the break-in",
    by: "Chainlink CRE",
    status: "Planned",
    tone: "planned",
    body: "A workflow that watches treasury keys for new 0xef0100 code, checks the delegate against the Blacklist, and raises an alert on-chain so the key gets rotated.",
    detail: <>Designed in the project docs; not built yet.</>,
  },
];

export function Layers() {
  return (
    <section id="layers" className="scroll-mt-16 max-w-page mx-auto px-4 sm:px-6 lg:px-10 py-20 lg:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-20 items-end">
        <div>
          <Reveal><Eyebrow>Defense</Eyebrow></Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-serif font-normal text-display-l text-bn-ink mt-6 mb-0 text-balance">
              A key alone should not be enough to move money.
            </h2>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <p className="text-body-l text-bn-ink-2 m-0 max-w-prose">
            Spotting a bad signature doesn’t work, because a forged one looks exactly like a real one. The fix is to <Hl>stop treating a
            signature as permission</Hl>. Binonce frames that as three layers around the same wallet.
          </p>
        </Reveal>
      </div>

      <Reveal className="mt-12 lg:mt-16"><LockCompare /></Reveal>

      <ol className="m-0 p-0 list-none mt-16 lg:mt-20 border-t border-bn-ink">
        {LAYERS.map((l, i) => (
          <Reveal as="li" key={l.name} delay={i * 0.06}
            className="grid grid-cols-1 md:grid-cols-[minmax(0,15rem)_1fr] lg:grid-cols-[minmax(0,19rem)_1fr_minmax(0,15rem)] gap-x-10 gap-y-4 py-9 lg:py-12 border-b border-bn-line">
            <div>
              <div className="font-mono text-eyebrow uppercase text-bn-muted">{l.role}</div>
              <h3 className="font-serif font-normal text-display-m text-bn-ink mt-3 mb-0">{l.name}</h3>
              <div className="mt-2 text-[14px] text-bn-muted">with {l.by}</div>
            </div>
            <div className="max-w-[36rem]">
              <p className="m-0 text-[17px] leading-relaxed text-bn-ink">{l.body}</p>
              <p className="m-0 mt-3 text-[15px] leading-relaxed text-bn-ink-2">{l.detail}</p>
            </div>
            <div className="flex lg:flex-col lg:items-end gap-4 flex-wrap items-center md:col-start-2 lg:col-start-auto">
              <Tag tone={l.tone}>{l.status}</Tag>
              {l.link && (
                <a href={l.link.href} className="bn-focus rounded inline-flex items-center gap-1.5 text-[14px] text-bn-ink underline decoration-bn-line underline-offset-4 hover:decoration-bn-ink transition-colors">
                  {l.link.label}<ArrowRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </Reveal>
        ))}
      </ol>

      <Reveal>
        <p className="mt-8 mb-0 text-[13px] text-bn-muted max-w-prose">
          The Lock runs on{" "}
          <a href={CHAINWALL} target="_blank" rel="noopener noreferrer" className="bn-focus rounded underline underline-offset-4 decoration-bn-line hover:decoration-bn-ink text-bn-ink-2 inline-flex items-center gap-0.5">
            OKcontract’s Chainwall<ArrowUpRight className="h-3 w-3" />
          </a>
          . Binonce built the attack replay, the Blacklist and the walkthroughs around it.
        </p>
      </Reveal>
    </section>
  );
}
