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
  { key: "sign", title: "Sign",
    now: "The stolen key signs 50 permission slips.",
    why: "Each EIP-7702 authorization says “let this wallet run the sweeper contract’s code.” They are signed offline with the leaked private key, so nothing shows up on-chain or in the owner’s app yet." },
  { key: "delegate", title: "Send",
    now: "One transaction carries all 50 to the chain.",
    why: "A relayer controlled by the attacker sends them in a single type-4 transaction and pays the fee. The owner never sees a confirmation prompt, because they aren’t the one sending." },
  { key: "verify", title: "Take over",
    now: "The wallet turns into the attacker’s contract.",
    why: "Only the authorization that matches the wallet’s current nonce takes effect; the other 49 were spares. The wallet’s code changes from empty to 0xef0100 followed by the sweeper’s address. It still has the same address and balance, but it now runs someone else’s code." },
  { key: "sweep", title: "Drain",
    now: "One call sends everything to the attacker.",
    why: "The relayer calls the wallet. Because the wallet now runs the sweeper, it reads its own balance and transfers all of it to the attacker’s hardcoded address." },
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
