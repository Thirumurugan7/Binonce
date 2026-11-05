"use client";

import { shortAddr, clock } from "@/lib/format";

export type TraceStatus = "idle" | "active" | "done" | "fail";
export interface ConsoleLine { t: number; msg: string; kind?: "hot" | "ok" | "go"; tx?: string }
export interface Nonces { start: number; signedUpto: number; matchIndex: number | null; show: boolean }
export interface TraceState {
  steps: Record<"sign" | "delegate" | "verify" | "sweep", TraceStatus>;
  nonces: Nonces;
  lines: ConsoleLine[];
  attackerRecv: string | null;
}

const STEP_META = [
  { key: "sign", n: "01", title: "Sign 50 authorizations", sub: "Stolen victim key, 50 consecutive nonces." },
  { key: "delegate", n: "02", title: "Broadcast delegation", sub: "Relayer sends the type-4 transaction." },
  { key: "verify", n: "03", title: "Wallet hijacked", sub: "Victim code becomes 0xef0100 + sweeper." },
  { key: "sweep", n: "04", title: "Drain to attacker", sub: "Sweeper empties the balance." },
] as const;

export function AttackTrace({ open, onClose, state }: { open: boolean; onClose: () => void; state: TraceState }) {
  const { steps, nonces, lines, attackerRecv } = state;
  return (
    <aside
      className={`fixed top-0 right-0 bottom-0 w-[440px] max-w-[92vw] z-[60] bg-night text-[#EAECEF] border-l border-night-line flex flex-col transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center gap-2.5 px-[18px] py-4 border-b border-night-line">
        <span className="text-down">◼</span>
        <b className="text-sm">Attack trace</b>
        <span className="font-mono text-[11px] text-dim-2">EIP-7702 · what&apos;s really happening</span>
        <span className="ml-auto cursor-pointer text-dim text-xl leading-none" onClick={onClose}>
          ✕
        </span>
      </div>

      <div className="overflow-auto scroll-dark px-[18px] py-4">
        <div className="flex flex-col gap-2">
          {STEP_META.map((s) => {
            const st = steps[s.key];
            return (
              <div
                key={s.key}
                className={`flex gap-3 px-3 py-[11px] border rounded-data transition-all ${
                  st === "idle" ? "opacity-45 border-night-line" : "opacity-100"
                } ${st === "active" ? "border-[#3a2f10] bg-yellow/5" : "border-night-line"}`}
              >
                <span className={`font-mono text-[11px] flex-none w-[38px] ${st === "done" ? "text-up" : st === "fail" ? "text-down" : "text-dim-2"}`}>
                  {s.n}
                </span>
                <div>
                  <div className="font-semibold text-[13px]">{s.title}</div>
                  <div className="text-dim text-[12px] mt-0.5 leading-snug">{s.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {nonces.show && (
          <div className="mt-4">
            <h5 className="m-0 mb-2.5 text-[12px] text-dim font-medium">50 authorizations — one nonce matches the account</h5>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 50 }, (_, i) => {
                const match = nonces.matchIndex === i;
                const signed = i < nonces.signedUpto;
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-chip border flex items-center justify-center font-mono text-[9px] ${
                      match
                        ? "bg-down border-down text-white font-semibold shadow-[0_0_0_2px_rgba(246,70,93,0.3)]"
                        : signed
                        ? "border-[#2d4a7a] text-[#7aa2e3] bg-night-2"
                        : "bg-night-2 border-night-line text-dim-2"
                    }`}
                  >
                    {nonces.start + i}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 font-mono text-[10.5px] text-dim-2">
              nonce {nonces.start} … {nonces.start + 49}
            </div>
          </div>
        )}

        {attackerRecv && (
          <div className="mt-3.5 px-3.5 py-3 border border-night-line rounded-data flex justify-between items-center">
            <span className="text-dim text-[12px]">Attacker received</span>
            <span className="font-mono text-[#ff6b78] font-semibold">{attackerRecv} tUSD</span>
          </div>
        )}

        <div className="mt-4 bg-night-3 border border-night-line rounded-data font-mono text-[11.5px] max-h-[240px] overflow-auto scroll-dark">
          {lines.length === 0 ? (
            <div className="px-3 py-1.5 text-dim">Waiting for a run…</div>
          ) : (
            lines.map((l, i) => (
              <div key={i} className="px-3 py-1.5 border-b border-[#0e141d] last:border-0 flex gap-2.5 leading-normal">
                <span className="text-dim-2 whitespace-nowrap">{clock(l.t)}</span>
                <span className={l.kind === "hot" ? "text-[#ff6b78]" : l.kind === "ok" ? "text-[#36d399]" : l.kind === "go" ? "text-yellow" : "text-dim"}>
                  {l.msg}
                  {l.tx ? <span className="text-[#7aa2e3]"> {shortAddr(l.tx)}</span> : null}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
