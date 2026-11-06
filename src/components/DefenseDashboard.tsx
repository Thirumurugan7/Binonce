"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Nav } from "./Nav";
import { BalanceCard } from "./BalanceCard";
import { AssetsTable, type Asset } from "./AssetsTable";
import { Toasts, type ToastItem } from "./Toasts";
import { DefenseModal, type DefenseTrace } from "./DefenseModal";
import { DefenseBar } from "./DefenseBar";
import type { DefenseEvent } from "@/lib/defense-types";
import { num } from "@/lib/format";

const INITIAL_ASSETS: Asset[] = [
  { sym: "USDC", name: "USD Coin", amt: 0, price: 1.0, chg: 0 },
  { sym: "ETH", name: "Ethereum", amt: 0, price: 3120.4, chg: 0 },
  { sym: "BNB", name: "BNB", amt: 0, price: 612.75, chg: 0 },
];

const emptyTrace: DefenseTrace = {
  steps: { vault: "idle", payout: "idle", hijack: "idle", detect: "idle", refuse: "idle" },
  lines: [],
  registry: null, interact: null, vault: null,
  fundUSDC: null, recipientUSDC: null, vaultUSDC: null,
  carol: null, carolCode: null, delegate: null,
  attempted: null, reason: null, attackerUSDC: null,
};

const NEUTRAL_PNL = { text: "$0.00 (0.00%)", down: false };

