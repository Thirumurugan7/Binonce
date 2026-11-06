"use client";

import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Wallet, Skull, ArrowUpRight } from "lucide-react";
import { money, shortAddr } from "@/lib/format";
import { ATTACK_STEPS, type TraceState } from "./AttackTrace";

/**
 * The attack as a picture: three accounts and the two transactions between them.
 * phase 0 = not started · 1 sign · 2 send · 3 take over · 4 drain · 5 finished
 */
export type Phase = 0 | 1 | 2 | 3 | 4 | 5;

export function phaseOf(steps: TraceState["steps"]): Phase {
  if (steps.sweep === "done") return 5;
  if (steps.sweep === "active") return 4;
  if (steps.verify !== "idle") return 3;
  if (steps.delegate !== "idle") return 2;
  if (steps.sign !== "idle") return 1;
  return 0;
}

interface Props {
  phase: Phase;
  preview: boolean;
  trace: TraceState;
  victimBal: number | null;
  attackerBal: number;
  victim: string | null;
  attacker: string | null;
  explorer: string | null;
  /** wallet is still delegated from an earlier run */
  leftover?: boolean;
  onPick: (p: Phase) => void;
}

const IDLE_CAPTION = {
  now: "Three accounts. Watch the money move.",
  why: "An attacker holding the hot wallet’s leaked key, the wallet itself, and the attacker’s own wallet where the money ends up. Press Launch attack, or click a step to preview it.",
};

