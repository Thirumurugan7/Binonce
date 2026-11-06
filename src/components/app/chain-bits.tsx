import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { shortAddr } from "@/lib/format";

/* Small pieces for showing on-chain evidence. Anything that comes from the chain is drawn dark. */

export type TraceStatus = "idle" | "active" | "done" | "fail";
export interface ConsoleLine { t: number; msg: string; kind?: "hot" | "ok" | "go"; tx?: string }

/** One step of a run, written for someone new to EIP-7702. */
export interface Step<K extends string> {
  key: K;
  title: string;      // short label
  now: string;        // one plain sentence: what is happening
  why: string;        // how it works, in plain words
}

export function NightBox({ label, tag, tone, children }: { label: string; tag?: string; tone?: "ember" | "seal"; children: ReactNode }) {
  const border = tone === "ember" ? "border-bn-ember-glow/40 bg-bn-ember/[0.07]" : tone === "seal" ? "border-bn-seal-glow/40 bg-bn-seal-glow/[0.06]" : "border-bn-night-line bg-bn-night-2/70";
  return (
    <div className={`rounded-data border px-4 py-3 ${border}`}>
      <div className="flex items-center gap-2 mb-1.5 text-[12px]">
        <span className="text-bn-fog-2">{label}</span>
        {tag && <span className={`font-medium ${tone === "seal" ? "text-bn-seal-glow" : "text-bn-ember-glow"}`}>· {tag}</span>}
      </div>
      {children}
    </div>
  );
}

export function KV({ rows }: { rows: { k: string; v: ReactNode; tone?: "ember" | "seal" }[] }) {
  return (
    <div className="rounded-data border border-bn-night-line overflow-hidden">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-bn-night-line last:border-0">
          <span className="text-[13px] text-bn-fog-2">{r.k}</span>
          <span className={`font-mono text-[13px] ${r.tone === "ember" ? "text-bn-ember-glow" : r.tone === "seal" ? "text-bn-seal-glow" : "text-bn-fog"}`}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}

export function NightEmpty({ children }: { children: ReactNode }) {
  return <div className="rounded-data border border-dashed border-bn-night-line px-4 py-5 text-center text-[13px] text-bn-fog-2">{children}</div>;
}

export function TxRef({ hash, explorer, inline }: { hash: string; explorer: string | null; inline?: boolean }) {
  const short = shortAddr(hash);
  const cls = `font-mono ${inline ? "" : "text-[13px] text-bn-fog"}`;
  if (!explorer) return <span className={cls} title={hash}>{short}</span>;
  return (
    <a href={`${explorer}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className={`${cls} bn-focus rounded inline-flex items-center gap-0.5 underline decoration-bn-fog-2/40 underline-offset-2 hover:decoration-bn-fog`}>
      {short}<ArrowUpRight className="h-3 w-3" />
    </a>
  );
}
