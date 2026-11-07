"use client";

import { money, shortAddr } from "@/lib/format";
import { NightBox, KV, NightEmpty, TxRef, type TraceStatus, type ConsoleLine, type Step } from "./chain-bits";

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
export type AttackKey = keyof TraceState["steps"];

export const ATTACK_STEPS: Step<AttackKey>[] = [
  { key: "sign", title: "1 · Sign fake permissions",
    now: "The stolen key signs 50 permission slips — in secret.",
    why: "Each EIP-7702 authorization says “let this wallet run the attacker’s contract.” They’re signed offline with the leaked key, so nothing shows up on-chain or in the owner’s app yet. This is the step the portfolio on the left cannot see." },
  { key: "delegate", title: "2 · Send them to the chain",
    now: "One transaction carries all 50 to the chain.",
    why: "The attacker’s relayer sends them in a single transaction and pays the fee itself. The owner is never asked to confirm anything, because they aren’t the one sending it." },
  { key: "verify", title: "3 · Hijack the wallet",
    now: "The wallet starts running the attacker’s code.",
    why: "Only the one permission matching the wallet’s current nonce takes effect; the other 49 are spares. The wallet’s code flips from empty to 0xef0100 + the attacker’s contract. Same address, same balance — but it now obeys the attacker." },
  { key: "sweep", title: "4 · Drain it",
    now: "One call moves the whole balance out.",
    why: "The relayer pokes the wallet. Because it now runs the attacker’s contract, it reads its own balance and sends all of it to the attacker’s address in a single call." },
];

/** The proof for each attack step, read from the run's own events. */
export function AttackEvidence({ k, st, state, explorer, attacker, moved }: {
  k: AttackKey; st: TraceStatus; state: TraceState; explorer: string | null; attacker: string | null; moved: number;
}) {
  if (k === "sign") {
    const { nonces } = state;
    if (!nonces.show) return <NightEmpty>The 50 signatures appear here when the run starts.</NightEmpty>;
    const match = nonces.matchIndex;
    return (
      <div>
        <div className="grid grid-cols-10 gap-[3px]">
          {Array.from({ length: 50 }, (_, i) => (
            <span key={i} title={`nonce ${nonces.start + i}`}
              className={`aspect-square rounded-[2px] transition-colors duration-base ${
                match === i ? "bg-bn-ember-glow" : i < nonces.signedUpto ? (match != null ? "bg-bn-fog/20" : "bg-bn-fog/60") : "bg-bn-fog/[0.08]"}`} />
          ))}
        </div>
        <p className="m-0 mt-2.5 text-[12.5px] text-bn-fog-2">
          <span className="font-mono text-bn-fog">{nonces.signedUpto}</span>/50 signed
          {match != null && <> · nonce <span className="font-mono text-bn-ember-glow">{nonces.start + match}</span> matches the wallet, so that one takes effect</>}
        </p>
      </div>
    );
  }
  if (k === "delegate") return state.delegateTx
    ? <KV rows={[
        { k: "Transaction", v: <TxRef hash={state.delegateTx} explorer={explorer} /> },
        { k: "Type", v: "4 (EIP-7702)" },
        { k: "Authorizations", v: "50" },
        ...(state.delegateBlock != null ? [{ k: "Block", v: String(state.delegateBlock) }] : []),
      ]} />
    : <NightEmpty>{st === "active" ? "Sending…" : "The delegation transaction will appear here."}</NightEmpty>;
  if (k === "verify") {
    const full = state.victimCode && state.victimCode.length > 12 ? state.victimCode : state.sweeperAddr ? `0xef0100${state.sweeperAddr.replace(/^0x/, "")}` : null;
    return st === "done" && full
      ? <NightBox label="Wallet code after" tag="delegated" tone="ember">
          <code className="font-mono text-[12.5px] break-all"><span className="text-bn-ember-glow font-semibold">0xef0100</span><span className="text-bn-fog">{full.replace(/^0xef0100/i, "")}</span></code>
        </NightBox>
      : <NightEmpty>The wallet’s new code will appear here. Before: <code className="font-mono">0x</code> (empty).</NightEmpty>;
  }
  return state.sweepTx
    ? <KV rows={[
        { k: "Transaction", v: <TxRef hash={state.sweepTx} explorer={explorer} /> },
        { k: "To", v: shortAddr(attacker ?? undefined) },
        { k: "Moved", v: moved > 0 ? `${money(moved)} tUSD` : "…", tone: "ember" },
        ...(state.sweepBlock != null ? [{ k: "Block", v: String(state.sweepBlock) }] : []),
      ]} />
    : <NightEmpty>{st === "active" ? "Draining…" : "The sweep transaction will appear here."}</NightEmpty>;
}
