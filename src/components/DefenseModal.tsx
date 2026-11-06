"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, ChevronRight, Terminal, ShieldCheck } from "lucide-react";
import { shortAddr, clock } from "@/lib/format";

export type TraceStatus = "idle" | "active" | "done" | "fail";
export interface ConsoleLine { t: number; msg: string; kind?: "hot" | "ok" | "go" }

export interface DefenseTrace {
  steps: Record<"vault" | "payout" | "hijack" | "detect" | "refuse", TraceStatus>;
  lines: ConsoleLine[];
  registry: string | null;
  interact: string | null;
  vault: string | null;
  fundUSDC: string | null;
  recipientUSDC: string | null;
  vaultUSDC: string | null;
  carol: string | null;
  carolCode: string | null;
  delegate: string | null;
  attempted: string | null;
  reason: string | null;
  attackerUSDC: string | null;
}

type StepKey = keyof DefenseTrace["steps"];

const STEPS: { key: StepKey; short: string; title: string; body: string }[] = [
  {
    key: "vault",
    short: "Vault",
    title: "Funds live in a governed vault",
    body: "On Chainwall the treasury is not a bare EOA. A tenant is created through the on-chain factory: a registry of users, groups and policies, an execution engine, and a vault whose funds can only move through approved interactions.",
  },
  {
    key: "payout",
    short: "Payout",
    title: "A normal 2-of-2 payout works",
    body: "To prove the vault is live, a real payout runs end to end: Alice proposes, Bob approves, and only once the 2-of-2 treasury policy is satisfied does the transfer execute on chain.",
  },
  {
    key: "hijack",
    short: "Hijack",
    title: "Attacker hijacks a signer",
    body: "The exact same attack as the offensive demo: using a stolen key, a signer (Carol) is EIP-7702 delegated to a contract that blindly approves any signature. Carol's account code becomes 0xef0100 followed by the attacker's contract.",
  },
  {
    key: "detect",
    short: "Detect",
    title: "Chainwall detects the delegation",
    body: "When the attacker tries to act through Carol, the execution engine checks her code. A delegated EOA is exactly 23 bytes: 0xef0100 ‖ delegate. Chainwall's Delegation7702 reads that designator and knows Carol is a delegated key, not a trusted actor.",
  },
  {
    key: "refuse",
    short: "Refuse",
    title: "Attack refused — vault intact",
    body: "The forged-signature execution reverts on chain with ActorDelegated(actor, delegate). No tokens move. The vault balance is unchanged and the attacker receives nothing. Only a signer that governance has explicitly allow-listed could ever act.",
  },
];

const ORDER: StepKey[] = STEPS.map((s) => s.key);
const STATUS_LABEL: Record<TraceStatus, string> = { idle: "Pending", active: "In progress", done: "Done", fail: "Failed" };

