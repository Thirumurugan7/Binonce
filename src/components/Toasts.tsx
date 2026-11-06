"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, CheckCircle2 } from "lucide-react";

export interface ToastItem {
  id: number;
  kind: "ok" | "warn";
  title: string;
  sub: string;
}

export function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div className="fixed top-[76px] right-5 z-[120] flex flex-col gap-2.5 w-[340px] max-w-[90vw] pointer-events-none">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="bg-surface border border-line rounded-[10px] px-4 py-3.5 shadow-toast flex gap-3 items-start"
          >
            <div className={`h-6 w-6 flex-none rounded-full grid place-items-center ${t.kind === "ok" ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {t.kind === "ok" ? <CheckCircle2 className="h-[15px] w-[15px]" /> : <ShieldAlert className="h-[15px] w-[15px]" />}
            </div>
            <div>
              <div className="font-semibold text-[13px] leading-tight">{t.title}</div>
              <div className="text-ink-3 text-[12.5px] mt-0.5">{t.sub}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
