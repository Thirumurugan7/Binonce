"use client";

import { motion } from "framer-motion";
import { Play, Loader2, PanelRightOpen, Zap } from "lucide-react";

export function DemoBar({
  state, live, running, disabled, chain, onRun, onTrace,
}: {
  state: string; live: boolean; running: boolean; disabled: boolean; chain: string;
  onRun: () => void; onTrace: () => void;
}) {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 bg-night/95 backdrop-blur text-[#EAECEF] flex items-center gap-4 px-5 py-3 border-t border-night-line">
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full ${live ? "bg-down animate-beat" : "bg-dim-2"}`} />
        <span className="font-mono text-[11px] text-down tracking-wide">{state}</span>
      </div>
      <span className="text-[12.5px] text-dim hidden md:flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5" /> Real EIP-7702 drain, executed on-chain
      </span>
      <span className="font-mono text-[11px] text-dim-2 border border-night-line rounded-md px-2 py-1 hidden sm:inline">{chain}</span>
      <span className="flex-1" />
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onRun}
        disabled={running || disabled}
        title={disabled ? "Run `npm run setup` first" : undefined}
        className="inline-flex items-center gap-2 rounded-btn px-5 py-2.5 font-semibold text-[13px] bg-down text-white hover:bg-[#ff5b6b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
        {running ? "Attack running…" : "Launch attack"}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onTrace}
        className="inline-flex items-center gap-2 rounded-btn px-4 py-2.5 font-semibold text-[13px] bg-white/[0.07] text-[#EAECEF] hover:bg-white/[0.12] transition-colors"
      >
        <PanelRightOpen className="h-4 w-4" /> Trace
      </motion.button>
    </div>
  );
}
