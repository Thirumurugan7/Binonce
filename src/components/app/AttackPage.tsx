"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/brand";
import { AppNav } from "./AppNav";
import { Terminal } from "./Terminal";
import { ATTACK_STEPS, AttackEvidence, type TraceState } from "./AttackTrace";
import { RunSummary, phaseOf } from "./RunSummary";
import { StepsPanel } from "./StepsPanel";
import { PortfolioSidebar, BalanceCard, AssetsTable, TxHistory, type HistoryRow, type PortfolioAlert } from "./portfolio/Portfolio";
import { Toaster, toast } from "@/components/toast";
import { ActivityPanel } from "./ActivityPanel";
import { MintModal } from "./MintModal";
import { SetupNotice } from "./SetupNotice";
import type { AttackEvent } from "@/lib/types";
import { num, money, shortAddr } from "@/lib/format";
import { ARKIV_EXPLORER } from "@/components/landing/links";
import { useOperatorWallet } from "@/app/defense/wallet-context";
import { APP_CHAINS, whitechainTestnet } from "@/lib/demo-config";

const BASE = 2_500_000;
const emptyTrace: TraceState = {
  steps: { sign: "idle", delegate: "idle", verify: "idle", sweep: "idle" },
  nonces: { start: 0, signedUpto: 0, matchIndex: null, show: false },
  lines: [], attackerRecv: null, delegateTx: null, delegateBlock: null,
  sweepTx: null, sweepBlock: null, victimCode: null, sweeperAddr: null, arkivKey: null,
};

