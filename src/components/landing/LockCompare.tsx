"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";

/** Same stolen key, same 7702 trick, two places to keep the money. Mirrors /attack and /defense. */
const ROWS = [
  { step: "Attacker signs with the stolen key", plain: [true, "Signatures are valid"], lock: [true, "Signatures are valid"] },
  { step: "7702 delegation lands", plain: [true, "Wallet code becomes the sweeper"], lock: [true, "Signer Carol’s code becomes the attacker’s"] },
  { step: "Call to move the funds", plain: [true, "Executes: nothing checks the caller"], lock: [false, "Reverts: ActorDelegated(carol, delegate)"] },
  { step: "Balance afterwards", plain: [false, "0 · everything went to the attacker"], lock: [true, "Unchanged · attacker received 0"] },
] as const;

export function LockCompare() {
  const [mode, setMode] = useState<"plain" | "lock">("plain");
  const lock = mode === "lock";
  return (
    <div className="rounded-panel border border-bn-line bg-bn-card shadow-bn-2 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 px-5 sm:px-6 py-4 border-b border-bn-line">
        <div className="text-[15px] text-bn-ink font-medium mr-auto">Same stolen key, two places to keep the money</div>
        <div role="radiogroup" aria-label="Where the funds are held" className="grid grid-cols-2 p-1 rounded-full border border-bn-line bg-bn-paper">
          {(["plain", "lock"] as const).map((m) => (
            <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
              className={`bn-focus relative h-9 px-4 rounded-full text-[13.5px] transition-colors ${mode === m ? "text-bn-paper" : "text-bn-ink-2 hover:text-bn-ink"}`}>
              {mode === m && <motion.span layoutId="lock-pill" className={`absolute inset-0 rounded-full ${m === "lock" ? "bg-bn-seal" : "bg-bn-ink"}`} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{m === "plain" ? "Plain hot wallet" : "Behind the Lock"}</span>
            </button>
          ))}
        </div>
      </div>
      <ol className="m-0 p-0 list-none">
        {ROWS.map((r, i) => {
          const [ok, text] = lock ? r.lock : r.plain;
          // For the attacker, ✓ on the last row means the owner kept their money.
          const good = i === 3 ? ok : i === 2 ? !ok : null;
          return (
            <li key={r.step} className="grid grid-cols-[1.5rem_1fr] sm:grid-cols-[1.5rem_16rem_1fr] gap-x-4 gap-y-1 items-start px-5 sm:px-6 py-4 border-b border-bn-line last:border-0">
              <span className="font-mono text-[11px] text-bn-muted pt-0.5">0{i + 1}</span>
              <span className="text-[14px] text-bn-ink-2">{r.step}</span>
              <AnimatePresence mode="wait">
                <motion.span key={mode} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, delay: i * 0.04 }}
                  className={`col-start-2 sm:col-start-auto inline-flex items-start gap-2 text-[14px] ${good === true ? "text-bn-seal" : good === false ? "text-bn-ember-ink" : "text-bn-ink"}`}>
                  {ok ? <Check className="h-4 w-4 mt-0.5 flex-none" /> : <X className="h-4 w-4 mt-0.5 flex-none" />}
                  <span className={i === 2 && lock ? "font-mono text-[13px]" : ""}>{text}</span>
                </motion.span>
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
