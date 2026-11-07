import { money } from "@/lib/format";
import type { TraceState } from "./AttackTrace";

/** 0 = not started · 1 sign · 2 send · 3 take over · 4 drain · 5 finished */
export type Phase = 0 | 1 | 2 | 3 | 4 | 5;

export function phaseOf(steps: TraceState["steps"]): Phase {
  if (steps.sweep === "done") return 5;
  if (steps.sweep === "active") return 4;
  if (steps.verify !== "idle") return 3;
  if (steps.delegate !== "idle") return 2;
  if (steps.sign !== "idle") return 1;
  return 0;
}

/** Numbers a judge cares about, filled in live. */
export function RunSummary({ phase, signed, txs, moved, elapsed }: { phase: Phase; signed: number; txs: number; moved: number; elapsed: number | null }) {
  const started = phase > 0;
  const rows: [string, string, boolean?][] = [
    ["Approvals asked of the owner", started ? "0" : "—", true],
    ["Gas paid by the owner", started ? "0 ETH" : "—", true],
    ["Authorizations signed", started ? `${signed} (1 used)` : "—"],
    ["Transactions sent", started ? String(txs) : "—"],
    ["Moved to the attacker", phase === 5 ? `${money(moved)} tUSD` : "—", phase === 5],
    ["Time from Launch", elapsed != null ? `${(elapsed / 1000).toFixed(1)} s` : "—"],
  ];
  return (
    <div className="rounded-panel border border-bn-line bg-bn-card shadow-bn-1 p-5 h-full">
      <div className="text-[15px] font-medium text-bn-ink">This run, in numbers</div>
      <p className="m-0 mt-1 text-[13px] text-bn-muted">Filled in live from the chain.</p>
      <dl className="m-0 mt-4">
        {rows.map(([k, v, hl]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-2.5 border-t border-bn-line">
            <dt className="text-[13.5px] text-bn-ink-2">{k}</dt>
            <dd className={`m-0 font-mono tnum text-[14px] ${hl && v !== "—" ? "text-bn-ember-ink font-medium" : "text-bn-ink"}`}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