export function AttackPage() {
  const [tusd, setTusd] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [victim, setVictim] = useState<string | null>(null);
  const [attacker, setAttacker] = useState<string | null>(null);
  const [stolen, setStolen] = useState(0);
  const [delegated, setDelegated] = useState(false);
  const [eth, setEth] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [points, setPoints] = useState<number[]>([]);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [trace, setTrace] = useState<TraceState>(emptyTrace);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [arkiv, setArkiv] = useState(false);
  const [mintOpen, setMintOpen] = useState(false);
  const [activityVersion, setActivityVersion] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const nonceStart = useRef(0);
  const doneRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const t0 = useRef(0);
  const tusdRef = useRef(0);
  tusdRef.current = tusd;
  const attackerRef = useRef<string | null>(null);
  attackerRef.current = attacker;

  const addPoint = useCallback((v: number) => setPoints((p) => (p[p.length - 1] === v ? p : [...p, v].slice(-40))), []);
  const upsertRow = useCallback((row: HistoryRow) => {
    setHistory((h) => (h.some((r) => r.id === row.id) ? h.map((r) => (r.id === row.id ? { ...r, ...row, t: r.t } : r)) : [row, ...h]));
  }, []);
  const patchRow = useCallback((id: string, patch: Partial<HistoryRow>) => setHistory((h) => h.map((r) => (r.id === id ? { ...r, ...patch } : r))), []);

  // The connected wallet's network selects which tenant the attack targets; default Whitechain.
  const wallet = useOperatorWallet();
  const activeChainId = wallet?.connected && !wallet.wrongChain ? (wallet.chainId ?? whitechainTestnet.id) : whitechainTestnet.id;
  const activeChain = APP_CHAINS.find((c) => c.id === activeChainId) ?? whitechainTestnet;
  const chain = activeChain.name;
  const explorer = activeChain.blockExplorers.default.url;

  // The wallet's real on-chain state: balance and whether its code is a delegation.
  const fetchBalance = useCallback(() => {
    fetch(`/api/balance?chain=${activeChainId}`).then((r) => r.json()).then((c) => {
      if (!c.configured) return;
      const v = c.usdt ?? 0;
      setTusd(v); setEth(c.eth ?? null); setVictim(c.victim ?? null); setDelegated(!!c.delegated); setLoaded(true);
      setBaseline((b) => (b == null ? v : b)); addPoint(v);
    }).catch(() => {});
  }, [activeChainId, addPoint]);

  useEffect(() => {
    fetch(`/api/config?chain=${activeChainId}`).then((r) => r.json())
      .then((c) => { setConfigured(!!c.configured); setArkiv(!!c.arkiv); setAttacker(c.attacker ?? null); })
      .catch(() => setConfigured(false));
    fetchBalance();
    return () => abortRef.current?.abort();
  }, [fetchBalance, activeChainId]);

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
      else { setTusd(to); setStolen(gain); addPoint(to); done?.(); }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [addPoint]);

  const finish = useCallback(() => {
    setRunning(false);
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const txLink = useCallback((h?: string | null) => {
    return h && explorer ? { href: `${explorer}/tx/${h}`, label: `tx ${shortAddr(h)}` } : undefined;
  }, [explorer]);

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
        addLine(t, `${e.msg}: ${e.victimTUSD} USDC`);
        break;
      case "empty":
        addLine(t, e.msg ?? "", "hot");
        toast.warning({ title: "Nothing to drain yet", body: "The wallet is empty. Press Deposit to add test tUSD, then launch again." }, "empty");
        setRunning(false);
        break;
      case "sign":
        activate("sign");
        nonceStart.current = e.victimNonce ?? 1;
        setTrace((tr) => ({ ...tr, nonces: { start: e.victimNonce ?? 1, signedUpto: 0, matchIndex: null, show: true } }));
        addLine(t, e.msg ?? "", "go");
        toast.loading({ title: "Signing 50 authorizations", body: "With the stolen key, offline. Nothing is on-chain yet." }, "sign");
        break;
      case "sign-progress":
        setTrace((tr) => ({ ...tr, nonces: { ...tr.nonces, signedUpto: e.index ?? 0 } }));
        break;
      case "sign-done": {
        const m = e.matchingNonce != null ? e.matchingNonce - nonceStart.current : 0;
        setTrace((tr) => ({ ...tr, nonces: { ...tr.nonces, signedUpto: 50, matchIndex: m } }));
        setStep("sign", "done");
        addLine(t, e.msg ?? "", "hot");
        toast.success({ title: "50 authorizations signed", body: `Nonce ${e.matchingNonce ?? nonceStart.current} matches the wallet, so that one will take effect.` }, "sign");
        break;
      }
      case "delegate":
        activate("delegate");
        addLine(t, e.msg ?? "", "go");
        toast.loading({ title: "Sending the delegation", body: "One type-4 transaction carrying all 50 authorizations." }, "delegate");
        break;
      case "delegate-sent":
        setTrace((tr) => ({ ...tr, delegateTx: e.txHash ?? null }));
        addLine(t, "Delegation tx sent", undefined, e.txHash);
        upsertRow({ id: `code-${t0.current}`, kind: "code", title: "Account code change (EIP-7702)", detail: "Sent by another address, not by this wallet", status: "pending", t, hash: e.txHash ?? null });
        toast.loading({ title: "Waiting for the delegation to confirm", body: "Transaction sent. The relayer paid the gas.", link: txLink(e.txHash) }, "delegate");
        break;
      case "delegate-mined":
        setStep("delegate", "done");
        setTrace((tr) => ({ ...tr, delegateBlock: e.block ?? null }));
        patchRow(`code-${t0.current}`, { status: "done", detail: `Wallet delegated to a contract · block ${e.block ?? ""}` });
        addLine(t, `Delegation confirmed in block ${e.block ?? ""}`, "ok");
        setTrace((tr) => { toast.success({ title: "Delegation confirmed", body: `Included in block ${e.block ?? ""}.`, link: txLink(tr.delegateTx) }, "delegate"); return tr; });
        break;
      case "verify":
        if (e.delegated) {
          activate("verify");
          setStep("verify", "done");
          setTrace((tr) => ({ ...tr, victimCode: e.code ?? null }));
          setDelegated(true);
          addLine(t, e.msg ?? "", "hot");
          toast.warning({ title: "The wallet has been taken over", body: "Its code is now 0xef0100 + the sweeper’s address. It runs the attacker’s contract." }, "verify");
        } else {
          setStep("verify", "fail");
          addLine(t, e.msg ?? "", "hot");
          toast.error({ title: "The delegation didn’t take effect", body: "Check the chain supports type-4 transactions. Details are in the log." }, "verify");
        }
        break;
      case "sweep":
        activate("sweep");
        addLine(t, e.msg ?? "", "hot");
        toast.loading({ title: "Draining the wallet", body: "Calling the sweeper through the hijacked wallet." }, "sweep");
        break;
      case "sweep-sent":
        setTrace((tr) => ({ ...tr, sweepTx: e.txHash ?? null }));
        addLine(t, "Sweep tx sent", undefined, e.txHash);
        upsertRow({ id: `out-${t0.current}`, kind: "out", title: "Withdrawal · tUSD", detail: `To ${shortAddr(attackerRef.current ?? undefined)} · not approved by the owner`, amount: `-${money(tusdRef.current)}`, status: "pending", t, hash: e.txHash ?? null });
        toast.loading({ title: "Waiting for the sweep to confirm", body: "One call moves the whole balance.", link: txLink(e.txHash) }, "sweep");
        break;
      case "sweep-mined":
        setStep("sweep", "done");
        setTrace((tr) => ({ ...tr, sweepBlock: e.block ?? null }));
        addLine(t, `Sweep confirmed in block ${e.block ?? ""}`, "ok");
        break;
      case "after": {
        const drained = num(e.drained ?? "") || BASE;
        setTrace((tr) => ({ ...tr, attackerRecv: e.attackerTUSD ?? null }));
                tween(num(e.victimTUSD ?? "0"), drained, 2200);
        patchRow(`out-${t0.current}`, { status: "done", amount: `-${money(drained)}` });
        addLine(t, `Drained ${e.drained} tUSD to the attacker`, "hot");
        setTrace((tr) => { toast.warning({ title: `${money(drained)} tUSD drained`, body: "The whole balance went to the attacker in one call.", link: txLink(tr.sweepTx) }, "sweep"); return tr; });
        break;
      }
      case "arkiv":
        setTrace((tr) => ({ ...tr, arkivKey: e.arkivKey ?? null }));
        addLine(t, `${e.msg}${e.arkivKey ? ` · ${e.arkivKey.slice(0, 10)}…` : ""}`, "ok");
        toast.success({ title: "Saved to Arkiv", body: "This run and its sweeper are now in the public registry.", link: e.arkivKey ? { href: `${ARKIV_EXPLORER}/entity/${e.arkivKey}`, label: `${e.arkivKey.slice(0, 10)}…` } : undefined }, "arkiv");
        break;
      case "done":
        addLine(t, e.msg ?? "", "ok");
        doneRef.current = true;
        setElapsed(Date.now() - t0.current);
        toast.success({ title: "Replay finished", body: `Took ${((Date.now() - t0.current) / 1000).toFixed(1)} s. Every step above links to its transaction.` }, "done");
        finish();
        fetchBalance();
        setActivityVersion((v) => v + 1);
        break;
      case "error": case "fatal":
        addLine(t, e.msg ?? "", "hot");
        toast.error({ title: "The run hit an error", body: e.msg ?? "See the log for details." });
        break;
      case "stderr":
        addLine(t, e.msg ?? "", "hot");
        break;
      case "closed":
        finish();
        break;
      default:
        if (e.msg) addLine(t, e.msg);
    }
  }, [addLine, activate, setStep, tween, fetchBalance, finish, txLink, upsertRow, patchRow]);

  const clear = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTrace(emptyTrace); setStolen(0); setElapsed(null); setHistory([]);
  }, []);

  // fetch + stream reader (not EventSource: EventSource auto-reconnects on stream close, which would
  // silently start a second attack against the same victim). One run at a time; aborting tells the server to stop.
  const run = useCallback(async () => {
    if (running) return;
    clear();
    setRunning(true);
    t0.current = Date.now();
    doneRef.current = false;
    toast.clear();
    toast.info({ title: `Attack started on ${chain}`, body: "Watch the portfolio on the left; the attacker’s steps are on the right." });
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(`/api/run?chain=${activeChainId}`, { signal: ac.signal, headers: { Accept: "text/event-stream" } });
      if (!res.ok || !res.body) throw new Error(`run endpoint returned ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const f of frames) {
          const line = f.replace(/^data: /, "").trim();
          if (!line) continue;
          try { handle(JSON.parse(line)); } catch { /* skip bad frame */ }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError") && !doneRef.current) {
        toast.error({ title: "Lost the connection to the run", body: "The chain may still finish it. Refresh to see the wallet’s real balance." });
      }
    } finally {
      finish();
    }
  }, [running, clear, handle, finish, chain, activeChainId]);

  const onMinted = useCallback((balance: number) => {
    const added = balance - tusdRef.current;
    if (added > 0) upsertRow({ id: `in-${Date.now()}`, kind: "in", title: "Deposit · tUSD", detail: "Test tokens minted to this wallet", amount: `+${money(added)}`, status: "done", t: Date.now() });
    setTusd(balance); addPoint(balance);
    setActivityVersion((v) => v + 1);
    fetchBalance();
  }, [fetchBalance, upsertRow, addPoint]);

  const ready = configured === true;
  const finished = trace.steps.sweep === "done";
  const started = trace.lines.length > 0;
  const phase = phaseOf(trace.steps);
  const status = configured === false ? "Chain not set up" : running ? "Attack running…" : finished ? "Attack finished" : "Ready";
  const taken = phase >= 3 || (phase === 0 && delegated);
  const balance = loaded || started ? tusd : null;
  const empty = ready && !running && !started && balance === 0;
  const pnl = baseline != null && balance != null ? { delta: balance - baseline, pct: baseline ? ((balance - baseline) / baseline) * 100 : 0 } : null;
  const assets = [
    { sym: "tUSD", name: "Test USD", amt: balance, price: 1, priceNote: "test token" },
    { sym: "ETH", name: "Ethereum", amt: eth, price: null as number | null, priceNote: "gas only" },
  ];

  // What the exchange's own screen can tell at each moment. Signing is invisible from here — that's the point.
  const alert: PortfolioAlert | null =
    phase === 1 ? { tone: "info", title: "Nothing looks wrong yet", body: "The attacker is signing with the leaked key, offline. No exchange screen can see this step." }
    : phase === 2 ? { tone: "warn", title: "A transaction for this wallet, sent by someone else", body: "It carries an authorization signed with this wallet’s own key." }
    : phase === 3 ? { tone: "danger", title: "This wallet’s code changed", body: "It now runs an outside contract (0xef0100…). The owner was never asked to approve it." }
    : phase === 4 ? { tone: "danger", title: "Withdrawal in progress", body: "The whole tUSD balance is leaving, and the owner never signed for it." }
    : phase === 5 ? { tone: "danger", title: `${money(stolen)} tUSD left without approval`, body: "Two transactions, both sent by the attacker. The owner saw no prompt." }
    : delegated ? { tone: "warn", title: "This wallet is still delegated from an earlier run", body: "Launch runs the whole thing again from the start." }
    : null;
  const hit = phase >= 4 ? { sym: "tUSD", tone: "drain" as const } : null;

  return (
    <>
      <AppNav chain={chain} />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-28 lg:pb-20">
        {/* Demo controls, kept visually apart from the exchange UI below. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-5 border-b border-bn-line mb-6">
          <div className="min-w-0 flex-1 basis-[26rem]">
            <h1 className="m-0 text-[15px] font-medium text-bn-ink">
              Attack replay <span className="font-normal text-bn-muted">· EIP-7702 leaked-key drain, modelled on Binance, Oct 2026</span>
            </h1>
            <p className="m-0 mt-1 text-[13.5px] text-bn-ink-2 max-w-[46rem]">
              The left is a stand-in exchange portfolio. Press <b className="font-medium text-bn-ink">Launch attack</b> and watch it
              react while the panel on the right shows what the attacker is doing. Everything runs on {chain} with test tokens.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex flex-wrap gap-2.5">
              {started && !running && <Button variant="secondary" onClick={clear} icon={<RotateCcw className="h-4 w-4" />}>Clear</Button>}
              {empty
                ? <Button variant="danger" size="lg" onClick={() => setMintOpen(true)} disabled={!ready} icon={<ArrowDownToLine className="h-4 w-4" />}>Deposit to start</Button>
                : <Button variant="danger" size="lg" onClick={run} disabled={!ready || running} icon={<Play className="h-4 w-4 fill-current" />}>
                    {running ? "Running…" : finished ? "Run again" : "Launch attack"}
                  </Button>}
            </div>
            <span className="text-[12.5px] text-bn-muted">{empty ? "Wallet empty — deposit test tUSD first" : `${status} · test tokens only`}</span>
          </div>
        </div>

        {configured === false && <SetupNotice />}

        <div className="grid grid-cols-1 xl:grid-cols-[200px_minmax(0,1fr)_380px] gap-6 items-start">
          <PortfolioSidebar account="Exchange wallet · demo" />

          {/* The portfolio: what the owner would see. */}
          <div className="flex flex-col gap-5 min-w-0">
            <BalanceCard
              label="Exchange hot wallet" address={victim} sym="tUSD"
              balance={balance} usd={balance} hidden={hidden} onToggleHidden={() => setHidden((v) => !v)}
              pnl={pnl} points={points} alert={alert} flash={phase >= 4 ? "drain" : undefined}
              security={taken
                ? { tone: "danger", text: "Account compromised", sub: "This wallet runs an outside contract." }
                : { tone: "ok", text: "Normal wallet", sub: "Only this wallet’s key can move its money." }}
              onDeposit={() => setMintOpen(true)} depositHint={!ready || running ? "Available once the chain is ready and no run is active" : "Mint test tUSD to this wallet"} busy={running}
            />
            <AssetsTable assets={assets} hidden={hidden} hit={hit} />
            <TxHistory rows={history} explorer={explorer} empty="No transactions this session. Deposit test tokens or launch the attack." />
          </div>

          {/* The attacker's side: invisible to the portfolio, shown here. */}
          <aside className="flex flex-col gap-5 xl:sticky xl:top-20">
            <StepsPanel
              title="How the drain works" sub="four moves, no owner approval" tone="ember" live={running}
              intro={<>The attacker never asks the owner for anything. Open any move to see what it does and the real proof behind it.</>}
              steps={ATTACK_STEPS} statuses={trace.steps}
              evidence={(k, st) => <AttackEvidence k={k} st={st} state={trace} explorer={explorer} attacker={attacker} moved={stolen} />}
            />
            <RunSummary phase={phase} signed={trace.nonces.signedUpto} txs={(trace.delegateTx ? 1 : 0) + (trace.sweepTx ? 1 : 0)} moved={stolen} elapsed={elapsed} />
          </aside>
        </div>

        <section aria-labelledby="log" className="mt-12">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1 mb-4">
            <h2 id="log" className="font-serif font-normal text-[28px] text-bn-ink m-0">Live transaction log</h2>
            <p className="text-[15px] text-bn-ink-2 m-0">Every line is a real step on {chain}, with its transaction hash. This is the proof behind the animation above.</p>
          </div>
          <Terminal
            lines={trace.lines} running={running} explorer={explorer}
            command={`binonce attack --chain ${chain.toLowerCase().replace(/\s+/g, "-")}`}
            idle={ready ? "Waiting. Press Launch attack to start." : "Waiting for the chain. See the setup note above."}
          />
        </section>

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
        <span className="text-[13.5px] text-bn-ink">{empty ? "Deposit to start" : status}</span>
        {empty
          ? <Button variant="danger" className="ml-auto" onClick={() => setMintOpen(true)} disabled={!ready}>Deposit</Button>
          : <Button variant="danger" className="ml-auto" onClick={run} disabled={!ready || running}>{running ? "Running…" : "Launch attack"}</Button>}
      </div>

      <Toaster />
      <MintModal open={mintOpen} onClose={() => setMintOpen(false)} onMinted={onMinted} explorer={explorer} arkiv={arkiv} chainId={activeChainId} />
    </>
  );
}
