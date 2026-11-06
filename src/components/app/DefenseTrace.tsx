"use client";

import { ShieldCheck } from "lucide-react";
import { shortAddr } from "@/lib/format";
import { NightBox, KV, NightEmpty, type TraceStatus, type ConsoleLine } from "./chain-bits";
import type { Step } from "./Walkthrough";

export interface DefenseTraceState {
  steps: Record<"vault" | "payout" | "hijack" | "detect" | "refuse", TraceStatus>;
  lines: ConsoleLine[];
  registry: string | null; interact: string | null; vault: string | null;
  fundUSDC: string | null; recipientUSDC: string | null; vaultUSDC: string | null;
  carol: string | null; carolCode: string | null; delegate: string | null;
  attempted: string | null; reason: string | null; attackerUSDC: string | null;
}
export type DefenseKey = keyof DefenseTraceState["steps"];

export const DEFENSE_STEPS: Step<DefenseKey>[] = [
  { key: "vault", title: "Vault",
    now: "The money goes into a vault with rules.",
    why: "Instead of sitting in a wallet that obeys any signature, the funds sit in a Chainwall vault. It only moves money through actions its policy already approves, and it checks who is asking every time." },
  { key: "payout", title: "Payout",
    now: "A normal payment still works.",
    why: "Alice proposes a payment, Bob approves it, and because the 2-of-2 rule is met, the vault pays out. Rules don’t get in the way of real use." },
  { key: "hijack", title: "Hijack",
    now: "The attacker takes over one of the signers.",
    why: "Exactly the same trick as the attack page: with Carol’s stolen key, her account is delegated to a contract that says yes to any signature. Her code becomes 0xef0100 followed by that contract." },
  { key: "detect", title: "Detect",
    now: "The vault notices Carol isn’t really Carol any more.",
    why: "Before acting for a signer, Chainwall reads the signer’s code. Seeing 0xef0100 means the account now runs someone else’s contract, so it can no longer be trusted as a person." },
  { key: "refuse", title: "Refuse",
    now: "The withdrawal is refused. Nothing moves.",
    why: "The call reverts with ActorDelegated before any signature is even checked. The vault balance stays the same and the attacker gets nothing." },
];

export function DefenseEvidence({ k, st, state }: { k: DefenseKey; st: TraceStatus; state: DefenseTraceState }) {
  if (k === "vault") return state.vault || state.registry
    ? <KV rows={[{ k: "Registry", v: shortAddr(state.registry ?? undefined) }, { k: "Execution engine", v: shortAddr(state.interact ?? undefined) }, { k: "Vault", v: shortAddr(state.vault ?? undefined) }, ...(state.fundUSDC ? [{ k: "Vault balance", v: `${state.fundUSDC} USDC` }] : [])]} />
    : <NightEmpty>{st === "active" ? "Creating the vault…" : "Vault, registry and engine addresses will appear here."}</NightEmpty>;
  if (k === "payout") return state.recipientUSDC
    ? <KV rows={[{ k: "Paid to the recipient", v: `${state.recipientUSDC} USDC` }, { k: "Vault balance after", v: `${state.vaultUSDC ?? "—"} USDC` }]} />
    : <NightEmpty>Alice proposes → Bob approves → payment executes. Amounts appear here.</NightEmpty>;
  if (k === "hijack") {
    const d = state.carolCode && state.carolCode.length > 12 ? state.carolCode.replace(/^0xef0100/i, "") : state.delegate?.replace(/^0x/, "");
    return d
      ? <NightBox label={`Carol’s code (${shortAddr(state.carol ?? undefined)})`} tag="delegated" tone="ember"><code className="font-mono text-[12.5px] break-all"><span className="text-bn-ember-glow font-semibold">0xef0100</span><span className="text-bn-fog">{d}</span></code></NightBox>
      : <NightEmpty>Carol’s new account code will appear here.</NightEmpty>;
  }
  if (k === "detect") return st === "done" || state.delegate
    ? <NightBox label="Chainwall’s check" tag="caught" tone="seal">
        <div className="font-mono text-[12.5px] leading-relaxed text-bn-fog-2">
          <div>isDelegated(carol) = <span className="text-bn-seal-glow">true</span></div>
          <div>delegateOf(carol) = <span className="text-bn-fog">{shortAddr(state.delegate ?? undefined)}</span></div>
        </div>
      </NightBox>
    : <NightEmpty>The result of the vault’s check on Carol will appear here.</NightEmpty>;
  return st === "done"
    ? <div className="flex flex-col gap-3">
        <NightBox label="Transaction reverted" tone="seal"><code className="font-mono text-[13px] text-bn-seal-glow inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{state.reason ?? "ActorDelegated"}</code></NightBox>
        <KV rows={[{ k: "Attacker tried to take", v: `${state.attempted ?? "—"} USDC` }, { k: "Attacker received", v: `${state.attackerUSDC ?? "0"} USDC` }, { k: "Vault balance", v: `${state.vaultUSDC ?? "—"} USDC`, tone: "seal" }]} />
      </div>
    : <NightEmpty>The revert reason and final balances will appear here.</NightEmpty>;
}
