"use client";

import { money } from "@/lib/format";

export interface BalanceCardProps {
  usdt: number;
  total: number;
  hidden: boolean;
  onToggleEye: () => void;
  pnl: { text: string; down: boolean };
  alert: string | null;
}

export function BalanceCard({ usdt, total, hidden, onToggleEye, pnl, alert }: BalanceCardProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[15px] font-medium text-ink-3 m-0 mb-2.5 flex items-center gap-2">
            Estimated Balance
            <span className="cursor-pointer text-ink-4" onClick={onToggleEye} title="Hide balance">
              👁
            </span>
          </h1>
          <div className="text-[30px] font-semibold tracking-[-0.5px] flex items-baseline gap-2">
            {hidden ? "******" : money(usdt)}
            <span className="text-sm text-ink-3 font-medium">USDT ▾</span>
          </div>
          <div className="text-ink-3 text-sm mt-1.5">≈ ${hidden ? "******" : money(total)}</div>
          <div className="mt-3.5 text-[13px] text-ink-3">
            Today&apos;s PnL <b className={`font-semibold ${pnl.down ? "text-down" : "text-up"}`}>{pnl.text}</b>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button className="rounded-btn px-5 py-2.5 font-semibold text-sm bg-yellow text-ink hover:bg-yellow-hi">Deposit</button>
          <button className="rounded-btn px-5 py-2.5 font-semibold text-sm bg-surface-fill text-ink hover:bg-[#EEEEF0]">Withdraw</button>
          <button className="rounded-btn px-5 py-2.5 font-semibold text-sm bg-surface-fill text-ink hover:bg-[#EEEEF0]">Transfer</button>
        </div>
      </div>

      {alert && (
        <div className="flex items-center gap-2.5 mt-[18px] px-3.5 py-3 bg-[#FEF0F0] border border-[#FBD4D8] rounded-data text-[#C7303F] font-medium text-[13px]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-[18px] h-[18px] flex-none">
            <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          <span>{alert}</span>
        </div>
      )}
    </>
  );
}
