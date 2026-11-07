import { Wordmark } from "@/components/brand";
import { DOCS, REPO } from "./links";

export function Footer() {
  return (
    <footer className="border-t border-bn-line">
      <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-10 py-12 grid gap-8 md:grid-cols-[1fr_auto] items-start">
        <div>
          <Wordmark />
          <p className="mt-4 mb-0 text-[14px] text-bn-ink-2 max-w-[36rem] leading-relaxed">
            Built at ETHGlobal Mumbai, November 2026. A security research demo on test tokens; not affiliated with Binance.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="m-0 p-0 list-none flex flex-wrap gap-x-7 gap-y-3 text-[14px]">
            <li><a className="bn-focus rounded text-bn-ink-2 hover:text-bn-ink" href="/attack">Without Chainwall</a></li>
            <li><a className="bn-focus rounded text-bn-ink-2 hover:text-bn-ink" href="/defense">With Chainwall</a></li>
            <li><a className="bn-focus rounded text-bn-ink-2 hover:text-bn-ink" href={DOCS} target="_blank" rel="noopener noreferrer">Docs</a></li>
            <li><a className="bn-focus rounded text-bn-ink-2 hover:text-bn-ink" href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a></li>
            <li><a className="bn-focus rounded text-bn-ink-2 hover:text-bn-ink" href="/styleguide">Design system</a></li>
          </ul>
          <p className="mt-5 mb-0 font-mono text-[11.5px] text-bn-muted md:text-right">Code MIT · registry data CC0</p>
        </nav>
      </div>
    </footer>
  );
}
