"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ShieldAlert, CheckCircle2 } from "lucide-react";
import { money, clock } from "@/lib/format";

export interface Note { id: number; kind: "warn" | "ok"; title: string; sub: string; t: number }

interface Account { label: string; who: string; address?: string | null; amount: number | null; sym: string; status?: { text: string; tone: "ember" | "seal" | "muted" }; flash?: "ember" | "seal" }

/** Where the money is: the protected account on top, the attacker below, and what the owner's app showed. */
export function MoneyPanel({ top, bottom, flow, notes, notesTitle, notesHint }: { top: Account; bottom: Account; flow: string; notes: Note[]; notesTitle: string; notesHint: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-panel border border-bn-line bg-bn-card overflow-hidden">
        <AccountRow a={top} />
        <div className="flex items-center gap-2 px-5 py-2 border-y border-bn-line bg-bn-paper-2/50 text-[12.5px] text-bn-muted">
          <ArrowDown className="h-3.5 w-3.5" /> {flow}
        </div>
        <AccountRow a={bottom} />
      </div>

      <div className="rounded-panel border border-bn-line bg-bn-card p-5">
        <div className="text-[14px] text-bn-ink">{notesTitle}</div>
        <p className="m-0 mt-0.5 text-[12.5px] text-bn-muted">{notesHint}</p>
        {notes.length === 0 ? (
          <p className="m-0 mt-4 text-[13.5px] text-bn-ink-2">Nothing yet. Everything looks normal.</p>
        ) : (
          <ul className="m-0 mt-4 p-0 list-none flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {notes.map((n) => (
                <motion.li key={n.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex gap-3 items-start rounded-data border border-bn-line px-3.5 py-2.5">
                  {n.kind === "ok" ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-none text-bn-seal" /> : <ShieldAlert className="h-4 w-4 mt-0.5 flex-none text-bn-ember-ink" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-bn-ink leading-tight">{n.title}</div>
                    <div className="text-[12.5px] text-bn-muted mt-0.5">{n.sub}</div>
                  </div>
                  <span className="font-mono text-[11px] text-bn-muted">{clock(n.t)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

function AccountRow({ a }: { a: Account }) {
  const tone = a.status?.tone === "ember" ? "text-bn-ember-ink" : a.status?.tone === "seal" ? "text-bn-seal" : "text-bn-muted";
  return (
    <div className="px-5 py-4">
      <div className="flex items-baseline gap-2">
        <span className="text-[14px] text-bn-ink">{a.label}</span>
        <span className="text-[12.5px] text-bn-muted">{a.who}</span>
        {a.status && <span className={`ml-auto text-[12.5px] ${tone}`}>{a.status.text}</span>}
      </div>
      <div className={`mt-1.5 font-semibold tnum text-[30px] leading-none tracking-[-0.02em] transition-colors duration-slow ${a.flash === "ember" ? "text-bn-ember" : a.flash === "seal" ? "text-bn-seal" : "text-bn-ink"}`}>
        {a.amount == null ? "—" : money(a.amount)} <span className="text-[14px] font-medium text-bn-muted tracking-normal">{a.sym}</span>
      </div>
      {a.address && <div className="mt-1.5 font-mono text-[11.5px] text-bn-muted truncate">{a.address}</div>}
    </div>
  );
}
