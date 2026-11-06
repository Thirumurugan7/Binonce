import { ArrowUpRight, ArrowDown } from "lucide-react";
import { Eyebrow, Reveal, Tag, Hl } from "@/components/brand";

/**
 * Real EIP-7702 incidents. Every row cites where its figure comes from; amounts are as reported.
 * "Replayed" marks the pattern the Binonce replay actually runs (leaked key + sweeper).
 */
type Pattern = "sweeper" | "phishing";
const CASES: { when: string; amount: string; title: string; body: string; pattern: Pattern; source: { label: string; href: string }; featured?: boolean }[] = [
  {
    when: "May 2025", amount: "80%+",
    title: "Sweeper bots move in within weeks of Pectra",
    body: "Wintermute found that over 80% of EIP-7702 delegations pointed to copy-pasted versions of the same sweeper code, which it named CrimeEnjoyor: bots that delegate wallets with leaked keys and drain any ETH that arrives.",
    pattern: "sweeper",
    source: { label: "Wintermute via The Block, Jun 2025", href: "https://www.theblock.co/post/356481/wintermute-warns-pectra-upgrade-leaves-ethereum-users-at-risk-of-automated-attacks" },
  },
  {
    when: "24 May 2025", amount: "~$146K",
    title: "A phishing batch through a delegated wallet",
    body: "A user whose wallet was already upgraded with EIP-7702 signed what looked like one action. It was a batch that moved their memecoins out in a single transaction. Scam Sniffer linked it to Inferno Drainer.",
    pattern: "phishing",
    source: { label: "Scam Sniffer via Cryptorank", href: "https://cryptorank.io/news/feed/ddaf4-new-ethereum-feature-exploited-of-146k" },
  },
  {
    when: "Aug 2025", amount: "~$1M",
    title: "A fake Uniswap swap",
    body: "An investor signed a batch dressed up as Uniswap swaps. Five tokens left their wallet in one EIP-7702 transaction.",
    pattern: "phishing",
    source: { label: "Scam Sniffer via CryptoSlate, Aug 2025", href: "https://cryptoslate.com/crypto-investor-loses-1m-in-uniswap-scam-exploiting-ethereums-eip-7702/" },
  },
  {
    when: "29 Oct 2026", amount: "$6.3B",
    title: "Binance hot wallets",
    body: "One leaked key, 50 authorizations in one transaction, and Binance 14 became a sweeper. The pattern spread across about ten chains in twenty minutes.",
    pattern: "sweeper", featured: true,
    source: { label: "Blockaid, Fireblocks, TRM Labs, TechFlow", href: "#incident" },
  },
];

const PATTERN: Record<Pattern, { label: string; how: string }> = {
  sweeper: { label: "Leaked key + sweeper", how: "Someone has the key, delegates the wallet to a drainer contract, and calls it." },
  phishing: { label: "Phishing batch", how: "The owner is tricked into signing one batch that hides the transfers." },
};

export function Cases() {
  return (
    <section id="cases" className="scroll-mt-16 max-w-page mx-auto px-4 sm:px-6 lg:px-10 py-20 lg:py-28">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-20 items-end">
        <div>
          <Reveal><Eyebrow>Cases</Eyebrow></Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-serif font-normal text-display-l text-bn-ink mt-6 mb-0 text-balance">Binance was the biggest. It wasn’t the first.</h2>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <p className="text-body-l text-bn-ink-2 m-0 max-w-prose">
            EIP-7702 went live with Ethereum’s Pectra upgrade in May 2025. Since then <Hl>wallets have been drained in two ways</Hl>:
            with a leaked key and a sweeper contract, or by tricking the owner into signing a malicious batch. Binonce replays the first,
            because that is what happened to Binance.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.08}>
        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-[14px] text-bn-ink-2">
          {(Object.keys(PATTERN) as Pattern[]).map((p) => (
            <div key={p} className="flex items-start gap-2.5 max-w-[26rem]">
              <span className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-none ${p === "sweeper" ? "bg-bn-ember" : "bg-bn-ink/40"}`} aria-hidden />
              <span><b className="font-medium text-bn-ink">{PATTERN[p].label}.</b> {PATTERN[p].how}</span>
            </div>
          ))}
        </div>
      </Reveal>

      <ol className="m-0 p-0 list-none mt-10 border-t border-bn-ink">
        {CASES.map((c, i) => (
          <Reveal as="li" key={c.title} delay={i * 0.05}
            className={`grid grid-cols-[5.5rem_1fr] md:grid-cols-[8rem_10rem_1fr_15rem] gap-x-6 gap-y-2 py-7 border-b border-bn-line ${c.featured ? "bg-bn-paper-2/70 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10" : ""}`}>
            <div className="font-mono text-[12.5px] text-bn-muted pt-1.5">{c.when}</div>
            <div className={`font-serif text-display-s leading-none ${c.featured ? "text-bn-ember" : "text-bn-ink"}`}>{c.amount}</div>
            <div className="col-span-2 md:col-span-1">
              <h3 className="m-0 text-[17px] font-medium text-bn-ink">{c.title}</h3>
              <p className="m-0 mt-1.5 text-[15px] leading-relaxed text-bn-ink-2 max-w-[38rem]">{c.body}</p>
            </div>
            <div className="col-span-2 md:col-span-1 flex md:flex-col md:items-end gap-x-4 gap-y-2.5 flex-wrap items-center">
              <span className="inline-flex items-center gap-2 text-[13px] text-bn-ink-2">
                <span className={`h-2 w-2 rounded-full ${c.pattern === "sweeper" ? "bg-bn-ember" : "bg-bn-ink/40"}`} aria-hidden />{PATTERN[c.pattern].label}
              </span>
              {c.pattern === "sweeper" ? <Tag tone="breach">Replayed in Binonce</Tag> : <Tag tone="planned">Different path</Tag>}
              {c.source.href.startsWith("#") ? (
                <a href={c.source.href} className="bn-focus rounded inline-flex items-center gap-1 text-[12.5px] text-bn-ink underline decoration-bn-line underline-offset-4 hover:decoration-bn-ink">
                  The four moments<ArrowDown className="h-3 w-3" />
                </a>
              ) : (
                <a href={c.source.href} target="_blank" rel="noopener noreferrer" className="bn-focus rounded inline-flex items-center gap-1 text-[12.5px] text-bn-muted underline decoration-bn-line underline-offset-4 hover:text-bn-ink hover:decoration-bn-ink md:text-right">
                  {c.source.label}<ArrowUpRight className="h-3 w-3 flex-none" />
                </a>
              )}
            </div>
          </Reveal>
        ))}
      </ol>
      <p className="m-0 mt-4 text-[12.5px] text-bn-muted">Amounts are as reported by the linked sources and vary between outlets.</p>
    </section>
  );
}
