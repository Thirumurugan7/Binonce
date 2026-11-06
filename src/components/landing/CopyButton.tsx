"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies `text`; announces success to screen readers. Hidden if the clipboard API is missing. */
export function CopyButton({ text, label = "Copy", onNight }: { text: string; label?: string; onNight?: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch { /* clipboard blocked: leave state unchanged */ }
  };
  return (
    <button
      onClick={copy}
      aria-label={done ? "Copied" : label}
      className={`bn-focus inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md font-mono text-[11.5px] transition-colors ${
        onNight ? "text-bn-fog-2 hover:text-bn-fog hover:bg-bn-fog/[0.06]" : "text-bn-muted hover:text-bn-ink hover:bg-bn-ink/[0.05]"
      }`}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </button>
  );
}
