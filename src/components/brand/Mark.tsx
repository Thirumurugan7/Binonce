/**
 * Binonce mark. Nine authorizations signed at consecutive nonces: eight are spent spares (dots),
 * one lands (the ember square). In the replay the one that lands is always the first.
 *
 * `animate="once"` plays the signing sequence one time (intro); `"loop"` repeats it (busy state).
 */
const CELLS = Array.from({ length: 9 }, (_, i) => ({ i, cx: 4 + (i % 3) * 7, cy: 4 + Math.floor(i / 3) * 7 }));

export function Mark({ size = 22, animate, title }: { size?: number; animate?: "once" | "loop"; title?: string }) {
  const cls = animate === "loop" ? "bn-mark bn-mark--loop" : animate === "once" ? "bn-mark bn-mark--once" : "bn-mark";
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" className={cls} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {CELLS.map(({ i, cx, cy }) =>
        i === 0 ? (
          <rect key={i} className="bn-mark-land" x={cx - 3.25} y={cy - 3.25} width="6.5" height="6.5" rx="1.25" fill="rgb(var(--bn-ember))" />
        ) : (
          <circle key={i} className="bn-mark-dot" style={{ ["--i" as string]: i }} cx={cx} cy={cy} r="1.7" fill="currentColor" />
        )
      )}
    </svg>
  );
}

export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <span className="inline-flex items-center gap-2.5 text-bn-ink">
      <Mark size={lg ? 34 : 22} />
      <span className={`font-serif leading-none tracking-[-0.01em] ${lg ? "text-[40px]" : "text-[26px]"}`}>Binonce</span>
    </span>
  );
}
