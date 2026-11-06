"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X, ArrowUpRight } from "lucide-react";
import { Mark } from "@/components/brand";
import { subscribe, snapshot, serverSnapshot, toast, type Toast } from "./store";

/** Renders the toast stack. Mount once per page. Sits bottom-left on desktop so it never
 *  covers the step panels on the right; at most three show at once. */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const shown = items.slice(-3);
  const hidden = items.length - shown.length;
  return (
    <div aria-live="polite" aria-relevant="additions text"
      className="fixed z-[120] flex flex-col gap-2.5 pointer-events-none
                 top-[72px] inset-x-3
                 sm:top-auto sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[360px]">
      {hidden > 0 && <div className="order-first sm:order-none sm:-mb-1 text-[11.5px] text-bn-muted px-1 pointer-events-none">+{hidden} more</div>}
      <AnimatePresence initial={false}>
        {shown.map((t) => <ToastCard key={t.id} t={t} />)}
      </AnimatePresence>
    </div>
  );
}

const ICON = {
  loading: null,
  success: <CheckCircle2 className="h-[18px] w-[18px] text-bn-seal" />,
  error: <XCircle className="h-[18px] w-[18px] text-bn-ember-ink" />,
  warning: <AlertTriangle className="h-[18px] w-[18px] text-bn-ember-ink" />,
  info: <Info className="h-[18px] w-[18px] text-bn-info" />,
};
const BAR = { loading: "bg-bn-amber", success: "bg-bn-seal", error: "bg-bn-ember", warning: "bg-bn-ember", info: "bg-bn-info" };

function ToastCard({ t }: { t: Toast }) {
  const [hover, setHover] = useState(false);
  const left = useRef(t.duration);
  const startedAt = useRef(Date.now());

  // Auto-dismiss, paused while hovered or focused. Restarts when the toast is updated.
  useEffect(() => { left.current = t.duration; }, [t.created, t.duration]);
  useEffect(() => {
    if (!Number.isFinite(t.duration) || hover) return;
    startedAt.current = Date.now();
    const id = setTimeout(() => toast.dismiss(t.id), left.current);
    return () => { clearTimeout(id); left.current -= Date.now() - startedAt.current; };
  }, [t.id, t.created, t.duration, hover]);

  const timed = Number.isFinite(t.duration);
  return (
    <motion.div layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.16 } }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      role={t.kind === "error" ? "alert" : "status"}
      className="pointer-events-auto relative overflow-hidden rounded-[12px] border border-bn-line bg-bn-card shadow-bn-2">
      <div className="flex items-start gap-3 pl-4 pr-2 py-3.5">
        <span className="mt-px flex-none">{t.kind === "loading" ? <Mark size={18} animate="loop" /> : ICON[t.kind]}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-bn-ink leading-snug">{t.title}</div>
          {t.body && <div className="text-[13px] text-bn-ink-2 mt-0.5 leading-snug">{t.body}</div>}
          {t.link && (
            <a href={t.link.href} target="_blank" rel="noopener noreferrer" className="bn-focus rounded mt-1.5 inline-flex items-center gap-0.5 font-mono text-[12px] text-bn-ink underline decoration-bn-line underline-offset-2 hover:decoration-bn-ink">
              {t.link.label}<ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
        <button onClick={() => toast.dismiss(t.id)} aria-label="Dismiss" className="bn-focus h-7 w-7 grid place-items-center rounded-full text-bn-muted hover:text-bn-ink hover:bg-bn-ink/[0.06]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* progress: indeterminate while loading, countdown otherwise */}
      <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-bn-line/60">
        {t.kind === "loading"
          ? <div className={`h-full w-1/3 ${BAR.loading} bn-indeterminate`} />
          : timed && <div key={t.created} className={`h-full ${BAR[t.kind]} bn-countdown`} style={{ animationDuration: `${t.duration}ms`, animationPlayState: hover ? "paused" : "running" }} />}
      </div>
    </motion.div>
  );
}
