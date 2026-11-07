"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ShieldCheck, ShieldAlert, Info, Search,
  ArrowUpRight, LayoutGrid, Wallet, Coins, History, Lock, Loader2, Ban, FileCode2,
} from "lucide-react";
import { money, amount, shortAddr, clock } from "@/lib/format";

/*
 * The exchange portfolio the demo plays out on. Everything shown is real: balances come from the chain,
 * history rows come from the run's own transactions. Buttons that aren't part of the demo are disabled.
 */

export interface Asset { sym: string; name: string; amt: number | null; price: number | null; priceNote?: string }
export interface PortfolioAlert { tone: "info" | "warn" | "danger" | "ok"; title: string; body?: string }
export interface HistoryRow {
  id: string; kind: "in" | "out" | "code" | "blocked";
  title: string; detail: string; amount?: string;
  status: "pending" | "done" | "refused" | "failed"; t: number; hash?: string | null;
}

/* ───────────── sidebar ───────────── */

const NAV: { label: string; icon: ReactNode; on?: boolean }[] = [
  { label: "Overview", icon: <LayoutGrid className="h-4 w-4" />, on: true },
  { label: "Spot", icon: <Wallet className="h-4 w-4" /> },
  { label: "Funding", icon: <Coins className="h-4 w-4" /> },
  { label: "Transaction history", icon: <History className="h-4 w-4" /> },
  { label: "Security", icon: <Lock className="h-4 w-4" /> },
];

export function PortfolioSidebar({ account }: { account: string }) {
  return (
    <nav aria-label="Wallet sections" className="hidden xl:flex flex-col gap-0.5 pt-1">
      <div className="px-3 pb-3 text-[12px] text-bn-muted">{account}</div>
      {NAV.map((n) => (
        <span key={n.label} aria-current={n.on ? "page" : undefined} aria-disabled={!n.on || undefined}
          className={`flex items-center gap-3 h-10 px-3 rounded-data text-[14px] ${n.on ? "bg-bn-card text-bn-ink font-medium shadow-bn-1" : "text-bn-muted"}`}>
          {n.icon}{n.label}
        </span>
      ))}
      <p className="m-0 mt-4 px-3 text-[12px] leading-relaxed text-bn-muted">
        A demo exchange view. Only Overview and Deposit work.
      </p>
    </nav>
  );
}

/* ───────────── balance ───────────── */

