"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ShieldOff, Coins, Database, RefreshCw } from "lucide-react";
import { shortAddr, money } from "@/lib/format";

interface Delegation { key: string; chain: string; victim: string; delegate: string; attacker: string; drained: string; sweepTx: string; block: string; status: string; ts: string }
interface Mint { key: string; chain: string; to: string; amount: string; tx: string; block: string; ts: string }
interface Delegate { key: string; chain: string; address: string; label: string; labelSource?: string; delegatorCount: string; bytecodeHash: string; firstSeenBlock: string }
interface ActivityResp {
  enabled: boolean; writer: string | null;
  delegations: Delegation[]; mints: Mint[]; delegates: Delegate[];
  explorer: string;
}

type Feed =
  | { kind: "attack"; key: string; ts: number; d: Delegation }
  | { kind: "mint"; key: string; ts: number; m: Mint };

export function ActivityPanel({ version, txExplorer }: { version: number; txExplorer: string | null }) {
  const [tab, setTab] = useState<"activity" | "blacklist">("activity");
  const [data, setData] = useState<ActivityResp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/arkiv/activity")
      .then((r) => r.json())
      .then((d: ActivityResp) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, version]);

  const feed: Feed[] = data
    ? [
        ...data.delegations.map((d) => ({ kind: "attack" as const, key: d.key, ts: Number(d.ts) || 0, d })),
        ...data.mints.map((m) => ({ kind: "mint" as const, key: m.key, ts: Number(m.ts) || 0, m })),
      ].sort((a, b) => b.ts - a.ts)
    : [];

  const arkivLink = () => (data ? data.explorer : "#");

  return (
    <div className="bg-surface border border-line rounded-card mt-6 overflow-hidden">
      <div className="flex items-center gap-5 px-5 pt-4">
        <Tab on={tab === "activity"} onClick={() => setTab("activity")}>Activity</Tab>
        <Tab on={tab === "blacklist"} onClick={() => setTab("blacklist")}>Blacklist registry</Tab>
        <div className="ml-auto flex items-center gap-2.5 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-4">
            <Database className="h-3.5 w-3.5" />
            {data?.enabled ? <>Arkiv · <span className="font-mono">{data.writer ? shortAddr(data.writer) : "Rabdi"}</span></> : "Arkiv off"}
          </span>
          <button onClick={load} className="h-7 w-7 grid place-items-center rounded-md text-ink-4 hover:text-ink hover:bg-surface-fill transition-colors" aria-label="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <div className="border-t border-line" />

      {!data?.enabled ? (
        <Empty>
          Arkiv isn&apos;t configured yet. Add <code className="font-mono text-ink-3">ARKIV_ACCESS_KEY</code> and{" "}
          <code className="font-mono text-ink-3">ARKIV_PK</code> (funded with tGLM) to record every attack and mint to the on-chain registry.
        </Empty>
      ) : tab === "activity" ? (
        feed.length === 0 ? (
          <Empty>No activity recorded yet. Launch an attack or mint to write the first entity to Arkiv.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {feed.map((f) => (
              <motion.li key={f.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3.5 px-5 py-3.5">
                {f.kind === "attack" ? (
                  <>
                    <Icon danger><ShieldOff className="h-[18px] w-[18px]" /></Icon>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">Wallet drained · {money(Number(f.d.drained))} tUSD</div>
                      <div className="text-[12px] text-ink-4 font-mono truncate">{shortAddr(f.d.victim)} → {shortAddr(f.d.attacker)}</div>
                    </div>
                    <Meta ts={f.ts} tx={f.d.sweepTx} txExplorer={txExplorer} arkivLink={arkivLink()} amountClass="text-down" />
                  </>
                ) : (
                  <>
                    <Icon><Coins className="h-[18px] w-[18px]" /></Icon>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">Minted {money(Number(f.m.amount))} tUSD</div>
                      <div className="text-[12px] text-ink-4 font-mono truncate">to {shortAddr(f.m.to)}</div>
                    </div>
                    <Meta ts={f.ts} tx={f.m.tx} txExplorer={txExplorer} arkivLink={arkivLink()} />
                  </>
                )}
              </motion.li>
            ))}
          </ul>
        )
      ) : data.delegates.length === 0 ? (
        <Empty>No delegate contracts flagged yet. Each attack adds the sweeper it used to the registry.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {data.delegates.map((g) => (
            <li key={g.key} className="flex items-center gap-3.5 px-5 py-3.5">
              <Icon danger={g.label === "confirmed-thief"}><ShieldOff className="h-[18px] w-[18px]" /></Icon>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-mono truncate">{g.address}</div>
                <div className="text-[12px] text-ink-4 truncate">{g.labelSource || "—"}</div>
              </div>
              <div className="text-right flex flex-col items-end gap-0.5">
                <Label label={g.label} />
                <span className="text-[11px] text-ink-4">{g.delegatorCount} delegation{g.delegatorCount === "1" ? "" : "s"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`relative pb-3 text-sm font-semibold transition-colors ${on ? "text-ink" : "text-ink-4 hover:text-ink-3"}`}>
      {children}
      {on && <motion.span layoutId="activity-tab" className="absolute left-0 right-0 -bottom-px h-0.5 bg-yellow rounded-full" />}
    </button>
  );
}

function Icon({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return <span className={`h-9 w-9 flex-none grid place-items-center rounded-full ${danger ? "bg-down/12 text-down" : "bg-surface-fill text-ink-3"}`}>{children}</span>;
}

function Meta({ ts, tx, txExplorer, arkivLink, amountClass }: { ts: number; tx: string; txExplorer: string | null; arkivLink: string; amountClass?: string }) {
  return (
    <div className="text-right flex flex-col items-end gap-1">
      <span className="text-[11px] text-ink-4">{ts ? new Date(ts).toLocaleString() : "—"}</span>
      <div className="flex items-center gap-2.5 text-[11.5px]">
        {tx && txExplorer && (
          <a href={`${txExplorer}/tx/${tx}`} target="_blank" rel="noopener noreferrer" className="font-mono inline-flex items-center gap-0.5 text-ink-3 hover:text-ink">
            tx <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
        <a href={arkivLink} target="_blank" rel="noopener noreferrer" className={`font-mono inline-flex items-center gap-0.5 hover:underline ${amountClass || "text-ink-3"}`}>
          arkiv <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function Label({ label }: { label: string }) {
  const danger = label === "confirmed-thief";
  const warn = label === "suspicious" || label === "likely-thief";
  const cls = danger ? "text-down" : warn ? "text-yellow-press dark:text-yellow" : "text-ink-3";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${danger ? "bg-down" : warn ? "bg-yellow" : "bg-ink-4"}`} />
      {label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-[13px] text-ink-4 leading-relaxed max-w-md mx-auto">{children}</div>;
}
