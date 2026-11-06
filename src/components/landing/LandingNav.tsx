"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button, Wordmark, ThemeToggle } from "@/components/brand";
import { SECTIONS, REPO } from "./links";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color] duration-base ${
        scrolled || open ? "bg-bn-paper/90 backdrop-blur-md border-b border-bn-line" : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center gap-8">
        <a href="#top" className="bn-focus rounded" aria-label="Binonce, back to top"><Wordmark /></a>

        <nav aria-label="Sections" className="hidden lg:flex items-center gap-7">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="bn-focus rounded text-[14px] text-bn-ink-2 hover:text-bn-ink transition-colors">
              {s.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="bn-focus rounded hidden sm:inline text-[14px] text-bn-ink-2 hover:text-bn-ink transition-colors px-2">
            GitHub
          </a>
          <ThemeToggle />
          <Button href="/attack" icon={<ArrowRight className="h-4 w-4" />} className="hidden sm:inline-flex ml-1">Run the replay</Button>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="bn-focus lg:hidden h-11 w-11 grid place-items-center rounded-full text-bn-ink hover:bg-bn-ink/[0.05]"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Sections"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="lg:hidden overflow-hidden border-t border-bn-line"
          >
            <ul className="px-4 sm:px-6 py-3">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={() => setOpen(false)}
                    className="bn-focus flex items-center justify-between py-3.5 text-[17px] text-bn-ink border-b border-bn-line/70">
                    {s.label}<ArrowRight className="h-4 w-4 text-bn-muted" />
                  </a>
                </li>
              ))}
              <li className="pt-4 pb-2 flex gap-2">
                <Button href="/attack" className="flex-1">Run the replay</Button>
                <Button href={REPO} variant="secondary">GitHub</Button>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
