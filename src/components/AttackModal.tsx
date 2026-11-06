"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, ChevronRight, ArrowUpRight, Terminal } from "lucide-react";
import { shortAddr, clock } from "@/lib/format";

export type TraceStatus = "idle" | "active" | "done" | "fail";
export interface ConsoleLine { t: number; msg: string; kind?: "hot" | "ok" | "go"; tx?: string }
export interface Nonces { start: number; signedUpto: number; matchIndex: number | null; show: boolean }
export interface TraceState {
  steps: Record<"sign" | "delegate" | "verify" | "sweep", TraceStatus>;
  nonces: Nonces;
  lines: ConsoleLine[];
  attackerRecv: string | null;
  delegateTx?: string | null;
  delegateBlock?: number | null;
  sweepTx?: string | null;
  sweepBlock?: number | null;
  victimCode?: string | null;
  sweeperAddr?: string | null;
  arkivKey?: string | null;
}

type StepKey = keyof TraceState["steps"];

const STEPS: { key: StepKey; short: string; title: string; body: string }[] = [
  {
    key: "sign",
    short: "Sign",
    title: "Sign 50 authorizations",
    body: "Using the stolen key, the victim account signs 50 EIP-7702 authorizations at consecutive nonces. These are signatures only — no transaction, no gas, nothing on-chain yet.",
  },
  {
    key: "delegate",
    short: "Broadcast",
    title: "Broadcast the delegation",
    body: "The relayer wraps all 50 authorizations into a single type-4 transaction and broadcasts it. The relayer pays the gas; the victim never approves anything.",
  },
  {
    key: "verify",
    short: "Hijack",
    title: "Account is hijacked",
    body: "Exactly one authorization — the one at the account's current nonce — takes effect. The victim's account code becomes 0xef0100 followed by the sweeper address, so the wallet now executes the attacker's contract.",
  },
  {
    key: "sweep",
    short: "Drain",
    title: "Drain to the attacker",
    body: "The relayer calls the sweeper through the hijacked account, moving the entire token balance to the attacker in one on-chain call.",
  },
];

const ORDER: StepKey[] = STEPS.map((s) => s.key);
const STATUS_LABEL: Record<TraceStatus, string> = { idle: "Pending", active: "In progress", done: "Done", fail: "Failed" };