export function DefenseDashboard() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [hidden, setHidden] = useState(false);
  const [pnl, setPnl] = useState(NEUTRAL_PNL);
  const [alert, setAlert] = useState<string | null>(null);
  const [tone, setTone] = useState<"danger" | "safe">("safe");
  const [hitSym, setHitSym] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trace, setTrace] = useState<DefenseTrace>(emptyTrace);
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState(false);
  const [dbState, setDbState] = useState("Ready");
  const [disabled, setDisabled] = useState(true);
  const [chain, setChain] = useState("Local fork");

  const esRef = useRef<EventSource | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    fetch("/api/defense-config")
      .then((r) => r.json())
      .then((c) => { setDisabled(!c.configured); setChain(c.chain ?? "Local fork"); if (!c.configured) setDbState("Demo chain offline"); })
      .catch(() => setDisabled(true));
    return () => esRef.current?.close();
  }, []);

  const usdc = assets.find((a) => a.sym === "USDC")!.amt;
  const total = assets.reduce((s, a) => s + a.amt * a.price, 0);

  const setUSDC = useCallback((v: number) => {
    setAssets((prev) => prev.map((a) => (a.sym === "USDC" ? { ...a, amt: v } : a)));
  }, []);

  const addToast = useCallback((kind: ToastItem["kind"], title: string, sub: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, title, sub }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const addLine = useCallback((t: number, msg: string, kind?: "hot" | "ok" | "go") => {
    setTrace((tr) => ({ ...tr, lines: [...tr.lines, { t, msg, kind }] }));
  }, []);
  const setStep = useCallback((key: keyof DefenseTrace["steps"], status: DefenseTrace["steps"][keyof DefenseTrace["steps"]]) => {
    setTrace((tr) => ({ ...tr, steps: { ...tr.steps, [key]: status } }));
  }, []);
  const activate = useCallback((key: keyof DefenseTrace["steps"]) => {
    setTrace((tr) => {
      const steps = { ...tr.steps };
      (Object.keys(steps) as (keyof DefenseTrace["steps"])[]).forEach((k) => { if (steps[k] === "active") steps[k] = "done"; });
      steps[key] = "active";
      return { ...tr, steps };
    });
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  const finish = useCallback(() => {
    setRunning(false);
    setLive(false);
    esRef.current?.close();
  }, []);

  const handle = useCallback((e: DefenseEvent) => {
    const t = e.t ?? Date.now();
    switch (e.step) {
      case "setup":
        setTrace((tr) => ({ ...tr, carol: e.carol ?? null }));
        addLine(t, e.msg ?? "", "go");
        setDbState("Connected to live chain");
        break;
      case "vault-start":
        activate("vault");
        addLine(t, e.msg ?? "", "go");
        setDbState("Creating governed vault");
        break;
      case "vault-deployed":
        setTrace((tr) => ({ ...tr, registry: e.registry ?? null, interact: e.interact ?? null }));
        addLine(t, e.msg ?? "");
        break;
      case "configure":
        addLine(t, e.msg ?? "");
        break;
      case "vault-ready":
        setTrace((tr) => ({ ...tr, vault: e.vault ?? null }));
        addLine(t, e.msg ?? "");
        break;
      case "fund": {
        const v = num(e.vaultUSDC ?? "0");
        setTrace((tr) => ({ ...tr, fundUSDC: e.vaultUSDC ?? null }));
        setStep("vault", "done");
        setUSDC(v);
        setHitSym("USDC");
        setTimeout(() => setHitSym(null), 600);
        addLine(t, e.msg ?? "", "ok");
        setDbState("Vault funded");
        break;
      }
      case "payout-propose":
        activate("payout");
        addLine(t, e.msg ?? "", "go");
        setDbState("2-of-2 payout");
        break;
      case "payout-approve":
      case "payout-exec":
        addLine(t, e.msg ?? "");
        break;
      case "payout-done": {
        const v = num(e.vaultUSDC ?? "0");
        setTrace((tr) => ({ ...tr, recipientUSDC: e.recipientUSDC ?? null, vaultUSDC: e.vaultUSDC ?? null }));
        setStep("payout", "done");
        setUSDC(v);
        addLine(t, e.msg ?? "", "ok");
        setDbState("Payout settled");
        break;
      }
      case "delegate":
        activate("hijack");
        addLine(t, e.msg ?? "", "hot");
        setDbState("Signer under attack");
        break;
      case "delegate-deploy":
        setTrace((tr) => ({ ...tr, delegate: e.delegate ?? null }));
        addLine(t, e.msg ?? "", "hot");
        break;
      case "delegate-done":
        setTrace((tr) => ({ ...tr, carol: e.carol ?? tr.carol, carolCode: e.code ?? null, delegate: e.delegate ?? tr.delegate }));
        setStep("hijack", "done");
        addLine(t, e.msg ?? "", "hot");
        setTone("danger");
        setAlert("A vault signer was EIP-7702 delegated by an attacker.");
        addToast("warn", "Signer delegated", "An EIP-7702 delegation was added to a vault signer.");
        break;
      case "detect":
        activate("detect");
        setStep("detect", "done");
        setTrace((tr) => ({ ...tr, carol: e.carol ?? tr.carol, delegate: e.delegate ?? tr.delegate }));
        addLine(t, e.msg ?? "", "ok");
        setDbState("Delegation detected");
        break;
      case "attack":
        activate("refuse");
        setTrace((tr) => ({ ...tr, attempted: e.amount ?? e.attempted ?? null }));
        addLine(t, e.msg ?? "", "hot");
        setDbState("Attack attempt");
        setHitSym("USDC");
        addToast("warn", "Withdrawal attempt", `USDC ${e.amount ?? ""} · via delegated signer`);
        break;
      case "refuse": {
        const v = num(e.vaultUSDC ?? "0");
        setTrace((tr) => ({
          ...tr,
          reason: e.reason ?? null, vaultUSDC: e.vaultUSDC ?? tr.vaultUSDC,
          attackerUSDC: e.attackerUSDC ?? "0", attempted: e.attempted ?? tr.attempted,
        }));
        setStep("refuse", "done");
        setHitSym(null);
        setUSDC(v); // unchanged — the whole point
        setTone("safe");
        setAlert("Blocked by Chainwall — the delegated actor was refused on chain. Vault funds are safe.");
        addToast("ok", "Attack blocked", "Chainwall refused the delegated actor. No funds moved.");
        setDbState("Attack refused");
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
        setDbState("Run failed");
        break;
      case "closed":
        finish();
        break;
      default:
        if (e.msg) addLine(t, e.msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLine, addToast, activate, setStep, setUSDC, finish]);

  const reset = useCallback(() => {
    setAlert(null);
    setTone("safe");
    setHitSym(null);
    setToasts([]);
    setPnl(NEUTRAL_PNL);
    setTrace(emptyTrace);
    setAssets(INITIAL_ASSETS);
    setDbState("Ready");
  }, []);

  const run = useCallback(() => {
    if (running) return;
    reset();
    setRunning(true);
    setLive(true);
    setDrawerOpen(true);
    setDbState("Running on-chain");
    const es = new EventSource(`/api/defend`);
    esRef.current = es;
    es.onmessage = (ev) => { try { handle(JSON.parse(ev.data)); } catch {} };
    es.onerror = () => { es.close(); finish(); };
  }, [running, reset, handle, finish]);

  return (
    <>
      <Nav />
      <div className="max-w-shell mx-auto px-5 sm:px-6 py-8 pb-28">
        <div className="bg-surface border border-line rounded-card shadow-card p-5 sm:p-6">
          <BalanceCard
            usdt={usdc} total={total} hidden={hidden} draining={false}
            onToggleEye={() => setHidden((h) => !h)} pnl={pnl} alert={alert}
            sym="USDC" tone={tone}
          />
        </div>
        <AssetsTable assets={assets} hidden={hidden} hitSym={hitSym} />
      </div>

      <Toasts items={toasts} />
      <DefenseModal open={drawerOpen} onClose={() => setDrawerOpen(false)} state={trace} network={chain} running={running} />
      <DefenseBar
        state={dbState}
        live={live}
        running={running}
        disabled={disabled}
        chain={chain}
        onRun={run}
        onTrace={openDrawer}
        onReset={reset}
      />
    </>
  );
}
