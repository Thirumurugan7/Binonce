"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Nav } from "./Nav";
import { WalletRail } from "./WalletRail";
import { BalanceCard } from "./BalanceCard";
import { AssetsTable, type Asset } from "./AssetsTable";
import { Toasts, type ToastItem } from "./Toasts";
import { AttackTrace, type TraceState } from "./AttackTrace";
import { DemoBar } from "./DemoBar";
import type { AttackEvent } from "@/lib/types";
import { num, money } from "@/lib/format";

const INITIAL_ASSETS: Asset[] = [
  { sym: "USDT", name: "TetherUS", amt: 2_500_000, price: 1.0, chg: 0.01 },
  { sym: "ETH", name: "Ethereum", amt: 0, price: 3120.4, chg: -1.24 },
  { sym: "BNB", name: "BNB", amt: 0, price: 612.75, chg: 0.86 },
];
const BASE = 2_500_000;
const emptyTrace: TraceState = {
  steps: { sign: "idle", delegate: "idle", verify: "idle", sweep: "idle" },
  nonces: { start: 0, signedUpto: 0, matchIndex: null, show: false },
  lines: [],
  attackerRecv: null,
};

export function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [hidden, setHidden] = useState(false);
  const [pnl, setPnl] = useState({ text: "+ $312.80 (+0.01%)", down: false });
  const [alert, setAlert] = useState<string | null>(null);
  const [hitSym, setHitSym] = useState<string | null>(null);
  const [draining, setDraining] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trace, setTrace] = useState<TraceState>(emptyTrace);
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState(false);
  const [dbState, setDbState] = useState("READY");
  const [disabled, setDisabled] = useState(true);
  const [chain, setChain] = useState("Local anvil");

  const esRef = useRef<EventSource | null>(null);
  const nonceStart = useRef(0);
  const toastId = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => { setDisabled(!c.configured); setChain(c.chain ?? "Local anvil"); })
      .catch(() => setDisabled(true));
    return () => esRef.current?.close();
  }, []);

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
        addLine(t, e.msg ?? "", "go");
        break;
      case "before":
        addLine(t, `${e.msg}: ${e.victimTUSD} tUSD`);
        break;
      case "sign":
        openDrawer();
        activate("sign");
        nonceStart.current = e.victimNonce ?? 1;
        setTrace((tr) => ({ ...tr, nonces: { start: e.victimNonce ?? 1, signedUpto: 0, matchIndex: null, show: true } }));
        addLine(t, e.msg ?? "", "go");
        setDbState("SIGNING 50 AUTHORIZATIONS");
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
        setDbState("BROADCASTING DELEGATION");
        break;
      case "delegate-sent":
        addLine(t, "Delegation tx broadcast", undefined, e.txHash);
        break;
      case "delegate-mined":
        setStep("delegate", "done");
        addLine(t, `Delegation mined · block ${e.block ?? ""}`, "ok");
        break;
      case "verify":
        if (e.delegated) {
          activate("verify");
          setStep("verify", "done");
          addLine(t, e.msg ?? "", "hot");
          setAlert("Unusual account activity detected. A delegation was added to this wallet.");
          setDbState("ACCOUNT HIJACKED");
          addToast("warn", "Security notice", "A smart-contract delegation was added to your account.");
        } else {
          setStep("verify", "fail");
          addLine(t, e.msg ?? "", "hot");
        }
        break;
      case "sweep":
        activate("sweep");
        addLine(t, e.msg ?? "", "hot");
        setDbState("DRAINING");
        addToast("warn", "Withdrawal submitted", "USDT 2,500,000.00 · processing");
        break;
      case "sweep-sent":
        addLine(t, "Sweep tx broadcast", undefined, e.txHash);
        break;
      case "sweep-mined":
        setStep("sweep", "done");
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
  }, [addLine, addToast, activate, openDrawer, setStep, tweenUSDT]);

  const finish = useCallback(() => {
    setRunning(false);
    setLive(false);
    setDbState("ATTACK COMPLETE");
    esRef.current?.close();
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setAssets(INITIAL_ASSETS.map((a) => ({ ...a })));
    setAlert(null);
    setPnl({ text: "+ $312.80 (+0.01%)", down: false });
    setHitSym(null);
    setDraining(false);
    setToasts([]);
    setTrace(emptyTrace);
  }, []);

  const run = useCallback(() => {
    if (running) return;
    reset();
    setRunning(true);
    setLive(true);
    setDrawerOpen(true);
    setDbState("ATTACK LIVE · ON-CHAIN");
    const es = new EventSource(`/api/run`);
    esRef.current = es;
    es.onmessage = (ev) => { try { handle(JSON.parse(ev.data)); } catch {} };
    es.onerror = () => { es.close(); finish(); };
  }, [running, reset, handle, finish]);

  return (
    <>
      <Nav />
      <div className="max-w-shell mx-auto p-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 pb-20">
        <WalletRail />
        <div className="min-w-0">
          <BalanceCard usdt={usdt} total={total} hidden={hidden} draining={draining} onToggleEye={() => setHidden((h) => !h)} pnl={pnl} alert={alert} />
          <AssetsTable assets={assets} hidden={hidden} hitSym={hitSym} />
        </div>
      </div>

      <Toasts items={toasts} shifted={drawerOpen} />
      <AttackTrace open={drawerOpen} onClose={() => setDrawerOpen(false)} state={trace} />
      <DemoBar
        state={dbState}
        live={live}
        running={running}
        disabled={disabled}
        chain={chain}
        onRun={run}
        onTrace={openDrawer}
      />
    </>
  );
}
