"use client";

import { useCallback, useRef, useState } from "react";
import { ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/brand";
import { AppNav } from "./AppNav";
import { Walkthrough } from "./Walkthrough";
import { Terminal } from "./Terminal";
import { MoneyPanel, type Note } from "./MoneyPanel";
import { DEFENSE_STEPS, DefenseEvidence, type DefenseTraceState } from "./DefenseTrace";
import type { DefenseEvent } from "@/lib/defense-types";
import { num, shortAddr } from "@/lib/format";

/**
 * The Chainwall SSE backend was removed while the defense is rebuilt. Set this to true once a new
 * integration calls `defense.current.handle(event)` per step and `defense.current.finish()` at the end.
 */
const INTEGRATED = false;

const emptyTrace: DefenseTraceState = {
  steps: { vault: "idle", payout: "idle", hijack: "idle", detect: "idle", refuse: "idle" },
  lines: [], registry: null, interact: null, vault: null,
  fundUSDC: null, recipientUSDC: null, vaultUSDC: null,
  carol: null, carolCode: null, delegate: null, attempted: null, reason: null, attackerUSDC: null,
};

export function DefensePage() {
  const [usdc, setUsdc] = useState<number | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [trace, setTrace] = useState<DefenseTraceState>(emptyTrace);
  const [running, setRunning] = useState(false);
  const chain = "Arbitrum One fork";
  const noteId = useRef(0);

  const addNote = useCallback((kind: Note["kind"], title: string, sub: string) => {
    const id = ++noteId.current;
    setNotes((n) => [{ id, kind, title, sub, t: Date.now() }, ...n].slice(0, 4));
  }, []);
  const addLine = useCallback((t: number, msg: string, kind?: "hot" | "ok" | "go") => {
    setTrace((tr) => ({ ...tr, lines: [...tr.lines, { t, msg, kind }] }));
  }, []);
  const setStep = useCallback((key: keyof DefenseTraceState["steps"], status: DefenseTraceState["steps"][keyof DefenseTraceState["steps"]]) => {
    setTrace((tr) => ({ ...tr, steps: { ...tr.steps, [key]: status } }));
  }, []);
  const activate = useCallback((key: keyof DefenseTraceState["steps"]) => {
    setTrace((tr) => {
      const steps = { ...tr.steps };
      (Object.keys(steps) as (keyof DefenseTraceState["steps"])[]).forEach((k) => { if (steps[k] === "active") steps[k] = "done"; });
      steps[key] = "active";
      return { ...tr, steps };
    });
  }, []);
  const finish = useCallback(() => setRunning(false), []);

  const handle = useCallback((e: DefenseEvent) => {
    const t = e.t ?? Date.now();
    switch (e.step) {
      case "setup": setTrace((tr) => ({ ...tr, carol: e.carol ?? null })); addLine(t, e.msg ?? "", "go"); break;
      case "vault-start": activate("vault"); addLine(t, e.msg ?? "", "go"); break;
      case "vault-deployed": setTrace((tr) => ({ ...tr, registry: e.registry ?? null, interact: e.interact ?? null })); addLine(t, e.msg ?? ""); break;
      case "configure": addLine(t, e.msg ?? ""); break;
      case "vault-ready": setTrace((tr) => ({ ...tr, vault: e.vault ?? null })); addLine(t, e.msg ?? ""); break;
      case "fund":
        setTrace((tr) => ({ ...tr, fundUSDC: e.vaultUSDC ?? null }));
        setStep("vault", "done"); setUsdc(num(e.vaultUSDC ?? "0")); addLine(t, e.msg ?? "", "ok");
        break;
      case "payout-propose": activate("payout"); addLine(t, e.msg ?? "", "go"); break;
      case "payout-approve": case "payout-exec": addLine(t, e.msg ?? ""); break;
      case "payout-done":
        setTrace((tr) => ({ ...tr, recipientUSDC: e.recipientUSDC ?? null, vaultUSDC: e.vaultUSDC ?? null }));
        setStep("payout", "done"); setUsdc(num(e.vaultUSDC ?? "0")); addLine(t, e.msg ?? "", "ok");
        addNote("ok", "Payment sent", `${e.recipientUSDC ?? ""} USDC · approved by 2 of 2`);
        break;
      case "delegate": activate("hijack"); addLine(t, e.msg ?? "", "hot"); break;
      case "delegate-deploy": setTrace((tr) => ({ ...tr, delegate: e.delegate ?? null })); addLine(t, e.msg ?? "", "hot"); break;
      case "delegate-done":
        setTrace((tr) => ({ ...tr, carol: e.carol ?? tr.carol, carolCode: e.code ?? null, delegate: e.delegate ?? tr.delegate }));
        setStep("hijack", "done"); addLine(t, e.msg ?? "", "hot");
        addNote("warn", "Signer changed", "An EIP-7702 delegation was added to Carol’s account.");
        break;
      case "detect":
        activate("detect"); setStep("detect", "done");
        setTrace((tr) => ({ ...tr, carol: e.carol ?? tr.carol, delegate: e.delegate ?? tr.delegate }));
        addLine(t, e.msg ?? "", "ok");
        break;
      case "attack":
        activate("refuse");
        setTrace((tr) => ({ ...tr, attempted: e.amount ?? e.attempted ?? null }));
        addLine(t, e.msg ?? "", "hot");
        addNote("warn", "Withdrawal attempt", `${e.amount ?? ""} USDC · via Carol’s account`);
        break;
      case "refuse":
        setTrace((tr) => ({ ...tr, reason: e.reason ?? null, vaultUSDC: e.vaultUSDC ?? tr.vaultUSDC, attackerUSDC: e.attackerUSDC ?? "0", attempted: e.attempted ?? tr.attempted }));
        setStep("refuse", "done"); setUsdc(num(e.vaultUSDC ?? "0")); addLine(t, e.msg ?? "", "ok");
        addNote("ok", "Withdrawal blocked", "The vault refused a signer running someone else’s code.");
        break;
      case "done": addLine(t, e.msg ?? "", "ok"); finish(); break;
      case "error": case "fatal": case "stderr": addLine(t, e.msg ?? "", "hot"); break;
      case "closed": finish(); break;
      default: if (e.msg) addLine(t, e.msg);
    }
  }, [addLine, addNote, activate, setStep, finish]);

  // Integration seam for the rebuilt defense backend.
  const defense = useRef({ handle, finish });
  defense.current = { handle, finish };

  const reset = useCallback(() => { setNotes([]); setTrace(emptyTrace); setUsdc(null); }, []);
  const run = useCallback(() => {
    if (!INTEGRATED || running) return;
    reset(); setRunning(true);
    // TODO: start the new defense integration; it drives defense.current.handle(...)
  }, [reset, running]);

  const blocked = trace.steps.refuse === "done";
  const compromised = trace.steps.hijack === "done";

  return (
    <>
      <AppNav chain={chain} />
      <main className="max-w-page mx-auto px-4 sm:px-6 lg:px-10 pb-20">
        <header className="flex flex-wrap items-end gap-x-10 gap-y-6 pt-10 pb-8 border-b border-bn-line mb-8">
          <div className="flex-1 min-w-[18rem]">
            <h1 className="font-serif font-normal text-[clamp(2.2rem,4vw,3.2rem)] leading-none text-bn-ink m-0">Defense</h1>
            <p className="text-[16px] leading-relaxed text-bn-ink-2 mt-4 mb-0 max-w-[42rem]">
              The same stolen-key trick, aimed at money kept in a Chainwall vault instead of a plain wallet. The vault checks
              who is asking before it moves anything, so when a signer has been taken over, it says no.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2.5">
            <div className="flex gap-2.5">
              {trace.lines.length > 0 && !running && <Button variant="secondary" size="lg" onClick={reset} icon={<RotateCcw className="h-4 w-4" />}>Clear</Button>}
              <Button size="lg" onClick={run} disabled={!INTEGRATED || running} icon={<ShieldCheck className="h-4 w-4" />}>{running ? "Running…" : "Run defense"}</Button>
            </div>
            <span className="text-[12.5px] text-bn-muted">{INTEGRATED ? (running ? "Running…" : "Ready") : "Live run coming soon · read the steps below"}</span>
          </div>
        </header>

        {!INTEGRATED && (
          <div role="status" className="mb-8 rounded-panel border border-bn-amber/40 bg-bn-amber/[0.07] px-5 py-4 text-[14px] text-bn-ink-2 leading-relaxed">
            <b className="font-medium text-bn-ink">The live run is being rebuilt.</b> Until it’s back, click through the five
            steps below to see what it does. Each one describes the real transaction it sends to a local fork of Arbitrum One.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          <div className="flex flex-col gap-6 min-w-0">
            <Walkthrough
              steps={DEFENSE_STEPS}
              statuses={trace.steps}
              tone="seal"
              evidence={(k, st) => <DefenseEvidence k={k} st={st} state={trace} />}
              finale={
                <>
                  <h2 className="font-serif font-normal text-[clamp(1.6rem,2.6vw,2.1rem)] leading-tight text-bn-ink mt-2 mb-0">The vault kept its money.</h2>
                  <p className="text-[15.5px] leading-relaxed text-bn-ink-2 mt-3 mb-0 max-w-[44rem]">
                    The attacker had a valid key and a valid-looking signature, and still received nothing. A valid signature
                    is not an approved action.
                  </p>
                </>
              }
            />
            <Terminal
              lines={trace.lines} running={running} explorer={null}
              command="binonce defend --chain arbitrum-fork"
              idle={INTEGRATED ? "Waiting. Press Run defense to start." : "The live run is being rebuilt, so nothing will stream here yet."}
            />
          </div>

          <aside className="lg:sticky lg:top-24">
            <MoneyPanel
              top={{
                label: "Vault", who: "Alice, Bob, Carol · 2 of 2", address: trace.vault ? shortAddr(trace.vault) : "created during the run",
                amount: usdc, sym: "USDC", flash: blocked ? "seal" : undefined,
                status: blocked ? { text: "held", tone: "seal" } : compromised ? { text: "signer taken over", tone: "ember" } : { text: "rules on", tone: "muted" },
              }}
              bottom={{
                label: "Attacker", who: "tries to withdraw", amount: blocked ? num(trace.attackerUSDC ?? "0") : null, sym: "USDC",
                status: blocked ? { text: "got nothing", tone: "seal" } : undefined,
              }}
              flow={blocked ? "Blocked: no money moved" : "The attacker tries to move money here"}
              notes={notes}
              notesTitle="What the treasury team sees"
              notesHint="Alerts from the vault’s dashboard."
            />
          </aside>
        </div>
      </main>
    </>
  );
}
