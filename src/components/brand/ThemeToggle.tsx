"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

/** Flips `.dark` on <html> and remembers the choice. First paint is handled by the script in layout.tsx. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light"), []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("theme", next); } catch { /* storage blocked */ }
    setTheme(next);
  };

  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={`bn-focus h-10 w-10 grid place-items-center rounded-full text-bn-ink-2 hover:text-bn-ink hover:bg-bn-ink/[0.06] transition-colors ${className}`}
    >
      <span className="relative h-[18px] w-[18px]">
        <Sun className={`absolute inset-0 h-[18px] w-[18px] transition-all duration-base ${dark ? "opacity-0 rotate-90 scale-50" : "opacity-100"}`} />
        <Moon className={`absolute inset-0 h-[18px] w-[18px] transition-all duration-base ${dark ? "opacity-100" : "opacity-0 -rotate-90 scale-50"}`} />
      </span>
    </button>
  );
}
