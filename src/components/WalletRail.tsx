"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, CandlestickChart, Wallet, Scale, Lock, TrendingUp, PiggyBank, History, type LucideIcon } from "lucide-react";

const ITEMS: { label: string; icon: LucideIcon }[] = [
  { label: "Overview", icon: LayoutGrid },
  { label: "Spot", icon: CandlestickChart },
  { label: "Funding", icon: Wallet },
  { label: "Cross Margin", icon: Scale },
  { label: "Isolated Margin", icon: Lock },
  { label: "USD-M Futures", icon: TrendingUp },
  { label: "Earn", icon: PiggyBank },
  { label: "History", icon: History },
];

export function WalletRail() {
  const [active, setActive] = useState("Overview");
  return (
    <nav className="flex md:flex-col gap-0.5 overflow-x-auto">
      {ITEMS.map(({ label, icon: Icon }) => {
        const on = active === label;
        return (
          <button
            key={label}
            onClick={() => setActive(label)}
            className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-data text-sm whitespace-nowrap transition-colors ${
              on ? "text-ink font-semibold" : "text-ink-3 font-medium hover:text-ink hover:bg-surface-fill"
            }`}
          >
            {on && (
              <motion.span
                layoutId="rail-active"
                className="absolute inset-0 rounded-data bg-[#FEF6D8]"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <Icon className={`relative h-[17px] w-[17px] ${on ? "text-yellow-press" : ""}`} />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