export function AttackStage({ phase, preview, trace, victimBal, attackerBal, victim, attacker, explorer, leftover, onPick }: Props) {
  const step = phase >= 1 ? ATTACK_STEPS[Math.min(phase, 4) - 1] : null;
  const caption = phase === 5
    ? { now: "The wallet is empty.", why: "Two transactions, no approval from the owner. The wallet still has the same address; it just runs the attacker’s code now." }
    : step ?? IDLE_CAPTION;
  const signed = preview ? (phase >= 1 ? 50 : 0) : trace.nonces.signedUpto;
  const taken = phase >= 3 || !!leftover;
  const link = (hash?: string | null) => (hash && explorer ? `${explorer}/tx/${hash}` : null);

  return (
    <section aria-label="Attack overview" className="rounded-panel border border-bn-line bg-bn-card overflow-hidden">
      {/* step pills */}
      <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6 pt-5">
        {ATTACK_STEPS.map((s, i) => {
          const p = (i + 1) as Phase;
          const done = phase > p || phase === 5;
          const on = phase === p;
          return (
            <button key={s.key} onClick={() => onPick(p)} aria-pressed={on}
              className={`bn-focus inline-flex items-center gap-2 h-9 pl-1.5 pr-3.5 rounded-full border text-[13.5px] transition-colors ${
                on ? "border-bn-ink bg-bn-ink text-bn-paper" : done ? "border-bn-line text-bn-ink" : "border-bn-line text-bn-muted hover:text-bn-ink"}`}>
              <span className={`h-6 w-6 rounded-full grid place-items-center text-[12px] ${on ? "bg-bn-paper/15" : done ? "bg-bn-ember text-white" : "bg-bn-paper-2"}`}>{i + 1}</span>
              {s.title}
            </button>
          );
        })}
        {preview && phase > 0 && <span className="ml-auto text-[12.5px] text-bn-amber">Preview · not a real run</span>}
      </div>

      {/* caption */}
      <div className="px-5 sm:px-6 pt-5 min-h-[124px]">
        <AnimatePresence mode="wait">
          <motion.div key={`${phase}-${preview}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <h2 className="m-0 font-serif font-normal text-[clamp(1.6rem,2.8vw,2.2rem)] leading-tight text-bn-ink">{caption.now}</h2>
            <p className="m-0 mt-2 text-[15px] leading-relaxed text-bn-ink-2 max-w-[52rem]">{caption.why}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* diagram */}
      <div className="p-5 sm:p-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1.15fr_auto_1fr] items-stretch gap-0">
          {/* attacker */}
          <Node icon={<KeyRound className="h-4 w-4" />} title="Attacker" sub="has the wallet’s leaked key" active={phase === 1 || phase === 2}>
            <div className="grid grid-cols-10 gap-[3px] mt-1">
              {Array.from({ length: 50 }, (_, i) => (
                <span key={i} className={`aspect-square rounded-[2px] transition-colors duration-base ${
                  i === 0 && phase >= 3 ? "bg-bn-ember" : i < signed ? (phase >= 3 ? "bg-bn-ink/15" : "bg-bn-ink/50") : "bg-bn-ink/[0.07]"}`} />
              ))}
            </div>
            <div className="mt-2.5 text-[13px] text-bn-ink-2">
              <span className="font-mono text-bn-ink tnum">{signed}</span>/50 authorizations signed
              {phase >= 3 && <span className="block text-bn-ember-ink">1 matched the wallet’s nonce and took effect</span>}
            </div>
            <div className="mt-2 text-[12.5px] text-bn-muted">A relayer it controls pays the gas.</div>
          </Node>

          <Connector
            state={phase === 2 ? "flowing" : phase > 2 ? "done" : phase === 1 ? "dashed" : "idle"}
            label={phase === 1 ? "signing offline, nothing sent yet" : phase >= 2 ? "1 transaction · 50 authorizations" : "authorizations"}
            href={link(trace.delegateTx)} hash={trace.delegateTx} tone="ink" />

          {/* victim */}
          <Node icon={<Wallet className="h-4 w-4" />} title="Hot wallet" sub={victim ? `the victim · ${shortAddr(victim)}` : "the victim"} active={phase === 3 || phase === 4} danger={taken}>
            <div className={`font-semibold tnum whitespace-nowrap text-[clamp(1.35rem,2.1vw,1.85rem)] leading-none tracking-[-0.02em] transition-colors duration-slow ${phase >= 4 ? "text-bn-ember" : "text-bn-ink"}`}>
              {victimBal == null ? "…" : money(victimBal)} <span className="text-[14px] font-medium text-bn-muted tracking-normal">USDC</span>
            </div>
            <div className={`mt-3 rounded-data px-3 py-2.5 text-[13px] transition-colors duration-slow ${taken ? "bg-bn-ember/[0.08] text-bn-ember-ink" : "bg-bn-paper-2 text-bn-ink-2"}`}>
              <span className="text-bn-muted">Code: </span>
              {taken
                ? <><code className="font-mono">0xef0100</code> + sweeper address<span className="block text-[12px] mt-0.5">{phase >= 3 ? "It now runs the attacker’s contract." : "Still delegated from an earlier run. Launching re-runs the whole attack."}</span></>
                : <><code className="font-mono">0x</code> (empty)<span className="block text-[12px] mt-0.5 text-bn-muted">A normal wallet. Only its key can move money.</span></>}
            </div>
          </Node>

          <Connector
            state={phase === 4 ? "flowing" : phase === 5 ? "done" : "idle"}
            label={phase >= 4 ? `sweepToken() · ${money(attackerBal || 2_500_000)} USDC` : "sweep"}
            href={link(trace.sweepTx)} hash={trace.sweepTx} tone="ember" />

          {/* attacker wallet */}
          <Node icon={<Skull className="h-4 w-4" />} title="Attacker’s wallet" sub={attacker ? shortAddr(attacker) : "receives everything"} active={phase === 4} danger={phase === 5}>
            <div className={`font-semibold tnum whitespace-nowrap text-[clamp(1.35rem,2.1vw,1.85rem)] leading-none tracking-[-0.02em] ${attackerBal > 0 ? "text-bn-ember" : "text-bn-ink"}`}>
              {money(attackerBal)} <span className="text-[14px] font-medium text-bn-muted tracking-normal">USDC</span>
            </div>
            <div className="mt-3 text-[13px] text-bn-muted">
              {phase === 5 ? "Received the whole balance in one call." : "Hardcoded into the sweeper contract."}
            </div>
          </Node>
        </div>
      </div>
    </section>
  );
}

function Node({ icon, title, sub, active, danger, children }: { icon: React.ReactNode; title: string; sub: string; active?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <div className={`relative rounded-data border p-4 transition-[border-color,box-shadow] duration-slow ${
      danger ? "border-bn-ember/50" : active ? "border-bn-ink/40 shadow-bn-2" : "border-bn-line"}`}>
      <div className="flex items-center gap-2">
        <span className={`h-7 w-7 rounded-full grid place-items-center ${danger ? "bg-bn-ember/10 text-bn-ember-ink" : "bg-bn-paper-2 text-bn-ink-2"}`}>{icon}</span>
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-bn-ink leading-tight">{title}</div>
          <div className="text-[12px] text-bn-muted truncate">{sub}</div>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Arrow between two accounts. Horizontal on desktop, vertical when stacked. */
function Connector({ state, label, href, hash, tone }: { state: "idle" | "dashed" | "flowing" | "done"; label: string; href: string | null; hash?: string | null; tone: "ink" | "ember" }) {
  const color = state === "idle" ? "bg-bn-line" : tone === "ember" ? "bg-bn-ember" : "bg-bn-ink";
  return (
    <div className="relative flex lg:flex-col items-center lg:justify-center gap-3 pl-8 lg:px-2 py-1 lg:py-0 lg:w-[150px]">
      <div className={`relative overflow-hidden lg:w-full lg:h-[2px] h-14 w-[2px] ${state === "dashed" ? "bn-dashed" : color}`}>
        {state === "flowing" && <span className={`absolute ${tone === "ember" ? "bg-bn-ember" : "bg-bn-ink"} rounded-full h-2 w-2 lg:top-1/2 lg:-translate-y-1/2 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 bn-packet`} />}
      </div>
      <span className="text-[12px] leading-snug text-bn-muted lg:text-center max-w-[220px] lg:max-w-[150px]">
        {label}
        {hash && (href
          ? <a href={href} target="_blank" rel="noopener noreferrer" className="bn-focus rounded block font-mono text-bn-ink underline decoration-bn-line underline-offset-2 hover:decoration-bn-ink">{shortAddr(hash)} <ArrowUpRight className="inline h-3 w-3" /></a>
          : <span className="block font-mono text-bn-ink" title={hash}>{shortAddr(hash)}</span>)}
      </span>
      <span className={`hidden lg:block absolute right-1 top-1/2 -translate-y-1/2 h-0 w-0 border-y-[5px] border-y-transparent border-l-[7px] ${state === "idle" ? "border-l-bn-line" : tone === "ember" ? "border-l-bn-ember" : "border-l-bn-ink"}`} aria-hidden />
    </div>
  );
}

/** Numbers a judge cares about, filled in live. */
export function RunSummary({ phase, signed, txs, moved, elapsed }: { phase: Phase; signed: number; txs: number; moved: number; elapsed: number | null }) {
  const started = phase > 0;
  const rows: [string, string, boolean?][] = [
    ["Approvals asked of the owner", started ? "0" : "—", true],
    ["Gas paid by the owner", started ? "0 ETH" : "—", true],
    ["Authorizations signed", started ? `${signed} (1 used)` : "—"],
    ["Transactions sent", started ? String(txs) : "—"],
    ["Moved to the attacker", phase === 5 ? `${money(moved)} USDC` : "—", phase === 5],
    ["Time from Launch", elapsed != null ? `${(elapsed / 1000).toFixed(1)} s` : "—"],
  ];
  return (
    <div className="rounded-panel border border-bn-line bg-bn-card p-5 h-full">
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
