"use client";

import { useCallback, useMemo, useState } from "react";
import { ShieldCheck, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/brand";
import { AppNav } from "./AppNav";
import { StepsPanel } from "./StepsPanel";
import { BalanceCard, AssetsTable, TxHistory, PortfolioSidebar, type HistoryRow, type PortfolioAlert } from "./portfolio/Portfolio";
import { DEFENSE_STEPS, DefenseEvidence, type DefenseTraceState, type DefenseKey } from "./DefenseTrace";
import { Toaster, toast } from "@/components/toast";

/**
 * The defense, shown on the same portfolio UI as the attack — this time the money sits in a
 * Chainwall vault. The live on-chain run was stripped while the backend is rebuilt, so this is a
 * guided walkthrough: step through it and watch the vault refuse the exact trick that drained the
 * wallet on the attack page. Amounts are illustrative; the attack page is the one on a real chain.
 */

const FUNDED = 1_000_000;
const PAYOUT = 120_000;
const AFTER = FUNDED - PAYOUT;
const T0 = Date.UTC(2026, 9, 29, 9, 0, 0); // fixed timeline so the history reads sensibly
const addr = (h: string) => h;
const VAULT = addr("0x5a11fac3b0c0ffee00000000000000000000d0c5");
const CAROL = addr("0xca401f00000000000000000000000000000000ab");
const DELEGATE = addr("0x5weeep00000000000000000000000000000000ff");

// Full vault state at each step of the walkthrough, 0 = nothing done yet … 5 = refused.
type Phase = 0 | 1 | 2 | 3 | 4 | 5;
const STEP_PHASE: Record<DefenseKey, Phase> = { vault: 1, payout: 2, hijack: 3, detect: 4, refuse: 5 };

export function DefensePage() {
  const [phase, setPhase] = useState<Phase>(0);
  const chain = "Chainwall vault · walkthrough";

  const trace: DefenseTraceState = useMemo(() => ({
    steps: {
      vault: phase >= 1 ? "done" : "idle",
      payout: phase >= 2 ? "done" : phase === 1 ? "active" : "idle",
      hijack: phase >= 3 ? "done" : phase === 2 ? "active" : "idle",
      detect: phase >= 4 ? "done" : phase === 3 ? "active" : "idle",
      refuse: phase >= 5 ? "done" : phase === 4 ? "active" : "idle",
    },
    lines: [],
    registry: phase >= 1 ? "0x9e915700000000000000000000000000000000c7" : null,
    interact: phase >= 1 ? "0x1n73rac700000000000000000000000000000e9" : null,
    vault: phase >= 1 ? VAULT : null,
    fundUSDC: phase >= 1 ? String(FUNDED) : null,
    recipientUSDC: phase >= 2 ? String(PAYOUT) : null,
    vaultUSDC: phase >= 5 ? String(AFTER) : phase >= 2 ? String(AFTER) : phase >= 1 ? String(FUNDED) : null,
    carol: phase >= 3 ? CAROL : null,
    carolCode: phase >= 3 ? `0xef0100${DELEGATE.replace(/^0x/, "")}` : null,
    delegate: phase >= 3 ? DELEGATE : null,
    attempted: phase >= 4 ? String(AFTER) : null,
    reason: phase >= 5 ? "ActorDelegated" : null,
    attackerUSDC: phase >= 5 ? "0" : null,
  }), [phase]);

  // Only advance when the current step is clicked through; keeps the demo deliberate.
  const next = useCallback(() => {
    setPhase((p) => {
      const np = Math.min(5, p + 1) as Phase;
      const toastByPhase: Record<number, () => void> = {
        1: () => toast.success({ title: "Vault created", body: `${FUNDED.toLocaleString()} USDC behind a 2-of-2 policy.` }),
        2: () => toast.success({ title: "Payout executed", body: `${PAYOUT.toLocaleString()} USDC, approved by 2 of 2.` }),
        3: () => toast.warning({ title: "A signer was taken over", body: "Carol’s account now runs an outside contract." }),
        4: () => toast.info({ title: "Chainwall spotted it", body: "Carol’s code starts with 0xef0100." }),
        5: () => toast.success({ title: "Withdrawal refused", body: "ActorDelegated. The attacker received nothing." }),
      };
      toastByPhase[np]?.();
      return np;
    });
  }, []);
  const reset = useCallback(() => { setPhase(0); toast.clear(); }, []);

  const balance = phase === 0 ? null : phase >= 2 ? AFTER : FUNDED;
  const compromised = phase >= 3 && phase < 5;
  const blocked = phase >= 5;

  const history: HistoryRow[] = [];
  if (phase >= 5) history.push({ id: "refuse", kind: "blocked", title: "Withdrawal refused · USDC", detail: "A signer running outside code was turned away (ActorDelegated)", amount: `${AFTER.toLocaleString()}`, status: "refused", t: T0 + 4000 });
  if (phase >= 2) history.push({ id: "payout", kind: "out", title: "Payment · USDC", detail: "Proposed by Alice, approved by Bob — 2 of 2", amount: `-${PAYOUT.toLocaleString()}`, status: "done", t: T0 + 2000, hash: null });
  if (phase >= 1) history.push({ id: "fund", kind: "in", title: "Vault funded · USDC", detail: "Deposited into the Chainwall vault", amount: `+${FUNDED.toLocaleString()}`, status: "done", t: T0, hash: null });

  const alert: PortfolioAlert | null =
    phase === 2 ? { tone: "ok", title: "Normal payment went through", body: "The 2-of-2 rule was met, so the vault paid out. Rules don’t block real use." }
    : phase === 3 ? { tone: "warn", title: "A vault signer was taken over", body: "Carol’s account was delegated to an outside contract — the same trick as the attack page." }
    : phase === 4 ? { tone: "info", title: "The vault checked who was asking", body: "Before acting for Carol, it read her code and saw 0xef0100 — not a person any more." }
    : phase === 5 ? { tone: "ok", title: "Attack refused · funds untouched", body: "A valid signature isn’t an approved action. The attacker received nothing." }
    : null;
  const hit = blocked ? { sym: "USDC", tone: "held" as const } : null;

  return (
    <>
      <AppNav chain={chain} />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-5 border-b border-bn-line mb-6">
          <div className="min-w-0 flex-1 basis-[26rem]">
            <h1 className="m-0 text-[15px] font-medium text-bn-ink">
              Defense <span className="font-normal text-bn-muted">· the same trick, aimed at a Chainwall vault</span>
            </h1>
            <p className="m-0 mt-1 text-[13.5px] text-bn-ink-2 max-w-[46rem]">
              The money sits in a vault that checks who is asking before it moves anything. Step through it and watch the
              vault refuse the exact drain that emptied the wallet on the attack page.
            </p>
          </div>
          <span className="text-[12.5px] text-bn-muted self-end">{phase === 0 ? "Not started" : phase >= 5 ? "Finished" : `Step ${phase} of 5`} · illustrative amounts</span>
        </div>

        <div role="status" className="mb-6 rounded-data border border-bn-line bg-bn-paper-2/60 px-4 py-2.5 text-[13px] text-bn-ink-2">
          Walkthrough only — the live on-chain defense run is being rebuilt. Numbers here are illustrative; the attack page is the one that runs on a real chain.
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[200px_minmax(0,1fr)_380px] gap-6 items-start">
          <PortfolioSidebar account="Treasury vault · demo" />

          <div className="flex flex-col gap-5 min-w-0">
            <BalanceCard
              label="Chainwall vault" address={phase >= 1 ? VAULT : null} sym="USDC"
              balance={balance} usd={balance} hidden={false} onToggleHidden={() => {}}
              pnl={phase >= 2 ? { delta: -PAYOUT, pct: (-PAYOUT / FUNDED) * 100 } : null}
              points={phase === 0 ? [] : phase >= 2 ? [FUNDED, AFTER] : [FUNDED]}
              alert={alert} flash={blocked ? "held" : undefined}
              security={compromised
                ? { tone: "danger", text: "A signer is compromised", sub: "One signer runs outside code; the vault stops trusting it." }
                : { tone: "ok", text: blocked ? "Held by policy" : "Guarded by a 2-of-2 policy", sub: "The vault checks who is asking before it moves money." }}
            />
            <AssetsTable
              assets={[{ sym: "USDC", name: "USD Coin", amt: balance, price: 1, priceNote: "illustrative" }]}
              hidden={false} hit={hit}
            />
            <TxHistory rows={history} explorer={null} empty="Nothing yet. Start the walkthrough to fund the vault." />
          </div>

          <aside className="flex flex-col gap-5 xl:sticky xl:top-20">
            <StepsPanel
              title="How the vault refuses it" sub="Chainwall, step by step" tone="seal" live={phase > 0 && phase < 5}
              intro={<>Same stolen-key trick as the attack page. Open any step to see what the vault does and why the drain fails.</>}
              steps={DEFENSE_STEPS} statuses={trace.steps}
              evidence={(k, st) => <DefenseEvidence k={k} st={st} state={trace} />}
              footer={
                <div className="flex flex-col gap-3">
                  <p className="m-0 flex items-start gap-2.5 text-[13px] leading-snug text-bn-fog-2">
                    <span className={`mt-1.5 h-2 w-2 rounded-full flex-none ${blocked ? "bg-bn-seal-glow" : "bg-bn-fog-2/50"}`} aria-hidden />
                    {blocked ? "The vault kept its money. A valid signature is not an approved action." : "Step through to the end to see the vault refuse the attack."}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {phase < 5
                      ? <Button variant="inverse" onClick={next} icon={<ArrowRight className="h-4 w-4" />}>{phase === 0 ? "Start walkthrough" : "Next step"}</Button>
                      : <Button variant="inverse" onClick={reset} icon={<ShieldCheck className="h-4 w-4" />}>Run it again</Button>}
                    {phase > 0 && phase < 5 && <Button variant="inverse-ghost" onClick={reset} icon={<RotateCcw className="h-4 w-4" />}>Restart</Button>}
                  </div>
                </div>
              }
            />
          </aside>
        </div>
      </main>
      <Toaster />
    </>
  );
}
