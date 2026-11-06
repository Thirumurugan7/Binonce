"use client";

import type { TraceStatus, ConsoleLine } from "./chain-bits";
import type { Step } from "./Walkthrough";

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
