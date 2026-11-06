import type { ReactNode } from "react";

/**
 * Small mono status tag. Tones map to meaning, never decoration:
 * live = running in this repo · progress = partially built · planned = not built yet ·
 * breach = attack state · seal = held/safe.
 */
export type TagTone = "live" | "progress" | "planned" | "breach" | "seal" | "neutral";

const tones: Record<TagTone, { paper: string; night: string; dot: string; nightDot: string }> = {
  live:     { paper: "text-bn-seal border-bn-seal/30", night: "text-bn-seal-glow border-bn-seal-glow/30", dot: "bg-bn-seal", nightDot: "bg-bn-seal-glow" },
  seal:     { paper: "text-bn-seal border-bn-seal/30", night: "text-bn-seal-glow border-bn-seal-glow/30", dot: "bg-bn-seal", nightDot: "bg-bn-seal-glow" },
  progress: { paper: "text-bn-amber border-bn-amber/30", night: "text-bn-amber-glow border-bn-amber-glow/30", dot: "bg-bn-amber", nightDot: "bg-bn-amber-glow" },
  breach:   { paper: "text-bn-ember-ink border-bn-ember/30", night: "text-bn-ember-glow border-bn-ember-glow/30", dot: "bg-bn-ember", nightDot: "bg-bn-ember-glow" },
  planned:  { paper: "text-bn-muted border-bn-line", night: "text-bn-fog-2 border-bn-night-line", dot: "bg-bn-muted/60", nightDot: "bg-bn-fog-2/60" },
  neutral:  { paper: "text-bn-ink-2 border-bn-line", night: "text-bn-fog border-bn-night-line", dot: "bg-bn-ink-2", nightDot: "bg-bn-fog" },
};

export function Tag({ tone = "neutral", onNight, pulse, children }: { tone?: TagTone; onNight?: boolean; pulse?: boolean; children: ReactNode }) {
  const t = tones[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-tag border font-mono text-[11px] uppercase tracking-[0.08em] ${onNight ? t.night : t.paper}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${onNight ? t.nightDot : t.dot} ${pulse ? "animate-beat" : ""}`} aria-hidden />
      {children}
    </span>
  );
}
