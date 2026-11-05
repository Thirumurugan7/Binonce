"use client";

import { CoinIcon } from "./CoinIcon";
import { money, amount } from "@/lib/format";

export interface Asset {
  sym: string;
  name: string;
  amt: number;
  price: number;
  chg: number;
}

export function AssetsTable({ assets, hidden, hitSym }: { assets: Asset[]; hidden: boolean; hitSym: string | null }) {
  return (
    <div className="bg-surface border border-line rounded-card mt-[22px] overflow-hidden">
      <div className="flex items-center gap-5 px-5 py-4 border-b border-line">
        <span className="font-semibold text-ink border-b-2 border-yellow pb-0.5 cursor-pointer">Coin View</span>
        <span className="font-semibold text-ink-4 cursor-pointer">Account View</span>
        <span className="flex-1" />
        <span className="bg-surface-fill rounded-chip px-3 py-1.5 text-ink-4 text-[13px]">🔍 Search</span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-ink-4 text-xs">
            <th className="text-left font-normal px-5 py-3">Coin</th>
            <th className="text-right font-normal px-5 py-3">Amount</th>
            <th className="text-right font-normal px-5 py-3">Coin Price</th>
            <th className="text-right font-normal px-5 py-3">24H Change</th>
            <th className="text-right font-normal px-5 py-3">Value</th>
            <th className="text-right font-normal px-5 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.sym} className={`border-t border-line text-sm ${hitSym === a.sym ? "bg-[#FFFBF0]" : ""} transition-colors`}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <CoinIcon sym={a.sym} />
                  <div>
                    <b className="font-semibold block">{a.sym}</b>
                    <small className="text-ink-4">{a.name}</small>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-right font-medium">{hidden ? "****" : amount(a.amt, a.sym === "USDT" ? 2 : 4)}</td>
              <td className="px-5 py-4 text-right">${money(a.price)}</td>
              <td className={`px-5 py-4 text-right ${a.chg >= 0 ? "text-up" : "text-down"}`}>
                {a.chg >= 0 ? "+" : ""}
                {a.chg.toFixed(2)}%
              </td>
              <td className="px-5 py-4 text-right font-medium">{hidden ? "****" : `$${money(a.amt * a.price)}`}</td>
              <td className="px-5 py-4 text-right">
                <span className="inline-flex gap-3.5 justify-end text-[13px] font-medium text-ink-3">
                  <a className="hover:text-yellow cursor-pointer">Trade</a>
                  <a className="hover:text-yellow cursor-pointer">Earn</a>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
