"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ChevronDown, ShieldAlert } from "lucide-react";
import { money } from "@/lib/format";

export interface BalanceCardProps {
  usdt: number;
  total: number;
  hidden: boolean;
  draining: boolean;
  onToggleEye: () => void;
  pnl: { text: string; down: boolean };
  alert: string | null;
}

export function BalanceCard({ usdt, total, hidden, draining, onToggleEye, pnl, alert }: BalanceCardProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[13px] font-medium text-ink-3 m-0 mb-2 flex items-center gap-2">
            Estimated Balance
            <button onClick={onToggleEye} className="text-ink-4 hover:text-ink-2 transition-colors" aria-label="Toggle balance visibility">
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </h1>
          <div className={`tnum text-[32px] leading-none font-semibold tracking-[-0.5px] flex items-baseline gap-2 transition-colors ${draining ? "text-down" : "text-ink"}`}>
            {hidden ? "••••••" : money(usdt)}
            <span className="inline-flex items-center gap-0.5 text-sm text-ink-3 font-medium">USDT <ChevronDown className="h-3.5 w-3.5" /></span>
          </div>
          <div className="text-ink-3 text-[13px] mt-2 tnum">≈ ${hidden ? "••••••" : money(total)}</div>
          <div className="mt-3 text-[13px] text-ink-3">
            Today&apos;s PnL <span className={`font-semibold ${pnl.down ? "text-down" : "text-up"}`}>{pnl.text}</span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <ActionButton primary icon={<ArrowDownToLine className="h-4 w-4" />}>Deposit</ActionButton>
          <ActionButton icon={<ArrowUpFromLine className="h-4 w-4" />}>Withdraw</ActionButton>
          <ActionButton icon={<ArrowLeftRight className="h-4 w-4" />}>Transfer</ActionButton>
        </div>
      </div>

      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2.5 mt-4 px-3.5 py-3 bg-down/10 border border-down/30 rounded-data text-down font-medium text-[13px]">
              <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}>
                <ShieldAlert className="h-[18px] w-[18px] flex-none" />
              </motion.span>
              {alert}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ActionButton({ children, icon, primary }: { children: React.ReactNode; icon: React.ReactNode; primary?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={`inline-flex items-center gap-2 rounded-btn px-4 py-2.5 font-semibold text-[13px] transition-colors ${
        primary ? "bg-yellow text-[#1E2026] hover:bg-yellow-hi" : "bg-surface-fill text-ink hover:bg-line"
      }`}
    >
      {icon}
      {children}
    </motion.button>
  );
}
