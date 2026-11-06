"use client";

import { motion } from "framer-motion";
import { Play, Loader2, Coins } from "lucide-react";

export function DemoBar({
  state, live, running, disabled, chain, onRun, onTrace, onMint,
}: {
  state: string; live: boolean; running: boolean; disabled: boolean; chain: string;
  onRun: () => void; onTrace: () => void; onMint: () => void;
}) {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 bg-surface/90 backdrop-blur border-t border-line">
      <div className="max-w-shell mx-auto flex items-center gap-4 px-5 sm:px-6 h-14">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`h-1.5 w-1.5 rounded-full flex-none ${live ? "bg-down animate-beat" : "bg-ink-4"}`} />
          <span className="text-[13px] text-ink truncate">{state}</span>
          <span className="hidden sm:inline text-[12px] text-ink-4 font-mono">· {chain}</span>
        </div>

        <span className="flex-1" />

        <button
          onClick={onTrace}
          className="text-[13px] font-medium text-ink-3 hover:text-ink transition-colors px-2 py-2"
        >
          Walkthrough
        </button>
        <button
          onClick={onMint}
          disabled={running || disabled}
          title="Mint test tUSD to the demo wallet (recorded on Arkiv)"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-2 py-2"
        >
          <Coins className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Mint</span>
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onRun}
          disabled={running || disabled}
          title={disabled ? "Run `npm run setup` first" : undefined}
          className="inline-flex items-center gap-2 rounded-btn px-4 py-2 font-semibold text-[13px] bg-down text-white hover:bg-[#e03a4c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-[15px] w-[15px] fill-current" />}
          {running ? "Running…" : "Launch attack"}
        </motion.button>
      </div>
    </div>
  );
}
