"use client";

import { NightBox, KV, NightEmpty, TxRef, type TraceStatus, type ConsoleLine } from "./chain-bits";
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

export function AttackEvidence({ k, st, state, explorer }: { k: AttackKey; st: TraceStatus; state: TraceState; explorer: string | null }) {
  if (k === "sign") return <NonceGrid nonces={state.nonces} />;
  if (k === "delegate") return state.delegateTx
    ? <KV rows={[{ k: "Transaction", v: <TxRef hash={state.delegateTx} explorer={explorer} /> }, { k: "Block", v: state.delegateBlock ?? "waiting…" }, { k: "Authorizations inside", v: "50" }]} />
    : <NightEmpty>{st === "active" ? "Sending the transaction…" : "The transaction link and block number will appear here."}</NightEmpty>;
  if (k === "verify") return <CodeView code={state.victimCode} sweeper={state.sweeperAddr} done={st === "done"} />;
  if (!state.sweepTx && !state.attackerRecv) return <NightEmpty>{st === "active" ? "Sweeping the balance…" : "The sweep transaction and where the money went will appear here."}</NightEmpty>;
  return (
    <KV rows={[
      ...(state.sweepTx ? [{ k: "Sweep transaction", v: <TxRef hash={state.sweepTx} explorer={explorer} /> }] : []),
      ...(state.sweepBlock != null ? [{ k: "Block", v: state.sweepBlock }] : []),
      ...(state.attackerRecv ? [{ k: "Moved to the attacker", v: `${state.attackerRecv} tUSD`, tone: "ember" as const }] : []),
      ...(state.arkivKey ? [{ k: "Saved to Arkiv", v: `${state.arkivKey.slice(0, 10)}…` }] : []),
    ]} />
  );
}

function NonceGrid({ nonces }: { nonces: Nonces }) {
  const match = nonces.matchIndex;
  return (
    <div>
      <div className="grid grid-cols-10 gap-[4px] max-w-[460px]">
        {Array.from({ length: 50 }, (_, i) => {
          const signed = nonces.show && i < nonces.signedUpto;
          const isMatch = match === i;
          return (
            <div key={i} title={nonces.show ? `nonce ${nonces.start + i}` : `nonce n+${i}`}
              className={`aspect-square rounded-[3px] border transition-colors duration-base ${
                isMatch ? "bg-bn-ember border-bn-ember-glow"
                  : signed ? `bg-bn-fog/[0.14] border-bn-fog/25 ${match != null ? "opacity-50" : ""}`
                  : "border-bn-night-line"}`} />
          );
        })}
      </div>
      <p className="text-[13px] leading-relaxed text-bn-fog-2 mt-3 mb-0">
        {match != null
          ? <>Signed all 50. Nonce <span className="font-mono text-bn-ember-glow">{nonces.start + match}</span> is the wallet’s current nonce, so that one will take effect.</>
          : nonces.show ? <>Signed <span className="font-mono text-bn-fog">{nonces.signedUpto}</span> of 50…</>
          : <>One square per authorization. They fill in as each one is signed.</>}
      </p>
    </div>
  );
}

function CodeView({ code, sweeper, done }: { code?: string | null; sweeper?: string | null; done: boolean }) {
  const full = code && code.length > 12 ? code : sweeper ? `0xef0100${sweeper.replace(/^0x/, "")}` : null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <NightBox label="Wallet code before"><code className="font-mono text-[13px] text-bn-fog">0x</code> <span className="text-[12.5px] text-bn-fog-2">empty: a normal wallet</span></NightBox>
      {done && full ? (
        <NightBox label="Wallet code after" tag="taken over" tone="ember">
          <code className="font-mono text-[12.5px] break-all leading-relaxed"><span className="text-bn-ember-glow font-semibold">0xef0100</span><span className="text-bn-fog">{full.replace(/^0xef0100/i, "")}</span></code>
        </NightBox>
      ) : (
        <NightBox label="Wallet code after"><span className="text-[12.5px] text-bn-fog-2">Appears once the transaction lands.</span></NightBox>
      )}
    </div>
  );
}
