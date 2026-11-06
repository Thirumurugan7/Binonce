import type { ReactNode } from "react";

/** Section kicker: mono, uppercase, with an optional index ("01"). */
export function Eyebrow({ index, onNight, children }: { index?: string; onNight?: boolean; children: ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-eyebrow uppercase ${onNight ? "text-bn-fog-2" : "text-bn-muted"}`}>
      {index && <span className={onNight ? "text-bn-ember-glow" : "text-bn-ember-ink"}>{index}</span>}
      {index && <span className={`h-px w-8 ${onNight ? "bg-bn-night-line" : "bg-bn-line"}`} aria-hidden />}
      <span>{children}</span>
    </div>
  );
}
