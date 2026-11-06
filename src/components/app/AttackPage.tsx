"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Coins, RotateCcw } from "lucide-react";
import { Button } from "@/components/brand";
import { AppNav } from "./AppNav";
import { Walkthrough } from "./Walkthrough";
import { Terminal } from "./Terminal";
import { MoneyPanel, type Note } from "./MoneyPanel";
import { ATTACK_STEPS, AttackEvidence, type TraceState } from "./AttackTrace";
import { ActivityPanel } from "./ActivityPanel";
import { MintModal } from "./MintModal";
import { SetupNotice } from "./SetupNotice";
import type { AttackEvent } from "@/lib/types";
import { num, money, shortAddr } from "@/lib/format";

const BASE = 2_500_000;
const emptyTrace: TraceState = {
  steps: { sign: "idle", delegate: "idle", verify: "idle", sweep: "idle" },
  nonces: { start: 0, signedUpto: 0, matchIndex: null, show: false },
  lines: [], attackerRecv: null, delegateTx: null, delegateBlock: null,
  sweepTx: null, sweepBlock: null, victimCode: null, sweeperAddr: null, arkivKey: null,
};
const explorerFor = (chain: string) => (chain === "Sepolia" ? "https://sepolia.etherscan.io" : null);

export function AttackPage() {
  const [tusd, setTusd] = useState(0);
  const [victim, setVictim] = useState<string | null>(null);
  const [attacker, setAttacker] = useState<string | null>(null);
  const [stolen, setStolen] = useState(0);
  const [delegated, setDelegated] = useState(false);
  const [draining, setDraining] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [trace, setTrace] = useState<TraceState>(emptyTrace);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [chain, setChain] = useState("Local anvil");
  const [arkiv, setArkiv] = useState(false);
  const [mintOpen, setMintOpen] = useState(false);
  const [activityVersion, setActivityVersion] = useState(0);

  const esRef = useRef<EventSource | null>(null);
  const nonceStart = useRef(0);
  const noteId = useRef(0);
  const rafRef = useRef<number | null>(null);
  const t0 = useRef(0);
  const tusdRef = useRef(0);
  tusdRef.current = tusd;

  // The wallet's real on-chain state: balance and whether its code is a delegation.
  const fetchBalance = useCallback(() => {
    fetch("/api/balance").then((r) => r.json()).then((c) => {
      if (!c.configured) return;
      setTusd(c.usdt ?? 0); setVictim(c.victim ?? null); setDelegated(!!c.delegated);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json())
      .then((c) => { setConfigured(!!c.configured); setChain(c.chain ?? "Local anvil"); setArkiv(!!c.arkiv); setAttacker(c.attacker ?? null); })
      .catch(() => setConfigured(false));
    fetchBalance();
    return () => esRef.current?.close();
  }, [fetchBalance]);

  const addNote = useCallback((kind: Note["kind"], title: string, sub: string) => {
    const id = ++noteId.current;
    setNotes((n) => [{ id, kind, title, sub, t: Date.now() }, ...n].slice(0, 4));
  }, []);
  const addLine = useCallback((t: number, msg: string, kind?: "hot" | "ok" | "go", tx?: string) => {
    setTrace((tr) => ({ ...tr, lines: [...tr.lines, { t, msg, kind, tx }] }));
  }, []);
  const setStep = useCallback((key: keyof TraceState["steps"], status: TraceState["steps"][keyof TraceState["steps"]]) => {
    setTrace((tr) => ({ ...tr, steps: { ...tr.steps, [key]: status } }));
  }, []);
  const activate = useCallback((key: keyof TraceState["steps"]) => {
    setTrace((tr) => {
      const steps = { ...tr.steps };
      (Object.keys(steps) as (keyof TraceState["steps"])[]).forEach((k) => { if (steps[k] === "active") steps[k] = "idle"; });
      steps[key] = "active";
      return { ...tr, steps };
    });
  }, []);

  const tween = useCallback((to: number, gain: number, dur: number, done?: () => void) => {
    const from = tusdRef.current;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setTusd(from + (to - from) * e);
      setStolen(gain * e);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else { setTusd(to); setStolen(gain); done?.(); }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const finish = useCallback(() => {
    setRunning(false);
    esRef.current?.close();
  }, []);

  const handle = useCallback((e: AttackEvent) => {
    const t = e.t ?? Date.now();
    switch (e.step) {
      case "setup":
        setTrace((tr) => ({ ...tr, sweeperAddr: e.sweeper ?? null }));
        if (e.victim) setVictim(e.victim);
        if (e.attacker) setAttacker(e.attacker);
        addLine(t, e.msg ?? "", "go");
        break;
      case "before":
        setTusd(num(e.victimTUSD ?? "0"));
        addLine(t, `${e.msg}: ${e.victimTUSD} tUSD`);
        break;
      case "sign":
        activate("sign");
        nonceStart.current = e.victimNonce ?? 1;
        setTrace((tr) => ({ ...tr, nonces: { start: e.victimNonce ?? 1, signedUpto: 0, matchIndex: null, show: true } }));
        addLine(t, e.msg ?? "", "go");
        break;
      case "sign-progress":
        setTrace((tr) => ({ ...tr, nonces: { ...tr.nonces, signedUpto: e.index ?? 0 } }));
        break;
      case "sign-done": {
        const m = e.matchingNonce != null ? e.matchingNonce - nonceStart.current : 0;
        setTrace((tr) => ({ ...tr, nonces: { ...tr.nonces, signedUpto: 50, matchIndex: m } }));
        setStep("sign", "done");
        addLine(t, e.msg ?? "", "hot");
        break;
      }
      case "delegate":
        activate("delegate");
        addLine(t, e.msg ?? "", "go");
        break;
      case "delegate-sent":
        setTrace((tr) => ({ ...tr, delegateTx: e.txHash ?? null }));
        addLine(t, "Delegation tx sent", undefined, e.txHash);
        break;
      case "delegate-mined":
        setStep("delegate", "done");
        setTrace((tr) => ({ ...tr, delegateBlock: e.block ?? null }));
        addLine(t, `Delegation confirmed in block ${e.block ?? ""}`, "ok");
        break;
      case "verify":
        if (e.delegated) {
          activate("verify");
          setStep("verify", "done");
          setTrace((tr) => ({ ...tr, victimCode: e.code ?? null }));
          setDelegated(true);
          addLine(t, e.msg ?? "", "hot");
          addNote("warn", "Security notice", "A smart-contract delegation was added to your account.");
        } else {
          setStep("verify", "fail");
          addLine(t, e.msg ?? "", "hot");
        }
        break;
      case "sweep":
        activate("sweep");
        addLine(t, e.msg ?? "", "hot");
        addNote("warn", "Withdrawal submitted", `${money(BASE)} tUSD · processing`);
        break;
      case "sweep-sent":
        setTrace((tr) => ({ ...tr, sweepTx: e.txHash ?? null }));
        addLine(t, "Sweep tx sent", undefined, e.txHash);
        break;
      case "sweep-mined":
        setStep("sweep", "done");
        setTrace((tr) => ({ ...tr, sweepBlock: e.block ?? null }));
        addLine(t, `Sweep confirmed in block ${e.block ?? ""}`, "ok");
        break;
      case "after": {
        const drained = num(e.drained ?? "") || BASE;
        setTrace((tr) => ({ ...tr, attackerRecv: e.attackerTUSD ?? null }));
        setDraining(true);
        tween(num(e.victimTUSD ?? "0"), drained, 2200, () => addNote("ok", "Withdrawal completed", `${money(drained)} tUSD sent to an external address`));
        addLine(t, `Drained ${e.drained} tUSD to the attacker`, "hot");
        break;
      }
      case "arkiv":
        setTrace((tr) => ({ ...tr, arkivKey: e.arkivKey ?? null }));
        addLine(t, `${e.msg}${e.arkivKey ? ` · ${e.arkivKey.slice(0, 10)}…` : ""}`, "ok");
        break;
      case "done":
        addLine(t, e.msg ?? "", "ok");
        setElapsed(Date.now() - t0.current);
        finish();
        fetchBalance();
        setActivityVersion((v) => v + 1);
        break;
      case "error": case "fatal": case "stderr":
        addLine(t, e.msg ?? "", "hot");
        break;
      case "closed":
        finish();
        break;
      default:
        if (e.msg) addLine(t, e.msg);
    }
  }, [addLine, addNote, activate, setStep, tween, fetchBalance, finish]);

  const clear = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setDraining(false); setNotes([]); setTrace(emptyTrace); setStolen(0); setElapsed(null);
  }, []);

  const run = useCallback(() => {
    if (running) return;
    clear();
    setRunning(true);
    t0.current = Date.now();
    const es = new EventSource("/api/run");
    esRef.current = es;
    es.onmessage = (ev) => { try { handle(JSON.parse(ev.data)); } catch { /* ignore malformed line */ } };
    es.onerror = () => { es.close(); finish(); };
  }, [running, clear, handle, finish]);

  const onMinted = useCallback((balance: number) => {
    setTusd(balance); setDraining(false);
    setActivityVersion((v) => v + 1);
    fetchBalance();
  }, [fetchBalance]);

  const explorer = explorerFor(chain);
  const ready = configured === true;
  const finished = trace.steps.sweep === "done";
  const started = trace.lines.length > 0;
  const status = configured === false ? "Chain not set up" : running ? "Running…" : finished ? "Finished" : "Ready";

  return (
    <>
      <AppNav chain={chain} />
      <main className="max-w-page mx-auto px-4 sm:px-6 lg:px-10 pb-28 lg:pb-20">
        <header className="flex flex-wrap items-end gap-x-10 gap-y-6 pt-10 pb-8 border-b border-bn-line mb-8">
          <div className="flex-1 min-w-[18rem]">
            <h1 className="font-serif font-normal text-[clamp(2.2rem,4vw,3.2rem)] leading-none text-bn-ink m-0">Attack replay</h1>
            <p className="text-[16px] leading-relaxed text-bn-ink-2 mt-4 mb-0 max-w-[42rem]">
              Replays the October 2026 Binance hot-wallet drain against a test wallet on {chain}. Press
              {" "}<b className="font-medium text-bn-ink">Launch attack</b> and follow along: the steps explain what’s
              happening, the log shows every real transaction, and the panel on the right shows where the money goes.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2.5">
            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" size="lg" onClick={() => setMintOpen(true)} disabled={!ready || running} icon={<Coins className="h-4 w-4" />}>Top up</Button>
              {started && !running && <Button variant="secondary" size="lg" onClick={clear} icon={<RotateCcw className="h-4 w-4" />}>Clear</Button>}
              <Button variant="danger" size="lg" onClick={run} disabled={!ready || running} icon={<Play className="h-4 w-4 fill-current" />}>
                {running ? "Running…" : finished ? "Run again" : "Launch attack"}
              </Button>
            </div>
            <span className="text-[12.5px] text-bn-muted">{status} · test tokens only</span>
          </div>
        </header>

        {configured === false && <SetupNotice />}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          <div className="flex flex-col gap-6 min-w-0">
            <Walkthrough
              steps={ATTACK_STEPS}
              statuses={trace.steps}
              evidence={(k, st) => <AttackEvidence k={k} st={st} state={trace} explorer={explorer} />}
              finale={
                <>
                  <h2 className="font-serif font-normal text-[clamp(1.6rem,2.6vw,2.1rem)] leading-tight text-bn-ink mt-2 mb-0">The wallet is empty.</h2>
                  <p className="text-[15.5px] leading-relaxed text-bn-ink-2 mt-3 mb-0 max-w-[44rem]">
                    {trace.attackerRecv ?? money(BASE)} tUSD went to the attacker in two transactions
                    {elapsed ? `, ${(elapsed / 1000).toFixed(1)} seconds after pressing Launch` : ""}. The owner never signed
                    anything, and their app only showed what looked like a normal withdrawal.
                  </p>
                </>
              }
            />
            <Terminal
              lines={trace.lines} running={running} explorer={explorer}
              command={`binonce attack --chain ${chain.toLowerCase().replace(/\s+/g, "-")}`}
              idle={ready ? "Waiting. Press Launch attack to start." : "Waiting for the chain. See the setup note above."}
            />
          </div>

          <aside className="lg:sticky lg:top-24">
            <MoneyPanel
              top={{
                label: "Hot wallet", who: "the victim", address: victim ? shortAddr(victim) : null,
                amount: tusd, sym: "tUSD", flash: draining ? "ember" : undefined,
                status: delegated ? { text: started ? "taken over" : "still delegated from a past run", tone: "ember" } : { text: "normal wallet", tone: "seal" },
              }}
              bottom={{
                label: "Attacker", who: "receives the sweep", address: attacker ? shortAddr(attacker) : null,
                amount: stolen, sym: "tUSD", flash: stolen > 0 ? "ember" : undefined,
              }}
              flow={finished ? "Moved by one call to the sweeper" : "If the attack works, the balance moves here"}
              notes={notes}
              notesTitle="What the owner sees"
              notesHint="Notifications the owner’s wallet app would show."
            />
          </aside>
        </div>

        <section aria-labelledby="record" className="mt-14">
          <h2 id="record" className="font-serif font-normal text-[28px] text-bn-ink m-0">Saved to Arkiv</h2>
          <p className="text-[15px] text-bn-ink-2 mt-2 mb-5 max-w-[44rem]">
            Every run, and every sweeper contract it uses, is written to a public registry on Arkiv so anyone can check
            a contract before trusting it.
          </p>
          <ActivityPanel version={activityVersion} txExplorer={explorer} />
        </section>
      </main>

      {/* Phones: keep the main action in reach. */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-bn-line bg-bn-paper/90 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <span className="text-[13.5px] text-bn-ink">{status}</span>
        <Button variant="danger" className="ml-auto" onClick={run} disabled={!ready || running}>{running ? "Running…" : "Launch attack"}</Button>
      </div>

      <MintModal open={mintOpen} onClose={() => setMintOpen(false)} onMinted={onMinted} explorer={explorer} arkiv={arkiv} />
    </>
  );
}