export function AttackModal({
  open, onClose, state, explorer, network, running,
}: {
  open: boolean;
  onClose: () => void;
  state: TraceState;
  explorer: string | null;
  network: string;
  running: boolean;
}) {
  const { steps } = state;
  const statuses = ORDER.map((k) => steps[k]);
  const reached = statuses.reduce((acc, s, i) => (s !== "idle" ? i : acc), 0);
  const activeIdx = statuses.findIndex((s) => s === "active");
  const current = activeIdx >= 0 ? activeIdx : reached;

  const [view, setView] = useState(0);
  // Auto-advance to whatever step the run is on.
  useEffect(() => { setView(current); }, [current]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const step = STEPS[view];
  const stStatus = steps[step.key];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Dim scrim — light enough to watch the balance drain behind it. */}
          <div className="absolute inset-0 bg-black/45" onClick={onClose} />

          <motion.div
            role="dialog" aria-modal="true" aria-label="EIP-7702 attack walkthrough"
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="relative w-full max-w-[640px] max-h-[88vh] flex flex-col bg-surface border border-line rounded-card overflow-hidden"
            style={{ boxShadow: "0 24px 60px -12px rgba(0,0,0,0.35)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-line">
              <span className={`h-2 w-2 rounded-full ${running ? "bg-down animate-beat" : reached === 3 && stStatus === "done" ? "bg-up" : "bg-ink-4"}`} />
              <div className="min-w-0">
                <div className="font-semibold text-[15px] leading-none">EIP-7702 attack</div>
                <div className="text-ink-4 text-[11.5px] mt-1 font-mono">{network} · type-4 transaction</div>
              </div>
              <button onClick={onClose} className="ml-auto h-8 w-8 grid place-items-center rounded-md text-ink-4 hover:text-ink hover:bg-surface-fill transition-colors">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* Stepper */}
            <div className="px-6 pt-5 pb-1">
              <div className="flex items-start">
                {STEPS.map((s, i) => {
                  const st = steps[s.key];
                  const isReached = i <= reached && st !== "idle";
                  const canClick = i <= reached;
                  return (
                    <div key={s.key} className="flex-1 flex flex-col items-center">
                      <div className="relative flex items-center justify-center w-full">
                        {i > 0 && <span className={`absolute left-0 right-1/2 top-1/2 h-px -translate-y-1/2 ${i <= reached ? "bg-ink/40" : "bg-line"}`} />}
                        {i < STEPS.length - 1 && <span className={`absolute left-1/2 right-0 top-1/2 h-px -translate-y-1/2 ${i < reached ? "bg-ink/40" : "bg-line"}`} />}
                        <button
                          onClick={() => canClick && setView(i)}
                          disabled={!canClick}
                          className={`relative z-10 h-8 w-8 grid place-items-center rounded-full text-[12px] font-semibold transition-colors ${
                            st === "done" ? "bg-ink text-surface"
                              : st === "fail" ? "bg-down text-white"
                              : st === "active" ? "bg-surface border-2 border-ink text-ink"
                              : "bg-surface border border-line text-ink-4"
                          } ${canClick ? "cursor-pointer" : "cursor-default"} ${i === view ? "ring-4 ring-ink/10" : ""}`}
                        >
                          {st === "done" ? <Check className="h-[15px] w-[15px]" strokeWidth={2.5} />
                            : st === "active" ? <Loader2 className="h-[14px] w-[14px] animate-spin" />
                            : i + 1}
                        </button>
                      </div>
                      <span className={`mt-2 text-[11px] text-center leading-tight ${i === view ? "text-ink font-semibold" : isReached ? "text-ink-3 font-medium" : "text-ink-4"}`}>
                        {s.short}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active step detail */}
            <div className="overflow-auto scroll-nice px-6 py-5 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="flex items-center gap-2.5 text-[11px] font-mono text-ink-4 uppercase tracking-wide">
                    <span>Step {view + 1} of {STEPS.length}</span>
                    <span className="h-1 w-1 rounded-full bg-ink-4/60" />
                    <span className={stStatus === "active" ? "text-down" : stStatus === "done" ? "text-up" : stStatus === "fail" ? "text-down" : ""}>
                      {STATUS_LABEL[stStatus]}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-semibold tracking-tight mt-2 mb-0">{step.title}</h3>
                  <p className="text-ink-3 text-[13px] leading-relaxed mt-2 mb-0">{step.body}</p>

                  <div className="mt-4">
                    {step.key === "sign" && <NonceGrid nonces={state.nonces} />}
                    {step.key === "delegate" && <TxCard label="Delegation transaction" hash={state.delegateTx} block={state.delegateBlock} explorer={explorer} pending={stStatus === "active"} />}
                    {step.key === "verify" && <CodeView code={state.victimCode} sweeper={state.sweeperAddr} done={stStatus === "done"} />}
                    {step.key === "sweep" && <DrainView tx={state.sweepTx} block={state.sweepBlock} explorer={explorer} recv={state.attackerRecv} arkivKey={state.arkivKey} pending={stStatus === "active"} />}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Raw log */}
            <details className="border-t border-line group">
              <summary className="flex items-center gap-2 cursor-pointer select-none text-[11.5px] font-medium text-ink-4 hover:text-ink px-6 py-3">
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                <Terminal className="h-3.5 w-3.5" />
                Transaction log
                <span className="ml-auto font-mono text-ink-4">{state.lines.length} lines</span>
              </summary>
              <LogView lines={state.lines} explorer={explorer} />
            </details>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NonceGrid({ nonces }: { nonces: Nonces }) {
  if (!nonces.show) {
    return <Empty>Signatures appear here when the run starts.</Empty>;
  }
  const matchNonce = nonces.matchIndex != null ? nonces.start + nonces.matchIndex : nonces.start;
  return (
    <div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 50 }, (_, i) => {
          const match = nonces.matchIndex === i;
          const signed = i < nonces.signedUpto;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.004, 0.15) }}
              className={`aspect-square rounded-[4px] grid place-items-center font-mono text-[9px] transition-colors ${
                match ? "bg-down text-white"
                  : signed ? "bg-surface-fill text-ink-3 border border-line"
                  : "text-ink-4 border border-line"
              }`}
            >
              {nonces.start + i}
            </motion.div>
          );
        })}
      </div>
      <p className="text-ink-4 text-[12px] leading-relaxed mt-3 mb-0">
        Nonce <span className="font-mono text-down">{matchNonce}</span> equals the account&apos;s current nonce, so it is the only authorization that takes effect. The other 49 are a fallback in case the nonce advances before broadcast.
      </p>
    </div>
  );
}

