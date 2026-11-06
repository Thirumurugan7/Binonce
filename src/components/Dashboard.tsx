"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Nav } from "./Nav";
import { BalanceCard } from "./BalanceCard";
import { AssetsTable, type Asset } from "./AssetsTable";
import { Toasts, type ToastItem } from "./Toasts";
import { AttackModal, type TraceState } from "./AttackModal";
import { DemoBar } from "./DemoBar";
import type { AttackEvent } from "@/lib/types";
import { num, money } from "@/lib/format";

const INITIAL_ASSETS: Asset[] = [
  { sym: "USDT", name: "TetherUS", amt: 2_500_000, price: 1.0, chg: 0 },
  { sym: "ETH", name: "Ethereum", amt: 0, price: 3120.4, chg: 0 },
  { sym: "BNB", name: "BNB", amt: 0, price: 612.75, chg: 0 },
];
const BASE = 2_500_000;
// Real "Today's PnL" derived from the on-chain balance vs the funded baseline.
const pnlFrom = (usdt: number) => {
  const d = usdt - BASE;
  const pct = BASE ? (d / BASE) * 100 : 0;
  return { text: `${d >= 0 ? "+" : "-"} $${money(Math.abs(d))} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`, down: d < 0 };
};
const emptyTrace: TraceState = {
  steps: { sign: "idle", delegate: "idle", verify: "idle", sweep: "idle" },
  nonces: { start: 0, signedUpto: 0, matchIndex: null, show: false },
  lines: [],
  attackerRecv: null,
  delegateTx: null,
  delegateBlock: null,
  sweepTx: null,
  sweepBlock: null,
  victimCode: null,
  sweeperAddr: null,
};

// Block explorer base for the active chain (tx links in the walkthrough).
const explorerFor = (chain: string) => (chain === "Sepolia" ? "https://sepolia.etherscan.io" : null);

