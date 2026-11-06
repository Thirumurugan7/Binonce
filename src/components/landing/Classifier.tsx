"use client";

import { useId, useState } from "react";
import { Tag, type TagTone } from "@/components/brand";

/**
 * The Blacklist's labelling rules, as implemented in scripts/import.ts (docs/attack/detection.md).
 * Set the properties of a delegate contract and see the label the importer would write.
 */
function classify(hasCode: boolean, proxy: boolean, size: number, reuse: number): { label: string; tone: TagTone; why: string } {
  if (!hasCode) return { label: "unknown", tone: "planned", why: "No code at the address (revoked, self-destructed or an EOA)." };
  if (proxy) return { label: "unknown", tone: "planned", why: "EIP-1167 minimal proxy: a common, legitimate clone pattern. The implementation address is recorded." };
  if (size <= 127) return reuse >= 3
    ? { label: "likely-thief", tone: "progress", why: `Sweeper-sized (${size} bytes) and reused by ${reuse} different wallets in the scan.` }
    : { label: "suspicious", tone: "progress", why: `${size} bytes, not a proxy: too small for owner checks. Typically forwards the whole balance to one address.` };
  return { label: "unknown", tone: "planned", why: `${size} bytes: the size of a real smart-account implementation. Most 7702 traffic looks like this.` };
}

export function Classifier() {
  const [hasCode, setHasCode] = useState(true);
  const [proxy, setProxy] = useState(false);
  // Size slider is logarithmic (20 → 2000 bytes) so the ≤127-byte sweeper range gets real travel.
  const [pos, setPos] = useState(36);
  const size = Math.round(20 * Math.pow(100, pos / 100));
  const markPos = Math.round((100 * Math.log(127 / 20)) / Math.log(100));
  const [reuse, setReuse] = useState(1);
  const sid = useId(), rid = useId();
  const r = classify(hasCode, proxy, size, reuse);

  return (
    <div className="rounded-panel border border-bn-night-line bg-bn-night-2 shadow-bn-3 overflow-hidden">
      <div className="px-5 sm:px-6 h-12 flex items-center border-b border-bn-night-line font-mono text-[11px] uppercase tracking-[0.12em] text-bn-fog-2">
        Try the classifier
      </div>
      <div className="p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          <Toggle on={hasCode} set={setHasCode}>Has code</Toggle>
          <Toggle on={proxy} set={setProxy} disabled={!hasCode}>EIP-1167 proxy</Toggle>
        </div>
        <Slider id={sid} label="Bytecode size" value={pos} display={`${size} bytes`} set={setPos} min={0} max={100} disabled={!hasCode || proxy} mark={markPos} markLabel="127" />
        <Slider id={rid} label="Wallets delegating to it" value={reuse} set={setReuse} min={1} max={12} disabled={!hasCode || proxy} mark={3} />

        <div className="rounded-data border border-bn-night-line bg-bn-night px-4 py-4" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-bn-fog-2">Label</span>
            <Tag tone={r.tone} onNight>{r.label}</Tag>
          </div>
          <p className="m-0 mt-2.5 text-[14px] leading-relaxed text-bn-fog-2">{r.why}</p>
        </div>
        <p className="m-0 text-[12.5px] text-bn-fog-2">
          <span className="text-bn-ember-glow font-mono">confirmed-thief</span> never comes from these rules. It is added by hand, with a published source.
        </p>
      </div>
    </div>
  );
}

function Toggle({ on, set, disabled, children }: { on: boolean; set: (v: boolean) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button role="switch" aria-checked={on} disabled={disabled} onClick={() => set(!on)}
      className={`bn-focus inline-flex items-center gap-2 h-9 pl-2 pr-3.5 rounded-full border text-[13px] transition-colors disabled:opacity-40 ${on ? "border-bn-fog/40 text-bn-fog" : "border-bn-night-line text-bn-fog-2 hover:text-bn-fog"}`}>
      <span className={`relative h-5 w-8 rounded-full transition-colors ${on ? "bg-bn-fog" : "bg-bn-night-line"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-base ${on ? "left-[14px] bg-bn-night" : "left-0.5 bg-bn-fog-2"}`} />
      </span>
      {children}
    </button>
  );
}

function Slider({ id, label, value, display, set, min, max, disabled, mark, markLabel }: { id: string; label: string; value: number; display?: string; set: (n: number) => void; min: number; max: number; disabled?: boolean; mark: number; markLabel?: string }) {
  const pct = ((mark - min) / (max - min)) * 100;
  return (
    <div className={disabled ? "opacity-40" : ""}>
      <label htmlFor={id} className="flex items-baseline justify-between text-[13px] text-bn-fog-2">
        <span>{label}</span><span className="font-mono text-bn-fog tnum">{display ?? value}</span>
      </label>
      <div className="relative">
        <input id={id} type="range" min={min} max={max} value={value} disabled={disabled} onChange={(e) => set(Number(e.target.value))} aria-valuetext={display} className="bn-range bn-range--night w-full mt-1" />
        <span className="absolute -bottom-3 font-mono text-[9.5px] text-bn-fog-2 -translate-x-1/2" style={{ left: `${pct}%` }}>{markLabel ?? mark}</span>
      </div>
    </div>
  );
}