function TxCard({ label, hash, block, explorer, pending }: { label: string; hash?: string | null; block?: number | null; explorer: string | null; pending?: boolean }) {
  if (!hash) return <Empty>{pending ? "Broadcasting transaction…" : "No transaction yet."}</Empty>;
  return (
    <Panel label={label}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <TxRef hash={hash} explorer={explorer} />
        {block != null && <span className="text-[11.5px] text-ink-4 font-mono">block {block}</span>}
      </div>
    </Panel>
  );
}

function CodeView({ code, sweeper, done }: { code?: string | null; sweeper?: string | null; done?: boolean }) {
  if (!done && !code) return <Empty>Waiting for the delegation to confirm…</Empty>;
  const full = code && code.length > 12 ? code : sweeper ? `0xef0100${sweeper.replace(/^0x/, "")}` : "0xef0100…";
  const rest = full.replace(/^0xef0100/i, "");
  return (
    <Panel label="Account code after delegation" tag="Delegated">
      <code className="font-mono text-[12px] break-all leading-relaxed">
        <span className="text-down font-semibold">0xef0100</span>
        <span className="text-ink">{rest}</span>
      </code>
    </Panel>
  );
}

function DrainView({ tx, block, explorer, recv, arkivKey, pending }: { tx?: string | null; block?: number | null; explorer: string | null; recv: string | null; arkivKey?: string | null; pending?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {tx ? (
        <Panel label="Sweep transaction">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TxRef hash={tx} explorer={explorer} />
            {block != null && <span className="text-[11.5px] text-ink-4 font-mono">block {block}</span>}
          </div>
        </Panel>
      ) : (
        <Empty>{pending ? "Executing the sweep…" : "No transaction yet."}</Empty>
      )}
      {recv && (
        <div className="rounded-data border border-line overflow-hidden">
          <Row label="Victim balance after" value="0.00 tUSD" />
          <Row label="Transferred to attacker" value={`+${recv} tUSD`} danger last={!arkivKey} />
          {arkivKey && <Row label="Recorded on Arkiv" value={`${arkivKey.slice(0, 10)}…`} last />}
        </div>
      )}
    </div>
  );
}

function Panel({ label, tag, children }: { label: string; tag?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-data border border-line px-4 py-3.5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-wider font-mono text-ink-4">{label}</span>
        {tag && <span className="text-[10px] uppercase tracking-wider font-mono font-semibold text-down">{tag}</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, danger, last }: { label: string; value: string; danger?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${last ? "" : "border-b border-line"}`}>
      <span className="text-[12.5px] text-ink-3">{label}</span>
      <span className={`font-mono text-[13px] font-medium ${danger ? "text-down" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-data border border-dashed border-line px-4 py-5 text-center text-[12.5px] text-ink-4">{children}</div>;
}

function LogView({ lines, explorer }: { lines: ConsoleLine[]; explorer: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines]);
  return (
    <div ref={ref} className="max-h-[180px] overflow-auto scroll-nice bg-surface-soft border-t border-line font-mono text-[11.5px]">
      {lines.length === 0 ? (
        <div className="px-6 py-3 text-ink-4">Waiting for a run…</div>
      ) : (
        lines.map((l, i) => (
          <div key={i} className="px-6 py-1.5 flex gap-3 leading-normal border-b border-line/50 last:border-0">
            <span className="text-ink-4 whitespace-nowrap">{clock(l.t)}</span>
            <span className={l.kind === "hot" ? "text-down" : l.kind === "ok" ? "text-up" : l.kind === "go" ? "text-ink" : "text-ink-3"}>
              {l.msg}
              {l.tx ? <TxRef hash={l.tx} explorer={explorer} inline /> : null}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function TxRef({ hash, explorer, inline }: { hash: string; explorer: string | null; inline?: boolean }) {
  const short = shortAddr(hash);
  if (!explorer) return <span className={`font-mono ${inline ? "text-ink-3" : "text-[13px] text-ink"}`}>{inline ? ` ${short}` : short}</span>;
  return (
    <a
      href={`${explorer}/tx/${hash}`} target="_blank" rel="noopener noreferrer"
      className={`font-mono inline-flex items-center gap-1 hover:underline ${inline ? "text-ink-3" : "text-[13px] text-ink"}`}
    >
      {inline ? ` ${short}` : short}
      <ArrowUpRight className="h-3.5 w-3.5 text-ink-4" />
    </a>
  );
}