export function DefenseModal({
  open, onClose, state, network, running,
}: {
  open: boolean;
  onClose: () => void;
  state: DefenseTrace;
  network: string;
  running: boolean;
}) {
  const { steps } = state;
  const statuses = ORDER.map((k) => steps[k]);
  const reached = statuses.reduce((acc, s, i) => (s !== "idle" ? i : acc), 0);
  const activeIdx = statuses.findIndex((s) => s === "active");
  const current = activeIdx >= 0 ? activeIdx : reached;
  const won = steps.refuse === "done";

  const [view, setView] = useState(0);
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
          <div className="absolute inset-0 bg-black/45" onClick={onClose} />

          <motion.div
            role="dialog" aria-modal="true" aria-label="Chainwall EIP-7702 defense walkthrough"
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="relative w-full max-w-[640px] max-h-[88vh] flex flex-col bg-surface border border-line rounded-card overflow-hidden"
            style={{ boxShadow: "0 24px 60px -12px rgba(0,0,0,0.35)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-line">
              <span className={`h-2 w-2 rounded-full ${running ? "bg-yellow animate-beat" : won ? "bg-up" : "bg-ink-4"}`} />
              <div className="min-w-0">
                <div className="font-semibold text-[15px] leading-none flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-up" /> Chainwall defense
                </div>
                <div className="text-ink-4 text-[11.5px] mt-1 font-mono">{network} · EIP-7702 actor guard</div>
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
                  const isShield = s.key === "detect" || s.key === "refuse";
                  return (
                    <div key={s.key} className="flex-1 flex flex-col items-center">
                      <div className="relative flex items-center justify-center w-full">
                        {i > 0 && <span className={`absolute left-0 right-1/2 top-1/2 h-px -translate-y-1/2 ${i <= reached ? "bg-ink/40" : "bg-line"}`} />}
                        {i < STEPS.length - 1 && <span className={`absolute left-1/2 right-0 top-1/2 h-px -translate-y-1/2 ${i < reached ? "bg-ink/40" : "bg-line"}`} />}
                        <button
                          onClick={() => canClick && setView(i)}
                          disabled={!canClick}
                          className={`relative z-10 h-8 w-8 grid place-items-center rounded-full text-[12px] font-semibold transition-colors ${
                            st === "done" ? (isShield ? "bg-up text-white" : "bg-ink text-surface")
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
                    <span className={stStatus === "active" ? "text-yellow" : stStatus === "done" ? "text-up" : stStatus === "fail" ? "text-down" : ""}>
                      {STATUS_LABEL[stStatus]}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-semibold tracking-tight mt-2 mb-0">{step.title}</h3>
                  <p className="text-ink-3 text-[13px] leading-relaxed mt-2 mb-0">{step.body}</p>

                  <div className="mt-4">
                    {step.key === "vault" && <VaultPanel state={state} active={stStatus === "active"} />}
                    {step.key === "payout" && <PayoutPanel state={state} active={stStatus === "active"} />}
                    {step.key === "hijack" && <CodeView carol={state.carol} code={state.carolCode} delegate={state.delegate} active={stStatus === "active"} />}
                    {step.key === "detect" && <DetectPanel carol={state.carol} delegate={state.delegate} done={stStatus === "done"} />}
                    {step.key === "refuse" && <RefusePanel state={state} active={stStatus === "active"} />}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Raw log */}
            <details className="border-t border-line group">
              <summary className="flex items-center gap-2 cursor-pointer select-none text-[11.5px] font-medium text-ink-4 hover:text-ink px-6 py-3">
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                <Terminal className="h-3.5 w-3.5" />
                On-chain log
                <span className="ml-auto font-mono text-ink-4">{state.lines.length} lines</span>
              </summary>
              <LogView lines={state.lines} />
            </details>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VaultPanel({ state, active }: { state: DefenseTrace; active: boolean }) {
  if (!state.vault && !state.registry) return <Empty>{active ? "Creating the tenant on chain…" : "No tenant yet."}</Empty>;
  return (
    <div className="flex flex-col gap-3">
      <Panel label="Chainwall tenant">
        <div className="flex flex-col gap-2">
          <AddrRow label="Registry" addr={state.registry} />
          <AddrRow label="Execution engine" addr={state.interact} />
          <AddrRow label="Vault" addr={state.vault} tag="Holds funds" />
        </div>
      </Panel>
      {state.fundUSDC && (
        <div className="rounded-data border border-line overflow-hidden">
          <Row label="Vault balance" value={`${state.fundUSDC} USDC`} last />
        </div>
      )}
    </div>
  );
}

function PayoutPanel({ state, active }: { state: DefenseTrace; active: boolean }) {
  const done = state.steps.payout === "done";
  if (!active && !done && state.steps.payout === "idle") return <Empty>The governed payout runs when the demo reaches this step.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      <Panel label="2-of-2 treasury policy">
        <div className="flex flex-col gap-2 text-[12.5px]">
          <Stage n={1} label="Alice proposes the payout" />
          <Stage n={2} label="Bob approves — threshold met" />
          <Stage n={3} label="Transfer executes on chain" />
        </div>
      </Panel>
      {done && (
        <div className="rounded-data border border-line overflow-hidden">
          <Row label="Paid to recipient" value={`${state.recipientUSDC ?? "—"} USDC`} />
          <Row label="Vault balance after" value={`${state.vaultUSDC ?? "—"} USDC`} last />
        </div>
      )}
    </div>
  );
}

function Stage({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-5 w-5 flex-none rounded-full bg-surface-fill text-ink-3 grid place-items-center font-mono text-[10px] font-semibold">{n}</span>
      <span className="text-ink-3">{label}</span>
    </div>
  );
}

function CodeView({ carol, code, delegate, active }: { carol: string | null; code?: string | null; delegate?: string | null; active: boolean }) {
  if (!code && !delegate) return <Empty>{active ? "Delegating the signer…" : "No delegation yet."}</Empty>;
  const full = code && code.length > 12 ? code : delegate ? `0xef0100${delegate.replace(/^0x/, "")}` : "0xef0100…";
  const rest = full.replace(/^0xef0100/i, "");
  return (
    <div className="flex flex-col gap-3">
      {carol && (
        <Panel label="Hijacked signer">
          <code className="font-mono text-[12.5px] text-ink">{shortAddr(carol)}</code>
        </Panel>
      )}
      <Panel label="Signer code after delegation" tag="Delegated">
        <code className="font-mono text-[12px] break-all leading-relaxed">
          <span className="text-down font-semibold">0xef0100</span>
          <span className="text-ink">{rest}</span>
        </code>
      </Panel>
    </div>
  );
}

function DetectPanel({ carol, delegate, done }: { carol: string | null; delegate: string | null; done: boolean }) {
  if (!done && !delegate) return <Empty>Waiting for the detection check…</Empty>;
  return (
    <div className="rounded-data border border-up/30 bg-up/5 px-4 py-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <ShieldCheck className="h-4 w-4 text-up" />
        <span className="text-[10px] uppercase tracking-wider font-mono font-semibold text-up">Delegation7702 · detected</span>
      </div>
      <div className="font-mono text-[12px] leading-relaxed text-ink-3">
        <div>delegateOf(<span className="text-ink">{shortAddr(carol ?? undefined)}</span>)</div>
        <div className="ml-4">= <span className="text-ink">{shortAddr(delegate ?? undefined)}</span></div>
        <div className="mt-1">isDelegated(<span className="text-ink">{shortAddr(carol ?? undefined)}</span>) = <span className="text-up font-semibold">true</span></div>
      </div>
    </div>
  );
}

function RefusePanel({ state, active }: { state: DefenseTrace; active: boolean }) {
  const done = state.steps.refuse === "done";
  if (!done) return <Empty>{active ? "Attacker is attempting the drain…" : "No attempt yet."}</Empty>;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-data border border-up/30 bg-up/5 px-4 py-3.5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-4 w-4 text-up" />
          <span className="text-[10px] uppercase tracking-wider font-mono font-semibold text-up">Reverted on chain</span>
        </div>
        <code className="font-mono text-[12px] break-all leading-relaxed text-up">{state.reason ?? "ActorDelegated"}</code>
      </div>
      <div className="rounded-data border border-line overflow-hidden">
        <Row label="Attacker tried to take" value={`${state.attempted ?? "—"} USDC`} />
        <Row label="Attacker received" value={`${state.attackerUSDC ?? "0"} USDC`} />
        <Row label="Vault balance" value={`${state.vaultUSDC ?? "—"} USDC`} safe last />
      </div>
    </div>
  );
}

function Panel({ label, tag, children }: { label: string; tag?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-data border border-line px-4 py-3.5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-wider font-mono text-ink-4">{label}</span>
        {tag && <span className="text-[10px] uppercase tracking-wider font-mono font-semibold text-ink-3">{tag}</span>}
      </div>
      {children}
    </div>
  );
}

function AddrRow({ label, addr, tag }: { label: string; addr?: string | null; tag?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-ink-4">{label}{tag && <span className="ml-2 text-[10px] uppercase tracking-wider font-mono text-up">{tag}</span>}</span>
      <code className="font-mono text-[12px] text-ink">{shortAddr(addr ?? undefined)}</code>
    </div>
  );
}

function Row({ label, value, danger, safe, last }: { label: string; value: string; danger?: boolean; safe?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${last ? "" : "border-b border-line"}`}>
      <span className="text-[12.5px] text-ink-3">{label}</span>
      <span className={`font-mono text-[13px] font-medium ${danger ? "text-down" : safe ? "text-up" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-data border border-dashed border-line px-4 py-5 text-center text-[12.5px] text-ink-4">{children}</div>;
}

function LogView({ lines }: { lines: ConsoleLine[] }) {
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
            </span>
          </div>
        ))
      )}
    </div>
  );
}
