"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { CoinIcon } from "./CoinIcon";
import { money, amount } from "@/lib/format";

export interface Asset {
  sym: string;
  name: string;
  amt: number;
  price: number;
  chg: number;
}

const TABS = ["Coin View", "Account View"] as const;

export function AssetsTable({ assets, hidden, hitSym }: { assets: Asset[]; hidden: boolean; hitSym: string | null }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Coin View");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? assets.filter((a) => a.sym.toLowerCase().includes(t) || a.name.toLowerCase().includes(t)) : assets;
  }, [assets, q]);

  const total = assets.reduce((s, a) => s + a.amt * a.price, 0);

  return (
    <div className="bg-surface border border-line rounded-card mt-6 overflow-hidden">
      <div className="flex items-center gap-6 px-5 pt-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="relative pb-3 text-sm font-semibold transition-colors"
            style={{ color: tab === t ? "#1E2026" : "#848E9C" }}>
            {t}
            {tab === t && <motion.span layoutId="assets-tab" className="absolute left-0 right-0 -bottom-px h-0.5 bg-yellow rounded-full" />}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 bg-surface-fill rounded-chip px-3 h-8 mb-2 focus-within:ring-1 focus-within:ring-line transition">
          <Search className="h-3.5 w-3.5 text-ink-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
            className="bg-transparent outline-none text-[13px] text-ink placeholder:text-ink-4 w-24" />
        </div>
      </div>
      <div className="border-t border-line" />

      {tab === "Coin View" ? (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-ink-4 text-xs">
              <th className="text-left font-normal px-5 py-3">Coin</th>
              <th className="text-right font-normal px-5 py-3">Amount</th>
              <th className="text-right font-normal px-5 py-3">Coin Price</th>
              <th className="text-right font-normal px-5 py-3 hidden sm:table-cell">24H Change</th>
              <th className="text-right font-normal px-5 py-3">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <motion.tr key={a.sym} animate={{ backgroundColor: hitSym === a.sym ? "#FFF8E6" : "rgba(255,255,255,0)" }}
                transition={{ duration: 0.4 }} className="border-t border-line text-sm">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <CoinIcon sym={a.sym} />
                    <div>
                      <div className="font-semibold">{a.sym}</div>
                      <div className="text-ink-4 text-xs">{a.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-right font-medium tnum">{hidden ? "••••" : amount(a.amt, a.sym === "USDT" ? 2 : 4)}</td>
                <td className="px-5 py-4 text-right tnum">${money(a.price)}</td>
                <td className={`px-5 py-4 text-right tnum hidden sm:table-cell ${a.chg >= 0 ? "text-up" : "text-down"}`}>
                  {a.chg >= 0 ? "+" : ""}{a.chg.toFixed(2)}%
                </td>
                <td className="px-5 py-4 text-right font-medium tnum">{hidden ? "••••" : `$${money(a.amt * a.price)}`}</td>
              </motion.tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-4 text-sm">No assets match “{q}”.</td></tr>
            )}
          </tbody>
        </table>
      ) : (
        <div className="p-5">
          <div className="rounded-data border border-line p-5 flex items-center justify-between">
            <div>
              <div className="text-ink-4 text-xs">Spot Wallet</div>
              <div className="text-2xl font-semibold tnum mt-1">{hidden ? "••••••" : `$${money(total)}`}</div>
            </div>
            <div className="text-right text-xs text-ink-4">
              {assets.filter((a) => a.amt > 0).length} assets
              <div className="text-up font-medium mt-1">Spot · Funding · Earn</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