export function BalanceCard({
  label, address, sym, balance, usd, hidden, onToggleHidden, pnl, points, alert, security, flash, onDeposit, depositHint, busy,
}: {
  label: string; address?: string | null; sym: string;
  balance: number | null; usd: number | null; hidden: boolean; onToggleHidden: () => void;
  pnl: { delta: number; pct: number } | null; points: number[];
  alert: PortfolioAlert | null; security: { tone: "ok" | "danger"; text: string; sub: string };
  flash?: "drain" | "held"; onDeposit?: () => void; depositHint?: string; busy?: boolean;
}) {
  const hide = (s: string) => (hidden ? "••••••" : s);
  const down = pnl ? pnl.delta < 0 : false;

  return (
    <section aria-label="Estimated balance" className="rounded-panel border border-bn-line bg-bn-card shadow-bn-1">
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13.5px] text-bn-muted">
            Estimated balance
            <button onClick={onToggleHidden} className="bn-focus rounded p-0.5 hover:text-bn-ink" aria-label={hidden ? "Show balances" : "Hide balances"}>
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className={`mt-2 flex items-baseline gap-2 font-semibold tnum leading-none tracking-[-0.02em] text-[clamp(2rem,3.6vw,2.6rem)] transition-colors duration-slow ${
            flash === "drain" ? "text-bn-ember" : flash === "held" ? "text-bn-seal" : "text-bn-ink"}`}>
            {balance == null ? "—" : hide(money(balance))}
            <span className="text-[15px] font-medium text-bn-muted tracking-normal">{sym}</span>
          </div>
          <div className="mt-2 text-[13.5px] text-bn-muted tnum">≈ {usd == null ? "—" : hide(`$${money(usd)}`)}</div>
          <div className="mt-3 text-[13.5px] text-bn-muted">
            Change this session{" "}
            <span className={`font-medium tnum ${!pnl || pnl.delta === 0 ? "text-bn-ink-2" : down ? "text-bn-ember-ink" : "text-bn-seal"}`}>
              {pnl ? hide(`${pnl.delta < 0 ? "−" : "+"}$${money(Math.abs(pnl.delta))} (${pnl.pct >= 0 ? "+" : "−"}${Math.abs(pnl.pct).toFixed(2)}%)`) : "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          <div className="flex flex-wrap gap-2">
            <ExButton primary onClick={onDeposit} disabled={!onDeposit || busy} title={depositHint} icon={<ArrowDownToLine className="h-4 w-4" />}>Deposit</ExButton>
            <ExButton disabled title="Not part of the demo" icon={<ArrowUpFromLine className="h-4 w-4" />}>Withdraw</ExButton>
            <ExButton disabled title="Not part of the demo" icon={<ArrowLeftRight className="h-4 w-4" />}>Transfer</ExButton>
          </div>
          <Sparkline points={points} down={down} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {alert && (
          <motion.div key={alert.title} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <AlertBar alert={alert} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 sm:px-6 py-3.5 border-t border-bn-line text-[13px]">
        <span className="text-bn-ink">{label}</span>
        {address && <span className="font-mono text-[12px] text-bn-muted">{shortAddr(address)}</span>}
        <span className={`ml-auto inline-flex items-center gap-1.5 ${security.tone === "danger" ? "text-bn-ember-ink" : "text-bn-seal"}`} title={security.sub}>
          {security.tone === "danger" ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {security.text}
        </span>
      </div>
    </section>
  );
}

function AlertBar({ alert }: { alert: PortfolioAlert }) {
  const tone = {
    info: "bg-bn-paper-2 text-bn-ink-2 border-bn-line",
    ok: "bg-bn-seal/[0.08] text-bn-seal border-bn-seal/30",
    warn: "bg-bn-amber/[0.09] text-bn-amber border-bn-amber/35",
    danger: "bg-bn-ember/[0.09] text-bn-ember-ink border-bn-ember/35",
  }[alert.tone];
  const Icon = alert.tone === "ok" ? ShieldCheck : alert.tone === "info" ? Info : ShieldAlert;
  return (
    <div role={alert.tone === "danger" ? "alert" : "status"} className={`mx-5 sm:mx-6 mb-5 flex gap-3 rounded-data border px-4 py-3 ${tone}`}>
      <Icon className={`h-[18px] w-[18px] flex-none mt-px ${alert.tone === "danger" ? "animate-beat" : ""}`} />
      <div className="min-w-0">
        <div className="text-[14px] font-medium leading-snug">{alert.title}</div>
        {alert.body && <div className="text-[13px] mt-0.5 text-bn-ink-2">{alert.body}</div>}
      </div>
    </div>
  );
}

function ExButton({ children, icon, primary, ...rest }: { children: ReactNode; icon: ReactNode; primary?: boolean } & React.ComponentProps<"button">) {
  return (
    <button {...rest}
      className={`bn-focus inline-flex items-center gap-2 h-10 px-4 rounded-data text-[14px] font-medium transition-colors disabled:cursor-not-allowed ${
        primary ? "bg-bn-amber-glow text-black hover:brightness-105 disabled:opacity-50" : "bg-bn-paper-2 text-bn-ink hover:bg-bn-line disabled:text-bn-muted disabled:hover:bg-bn-paper-2"}`}>
      {icon}{children}
    </button>
  );
}

/** Balance over this session, drawn from the values the page actually saw. */
function Sparkline({ points, down }: { points: number[]; down: boolean }) {
  const W = 240, H = 64;
  const d = useMemo(() => {
    const p = points.length === 1 ? [points[0], points[0]] : points;
    if (p.length < 2) return null;
    const max = Math.max(...p, 1);
    const xy = p.map((v, i) => [(i / (p.length - 1)) * W, H - 4 - (v / max) * (H - 10)] as const);
    const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    return { line, area: `${line} L${W},${H} L0,${H} Z` };
  }, [points]);
  return (
    <figure className="m-0 w-full md:w-[15rem]">
      <svg viewBox={`0 0 ${W} ${H}`} className={`w-full h-16 ${down ? "text-bn-ember" : "text-bn-seal"}`} preserveAspectRatio="none" aria-hidden>
        {d ? (
          <>
            <path d={d.area} fill="currentColor" opacity={0.1} />
            <path d={d.line} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </>
        ) : <line x1="0" x2={W} y1={H - 4} y2={H - 4} stroke="currentColor" strokeDasharray="3 4" opacity={0.4} />}
      </svg>
      <figcaption className="text-[11.5px] text-bn-muted md:text-right">Balance, this session</figcaption>
    </figure>
  );
}

/* ───────────── assets ───────────── */

export function CoinBadge({ sym }: { sym: string }) {
  const tone = sym === "ETH" ? "bg-bn-info text-white" : sym.endsWith("USD") || sym === "USDC" ? "bg-bn-seal text-white" : "bg-bn-ink text-bn-paper";
  return <span className={`h-8 w-8 flex-none rounded-full grid place-items-center text-[11px] font-semibold ${tone}`} aria-hidden>{sym === "ETH" ? "Ξ" : sym.slice(0, 1)}</span>;
}

export function AssetsTable({ assets, hidden, hit }: { assets: Asset[]; hidden: boolean; hit?: { sym: string; tone: "drain" | "held" } | null }) {
  const [q, setQ] = useState("");
  const rows = assets.filter((a) => !q.trim() || `${a.sym} ${a.name}`.toLowerCase().includes(q.trim().toLowerCase()));
  const total = assets.reduce((s, a) => s + (a.amt ?? 0) * (a.price ?? 0), 0);
  const hide = (s: string) => (hidden ? "••••" : s);

  return (
    <section aria-label="Assets" className="rounded-panel border border-bn-line bg-bn-card shadow-bn-1 overflow-hidden">
      <div className="flex items-center gap-4 px-5 sm:px-6 h-14 border-b border-bn-line">
        <h2 className="m-0 text-[16px] font-medium text-bn-ink">Assets</h2>
        <label className="ml-auto flex items-center gap-2 h-9 px-3 rounded-data bg-bn-paper-2 text-bn-muted focus-within:ring-1 focus-within:ring-bn-ink/30">
          <Search className="h-3.5 w-3.5" />
          <span className="sr-only">Search assets</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="bg-transparent outline-none w-24 text-[13.5px] text-bn-ink placeholder:text-bn-muted" />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[14px] min-w-[520px]">
          <thead>
            <tr className="text-[12.5px] text-bn-muted">
              <th className="text-left font-normal px-5 sm:px-6 py-3">Coin</th>
              <th className="text-right font-normal px-4 py-3">Amount</th>
              <th className="text-right font-normal px-4 py-3">Price</th>
              <th className="text-right font-normal px-4 py-3">Value</th>
              <th className="text-left font-normal px-5 sm:px-6 py-3 w-[22%]">Allocation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const value = a.amt != null && a.price != null ? a.amt * a.price : null;
              const share = total > 0 && value != null ? value / total : 0;
              const h = hit?.sym === a.sym ? hit.tone : null;
              return (
                <tr key={a.sym} className={`border-t border-bn-line transition-colors duration-slow ${h === "drain" ? "bg-bn-ember/[0.07]" : h === "held" ? "bg-bn-seal/[0.07]" : ""}`}>
                  <td className="px-5 sm:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <CoinBadge sym={a.sym} />
                      <div>
                        <div className="font-medium text-bn-ink">{a.sym}</div>
                        <div className="text-[12.5px] text-bn-muted">{a.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-4 text-right tnum font-medium ${h === "drain" ? "text-bn-ember-ink" : "text-bn-ink"}`}>{a.amt == null ? "—" : hide(amount(a.amt, a.sym === "ETH" ? 4 : 2))}</td>
                  <td className="px-4 py-4 text-right tnum text-bn-ink-2" title={a.priceNote}>{a.price == null ? "—" : `$${money(a.price)}`}{a.priceNote && <span className="block text-[11.5px] text-bn-muted">{a.priceNote}</span>}</td>
                  <td className="px-4 py-4 text-right tnum text-bn-ink">{value == null ? "—" : hide(`$${money(value)}`)}</td>
                  <td className="px-5 sm:px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 rounded-full bg-bn-paper-2 overflow-hidden">
                        <motion.div className={`h-full rounded-full ${h === "drain" ? "bg-bn-ember" : "bg-bn-ink/70"}`} animate={{ width: `${share * 100}%` }} transition={{ duration: 0.5 }} />
                      </div>
                      <span className="w-11 text-right text-[12.5px] tnum text-bn-muted">{(share * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-[13.5px] text-bn-muted">No assets match “{q}”.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ───────────── history ───────────── */

export function TxHistory({ rows, explorer, empty }: { rows: HistoryRow[]; explorer: string | null; empty: string }) {
  return (
    <section aria-label="Recent transactions" className="rounded-panel border border-bn-line bg-bn-card shadow-bn-1 overflow-hidden">
      <div className="flex items-center px-5 sm:px-6 h-14 border-b border-bn-line">
        <h2 className="m-0 text-[16px] font-medium text-bn-ink">Recent transactions</h2>
        <span className="ml-auto text-[12.5px] text-bn-muted">this session</span>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 px-6 py-8 text-center text-[13.5px] text-bn-muted">{empty}</p>
      ) : (
        <ul className="m-0 p-0 list-none divide-y divide-bn-line">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.li key={r.id} layout initial={{ opacity: 0, backgroundColor: "rgb(var(--bn-amber-glow) / 0.18)" }} animate={{ opacity: 1, backgroundColor: "rgb(var(--bn-amber-glow) / 0)" }}
                transition={{ duration: 1.2 }} className="flex items-center gap-3.5 px-5 sm:px-6 py-3.5">
                <RowIcon kind={r.kind} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-bn-ink leading-tight">{r.title}</div>
                  <div className="text-[12.5px] text-bn-muted mt-0.5 truncate">{r.detail}</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  {r.amount && <span className={`tnum text-[14px] font-medium ${r.kind === "out" ? "text-bn-ember-ink" : r.kind === "in" ? "text-bn-seal" : "text-bn-ink"}`}>{r.amount}</span>}
                  <span className="flex items-center gap-2 text-[12px] text-bn-muted">
                    <Status s={r.status} />
                    <span className="font-mono">{clock(r.t)}</span>
                    {r.hash && (explorer
                      ? <a href={`${explorer}/tx/${r.hash}`} target="_blank" rel="noopener noreferrer" className="bn-focus rounded font-mono inline-flex items-center gap-0.5 hover:text-bn-ink underline decoration-bn-line underline-offset-2">{shortAddr(r.hash)}<ArrowUpRight className="h-3 w-3" /></a>
                      : <span className="font-mono" title={r.hash}>{shortAddr(r.hash)}</span>)}
                  </span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function RowIcon({ kind }: { kind: HistoryRow["kind"] }) {
  const map = {
    in: { c: "bg-bn-seal/10 text-bn-seal", i: <ArrowDownToLine className="h-4 w-4" /> },
    out: { c: "bg-bn-ember/10 text-bn-ember-ink", i: <ArrowUpFromLine className="h-4 w-4" /> },
    code: { c: "bg-bn-amber/10 text-bn-amber", i: <FileCode2 className="h-4 w-4" /> },
    blocked: { c: "bg-bn-seal/10 text-bn-seal", i: <Ban className="h-4 w-4" /> },
  }[kind];
  return <span className={`h-9 w-9 flex-none grid place-items-center rounded-full ${map.c}`}>{map.i}</span>;
}

function Status({ s }: { s: HistoryRow["status"] }) {
  if (s === "pending") return <span className="inline-flex items-center gap-1 text-bn-amber"><Loader2 className="h-3 w-3 animate-spin" />Pending</span>;
  if (s === "refused") return <span className="text-bn-seal">Refused</span>;
  if (s === "failed") return <span className="text-bn-ember-ink">Failed</span>;
  return <span className="text-bn-ink-2">Completed</span>;
}