export function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [hidden, setHidden] = useState(false);
  const [pnl, setPnl] = useState(pnlFrom(BASE));
  const [alert, setAlert] = useState<string | null>(null);
  const [hitSym, setHitSym] = useState<string | null>(null);
  const [draining, setDraining] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trace, setTrace] = useState<TraceState>(emptyTrace);
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [live, setLive] = useState(false);
  const [dbState, setDbState] = useState("Ready");
  const [disabled, setDisabled] = useState(true);
  const [chain, setChain] = useState("Local anvil");

  const esRef = useRef<EventSource | null>(null);
  const nonceStart = useRef(0);
  const toastId = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Read the victim's REAL on-chain balances and reflect them in the dashboard.
  const applyBalance = useCallback((usdt: number, eth: number) => {
    setAssets((prev) => prev.map((a) => (a.sym === "USDT" ? { ...a, amt: usdt } : a.sym === "ETH" ? { ...a, amt: eth } : a)));
    setPnl(pnlFrom(usdt));
  }, []);
  const fetchBalance = useCallback(() => {
    fetch("/api/balance")
      .then((r) => r.json())
      .then((c) => { if (c.configured) applyBalance(c.usdt ?? 0, c.eth ?? 0); })
      .catch(() => {});
  }, [applyBalance]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => { setDisabled(!c.configured); setChain(c.chain ?? "Local anvil"); })
      .catch(() => setDisabled(true));
    fetchBalance();
    return () => esRef.current?.close();
  }, [fetchBalance]);

  const usdt = assets.find((a) => a.sym === "USDT")!.amt;
  const total = assets.reduce((s, a) => s + a.amt * a.price, 0);

  const addToast = useCallback((kind: ToastItem["kind"], title: string, sub: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, title, sub }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
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

  const tweenUSDT = useCallback((to: number, dur: number, done?: () => void) => {
    const from = assets.find((a) => a.sym === "USDT")!.amt;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * e;
      setAssets((a) => a.map((x) => (x.sym === "USDT" ? { ...x, amt: v } : x)));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else { setAssets((a) => a.map((x) => (x.sym === "USDT" ? { ...x, amt: to } : x))); done?.(); }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [assets]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  const handle = useCallback((e: AttackEvent) => {
    const t = e.t ?? Date.now();
    switch (e.step) {
      case "setup":
        setTrace((tr) => ({ ...tr, sweeperAddr: e.sweeper ?? null }));
        addLine(t, e.msg ?? "", "go");
        break;
      case "before": {
        const b = num(e.victimTUSD ?? "0");
        setAssets((a) => a.map((x) => (x.sym === "USDT" ? { ...x, amt: b } : x)));
        setPnl(pnlFrom(b));
        addLine(t, `${e.msg}: ${e.victimTUSD} tUSD`);
        break;
      }
      case "sign":
        openDrawer();
        activate("sign");
        nonceStart.current = e.victimNonce ?? 1;
        setTrace((tr) => ({ ...tr, nonces: { start: e.victimNonce ?? 1, signedUpto: 0, matchIndex: null, show: true } }));
        addLine(t, e.msg ?? "", "go");
        setDbState("Signing authorizations");
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
        setDbState("Broadcasting delegation");
        break;
      case "delegate-sent":
        setTrace((tr) => ({ ...tr, delegateTx: e.txHash ?? null }));
        addLine(t, "Delegation tx broadcast", undefined, e.txHash);
        break;
      case "delegate-mined":
        setStep("delegate", "done");
        setTrace((tr) => ({ ...tr, delegateBlock: e.block ?? null }));
        addLine(t, `Delegation mined · block ${e.block ?? ""}`, "ok");
        break;
      case "verify":
        if (e.delegated) {
          activate("verify");
          setStep("verify", "done");
          setTrace((tr) => ({ ...tr, victimCode: e.code ?? null }));
          addLine(t, e.msg ?? "", "hot");
          setAlert("Unusual account activity detected. A delegation was added to this wallet.");
          setDbState("Account hijacked");
          addToast("warn", "Security notice", "A smart-contract delegation was added to your account.");
        } else {
          setStep("verify", "fail");
          addLine(t, e.msg ?? "", "hot");
        }
        break;
      case "sweep":
        activate("sweep");
        addLine(t, e.msg ?? "", "hot");
        setDbState("Draining balance");
        addToast("warn", "Withdrawal submitted", "USDT 2,500,000.00 · processing");
        break;
      case "sweep-sent":
        setTrace((tr) => ({ ...tr, sweepTx: e.txHash ?? null }));
        addLine(t, "Sweep tx broadcast", undefined, e.txHash);
        break;
      case "sweep-mined":
        setStep("sweep", "done");
        setTrace((tr) => ({ ...tr, sweepBlock: e.block ?? null }));
        addLine(t, `Sweep mined · block ${e.block ?? ""}`, "ok");
        break;
      case "after": {
        const drained = num(e.drained ?? "") || BASE;
        setTrace((tr) => ({ ...tr, attackerRecv: e.attackerTUSD ?? null }));
        setHitSym("USDT");
        setDraining(true);
        setPnl({ text: `- $${money(drained)} (-100.00%)`, down: true });
        tweenUSDT(num(e.victimTUSD ?? "0"), 2600, () =>
          addToast("ok", "Withdrawal completed", `USDT ${money(drained)} sent to external address`)
        );
        addLine(t, `Drained ${e.drained} tUSD to attacker`, "hot");
        break;
      }
      case "done":
        addLine(t, e.msg ?? "", "ok");
        finish();
        fetchBalance();
        break;
      case "error":
      case "fatal":
      case "stderr":
        addLine(t, e.msg ?? "", "hot");
        break;
      case "closed":
        finish();
        break;
      default:
        if (e.msg) addLine(t, e.msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLine, addToast, activate, openDrawer, setStep, tweenUSDT, fetchBalance]);

  const finish = useCallback(() => {
    setRunning(false);
    setLive(false);
    setDbState("Attack complete");
    esRef.current?.close();
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setAlert(null);
    setHitSym(null);
    setDraining(false);
    setToasts([]);
    setTrace(emptyTrace);
    fetchBalance();
  }, [fetchBalance]);

  const doReset = useCallback(async () => {
    if (running || resetting) return;
    setResetting(true);
    try {
      const r = await fetch("/api/reset", { method: "POST" }).then((x) => x.json());
      if (!r.ok) console.error("reset failed:", r.error);
    } catch (e) {
      console.error("reset failed:", e);
    }
    setResetting(false);
    reset(); // clears the trace/alert/toasts and re-reads the fresh victim's balance
  }, [running, resetting, reset]);

  const run = useCallback(() => {
    if (running) return;
    reset();
    setRunning(true);
    setLive(true);
    setDrawerOpen(true);
    setDbState("Running on-chain");
    const es = new EventSource(`/api/run`);
    esRef.current = es;
    es.onmessage = (ev) => { try { handle(JSON.parse(ev.data)); } catch {} };
    es.onerror = () => { es.close(); finish(); };
  }, [running, reset, handle, finish]);

  return (
    <>
      <Nav />
      <div className="max-w-shell mx-auto px-5 sm:px-6 py-8 pb-28">
        <div className="bg-surface border border-line rounded-card shadow-card p-5 sm:p-6">
          <BalanceCard usdt={usdt} total={total} hidden={hidden} draining={draining} onToggleEye={() => setHidden((h) => !h)} pnl={pnl} alert={alert} />
        </div>
        <AssetsTable assets={assets} hidden={hidden} hitSym={hitSym} />
      </div>

      <Toasts items={toasts} />
      <AttackModal open={drawerOpen} onClose={() => setDrawerOpen(false)} state={trace} explorer={explorerFor(chain)} network={chain} running={running} />
      <DemoBar
        state={dbState}
        live={live}
        running={running}
        disabled={disabled}
        chain={chain}
        onRun={run}
        onTrace={openDrawer}
        onReset={doReset}
        resetting={resetting}
      />
    </>
  );
}
