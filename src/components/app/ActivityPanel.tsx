"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ShieldOff, Coins, Database, RefreshCw } from "lucide-react";
import { shortAddr, money } from "@/lib/format";

interface Delegation { key: string; chain: string; victim: string; delegate: string; attacker: string; drained: string; sweepTx: string; block: string; status: string; ts: string }
interface Mint { key: string; chain: string; to: string; amount: string; tx: string; block: string; ts: string }
interface Delegate { key: string; chain: string; address: string; label: string; labelSource?: string; delegatorCount: string; bytecodeHash: string; firstSeenBlock: string }
interface ActivityResp {
  enabled: boolean; writes?: boolean; error?: string; stale?: boolean; writer: string | null;
  delegations: Delegation[]; mints: Mint[]; delegates: Delegate[];
  explorer: string;
}

const hasContent = (d?: ActivityResp | null) => !!d && (d.delegations.length + d.mints.length + d.delegates.length > 0);

type Feed =
  | { kind: "attack"; key: string; ts: number; d: Delegation }
  | { kind: "mint"; key: string; ts: number; m: Mint };

export function ActivityPanel({ version, txExplorer }: { version: number; txExplorer: string | null }) {
  const [tab, setTab] = useState<"activity" | "blacklist">("activity");
  const [data, setData] = useState<ActivityResp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback((retries = 2) => {
    setLoading(true);
    fetch("/api/arkiv/activity")
      .then((r) => r.json())
      .then((d: ActivityResp) => {
        // Never blank out good data with a transient empty/errored read; retry a cold miss once.
        setData((prev) => (hasContent(prev) && !hasContent(d) ? prev : d));
        if ((!d.enabled || !hasContent(d)) && retries > 0) setTimeout(() => load(retries - 1), 1200);
      })
      .catch(() => { if (retries > 0) setTimeout(() => load(retries - 1), 1200); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, version]);

  const feed: Feed[] = data
    ? [
        ...data.delegations.map((d) => ({ kind: "attack" as const, key: d.key, ts: Number(d.ts) || 0, d })),
        ...data.mints.map((m) => ({ kind: "mint" as const, key: m.key, ts: Number(m.ts) || 0, m })),
      ].sort((a, b) => b.ts - a.ts)
    : [];

  const arkivLink = (key: string) => (data ? `${data.explorer}/entity/${key}` : "#");

  return (
    <div className="rounded-panel border border-bn-line bg-bn-card shadow-bn-1 overflow-hidden">
      <div className="flex items-center gap-5 px-5 pt-4">
        <div role="tablist" aria-label="Arkiv record" className="flex items-center gap-5">
          <Tab on={tab === "activity"} onClick={() => setTab("activity")}>Runs &amp; top-ups{data?.enabled ? <Count n={feed.length} /> : null}</Tab>
          <Tab on={tab === "blacklist"} onClick={() => setTab("blacklist")}>Blacklisted contracts{data?.enabled ? <Count n={data.delegates.length} /> : null}</Tab>
        </div>
        <div className="ml-auto flex items-center gap-2.5 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-bn-muted">
            <Database className="h-3.5 w-3.5" />
            {data?.writer ? <>written by <a className="font-mono hover:text-bn-ink underline decoration-bn-line underline-offset-2" href={`${data.explorer}/address/${data.writer}`} target="_blank" rel="noopener noreferrer">{shortAddr(data.writer)}</a></> : "Arkiv"}
          </span>
          <button onClick={() => load()} className="bn-focus h-8 w-8 grid place-items-center rounded-full text-bn-muted hover:text-bn-ink hover:bg-bn-ink/[0.06] transition-colors" aria-label="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <div className="border-t border-bn-line" />

      {!data?.enabled ? (
        <Empty>
          {loading ? "Reading the registry from Arkiv…" : data?.error ?? "Couldn’t reach Arkiv. Try refreshing."}
        </Empty>
      ) : tab === "activity" ? (
        feed.length === 0 ? (
          <Empty>No runs recorded yet.</Empty>
        ) : (
          <ul className="divide-y divide-bn-line">
            {feed.map((f) => (
              <motion.li key={f.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3.5 px-5 py-3.5">
                {f.kind === "attack" ? (
                  <>
                    <Icon danger><ShieldOff className="h-[18px] w-[18px]" /></Icon>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">Wallet drained · {money(Number(f.d.drained))} tUSD</div>
                      <div className="text-[12px] text-bn-muted font-mono truncate">{shortAddr(f.d.victim)} → {shortAddr(f.d.attacker)}</div>
                    </div>
                    <Meta ts={f.ts} tx={f.d.sweepTx} txExplorer={txExplorer} arkivLink={arkivLink(f.key)} amountClass="text-bn-ember-ink" />
                  </>
                ) : (
                  <>
                    <Icon><Coins className="h-[18px] w-[18px]" /></Icon>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">Minted {money(Number(f.m.amount))} tUSD</div>
                      <div className="text-[12px] text-bn-muted font-mono truncate">to {shortAddr(f.m.to)}</div>
                    </div>
                    <Meta ts={f.ts} tx={f.m.tx} txExplorer={txExplorer} arkivLink={arkivLink(f.key)} />
                  </>
                )}
              </motion.li>
            ))}
          </ul>
        )
      ) : data.delegates.length === 0 ? (
        <Empty>No delegate contracts flagged yet. Each attack adds the sweeper it used to the registry.</Empty>
      ) : (
        <ul className="divide-y divide-bn-line">
          {data.delegates.map((g) => (
            <li key={g.key} className="flex items-center gap-3.5 px-5 py-3.5">
              <Icon danger={g.label === "confirmed-thief" || g.label === "likely-thief"}><ShieldOff className="h-[18px] w-[18px]" /></Icon>
              <div className="min-w-0 flex-1">
                <a
                  href={`${g.chain === "ethereum" ? "https://etherscan.io" : "https://sepolia.etherscan.io"}/address/${g.address}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[13px] font-mono truncate inline-flex items-center gap-1 hover:text-bn-ink hover:underline"
                >
                  {g.address} <ArrowUpRight className="h-3 w-3 text-bn-muted flex-none" />
                </a>
                <div className="text-[12px] text-bn-muted truncate">{g.labelSource || "—"}</div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <Label label={g.label} />
                <div className="flex items-center gap-2.5 text-[11px] text-bn-muted">
                  <span>{g.delegatorCount} delegation{g.delegatorCount === "1" ? "" : "s"}</span>
                  <a href={arkivLink(g.key)} target="_blank" rel="noopener noreferrer" className="font-mono inline-flex items-center gap-0.5 hover:text-bn-ink">
                    arkiv <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data?.enabled && data.writes === false && (
        <p className="m-0 border-t border-bn-line px-5 py-3 text-[12.5px] text-bn-muted">
          Read-only here: this server has no Arkiv writer key, so new runs won’t be added. Set <code className="font-mono">ARKIV_PK</code> in <code className="font-mono">.env</code> to record them.
        </p>
      )}
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} role="tab" aria-selected={on} className={`bn-focus relative pb-3 text-[14px] font-medium transition-colors ${on ? "text-bn-ink" : "text-bn-muted hover:text-bn-muted"}`}>
      {children}
      {on && <motion.span layoutId="activity-tab" className="absolute left-0 right-0 -bottom-px h-0.5 bg-bn-ink rounded-full" />}
    </button>
  );
}

function Icon({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return <span className={`h-9 w-9 flex-none grid place-items-center rounded-full ${danger ? "bg-bn-ember/10 text-bn-ember-ink" : "bg-bn-paper-2 text-bn-muted"}`}>{children}</span>;
}

function Meta({ ts, tx, txExplorer, arkivLink, amountClass }: { ts: number; tx: string; txExplorer: string | null; arkivLink: string; amountClass?: string }) {
  return (
    <div className="text-right flex flex-col items-end gap-1">
      <span className="text-[11px] text-bn-muted">{ts ? new Date(ts).toLocaleString() : "—"}</span>
      <div className="flex items-center gap-2.5 text-[11.5px]">
        {tx && txExplorer && (
          <a href={`${txExplorer}/tx/${tx}`} target="_blank" rel="noopener noreferrer" className="font-mono inline-flex items-center gap-0.5 text-bn-muted hover:text-bn-ink">
            tx <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
        <a href={arkivLink} target="_blank" rel="noopener noreferrer" className={`font-mono inline-flex items-center gap-0.5 hover:underline ${amountClass || "text-bn-muted"}`}>
          arkiv <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function Label({ label }: { label: string }) {
  const danger = label === "confirmed-thief";
  const warn = label === "suspicious" || label === "likely-thief";
  const cls = danger ? "text-bn-ember-ink" : warn ? "text-bn-amber" : "text-bn-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${danger ? "bg-bn-ember" : warn ? "bg-bn-amber" : "bg-bn-muted"}`} />
      {label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-[13px] text-bn-muted leading-relaxed max-w-md mx-auto">{children}</div>;
}

function Count({ n }: { n: number }) {
  return <span className="ml-1.5 font-mono text-[11.5px] text-bn-muted">{n}</span>;
}
