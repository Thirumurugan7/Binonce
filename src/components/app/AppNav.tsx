"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Wordmark, ThemeToggle } from "@/components/brand";
import { REPO } from "@/components/landing/links";

const MODES = [
  { href: "/attack", label: "Attack replay", short: "Attack" },
  { href: "/defense", label: "Defense", short: "Defense" },
] as const;

/** Top bar for the app pages: brand (back to landing), Attack ↔ Defense switch, theme. */
export function AppNav({ chain }: { chain?: string }) {
  const path = usePathname() ?? "";
  return (
    <header className="sticky top-0 z-50 bg-bn-paper/85 backdrop-blur-md border-b border-bn-line">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3 sm:gap-6">
        <Link href="/" className="bn-focus rounded flex-none" aria-label="Binonce home"><Wordmark /></Link>

        <nav aria-label="Mode" className="flex items-center gap-1 p-1 rounded-full border border-bn-line bg-bn-card/60">
          {MODES.map((m) => {
            const on = path.startsWith(m.href);
            return (
              <Link key={m.href} href={m.href} aria-current={on ? "page" : undefined}
                className={`bn-focus relative h-8 px-3 sm:px-4 rounded-full grid place-items-center text-[13px] transition-colors ${on ? "text-bn-paper" : "text-bn-ink-2 hover:text-bn-ink"}`}>
                {on && <motion.span layoutId="app-mode" className="absolute inset-0 rounded-full bg-bn-ink" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                <span className="relative hidden sm:inline">{m.label}</span>
                <span className="relative sm:hidden">{m.short}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {chain && (
            <span className="hidden md:inline-flex items-center gap-2 h-8 px-3 mr-1 rounded-full border border-bn-line font-mono text-[11.5px] text-bn-ink-2">
              <span className="h-1.5 w-1.5 rounded-full bg-bn-seal" aria-hidden />{chain}
            </span>
          )}
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="bn-focus hidden sm:inline rounded px-2 text-[14px] text-bn-ink-2 hover:text-bn-ink">GitHub</a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
