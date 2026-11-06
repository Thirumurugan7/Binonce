"use client";

import { useEffect, useRef } from "react";
import { clock } from "@/lib/format";
import { CopyButton } from "@/components/landing/CopyButton";
import { TxRef, type ConsoleLine } from "./chain-bits";

/**
 * The live log, always on screen. Lines come straight from the server-sent events of a run;
 * transaction hashes link to the explorer when the chain has one.
 */
export function Terminal({ lines, running, explorer, command, idle }: {
  lines: ConsoleLine[]; running: boolean; explorer: string | null; command: string; idle: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines]);
  const text = lines.map((l) => `${clock(l.t)}  ${l.msg}${l.tx ? ` ${l.tx}` : ""}`).join("\n");

  return (
    <div className="rounded-panel bg-bn-night text-bn-fog border border-bn-night-line overflow-hidden">
      <div className="flex items-center gap-3 pl-5 pr-2 h-11 border-b border-bn-night-line">
        <span className="text-[13px] text-bn-fog">Live log</span>
        <span className="text-[12px] text-bn-fog-2">{lines.length ? `${lines.length} lines` : "empty"}</span>
        <span className="ml-auto">{lines.length > 0 && <CopyButton text={text} label="Copy log" onNight />}</span>
      </div>
      <div ref={ref} className="h-[300px] overflow-auto scroll-nice px-5 py-4 font-mono text-[12.5px] leading-[1.75]" role="log" aria-live="polite" aria-label="Live log">
        <div className="text-bn-fog-2"><span className="text-bn-ember-glow">$</span> {command}</div>
        {lines.length === 0 && !running && <div className="text-bn-fog-2 mt-1">{idle}</div>}
        {lines.map((l, i) => (
          <div key={i} className="flex gap-4">
            <span className="text-bn-fog-2/70 whitespace-nowrap select-none">{clock(l.t)}</span>
            <span className={`break-words min-w-0 ${l.kind === "hot" ? "text-bn-ember-glow" : l.kind === "ok" ? "text-bn-seal-glow" : l.kind === "go" ? "text-bn-fog" : "text-bn-fog-2"}`}>
              {l.msg}{l.tx ? <> <TxRef hash={l.tx} explorer={explorer} inline /></> : null}
            </span>
          </div>
        ))}
        {running && <div className="mt-0.5"><span className="inline-block w-2 h-4 align-middle bg-bn-fog animate-beat" aria-hidden /></div>}
      </div>
    </div>
  );
}
