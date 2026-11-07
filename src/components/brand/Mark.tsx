/**
 * Binonce mark, a gold exchange gem on the inside, the EIP-7702 story on the outside.
 * Nine authorizations signed at consecutive nonces, laid out as a 3×3 grid rotated into a
 * diamond: eight ring the outside as spent spares (soft-gold dots), the one that lands sits
 * at the heart as a cut gold gem. The diamond + gold evoke a crypto exchange; it is
 * deliberately our own shape, not any exchange's actual mark.
 *
 * `animate="once"` plays the signing sequence one time (intro); `"loop"` repeats it (busy state).
 */
const CELLS = Array.from({ length: 9 }, (_, i) => ({ i, cx: 4 + (i % 3) * 7, cy: 4 + Math.floor(i / 3) * 7 }));

export function Mark({ size = 22, animate, title }: { size?: number; animate?: "once" | "loop"; title?: string }) {
  const cls = animate === "loop" ? "bn-mark bn-mark--loop" : animate === "once" ? "bn-mark bn-mark--once" : "bn-mark";
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" className={cls} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {/* rotate the whole grid 45° about centre → a diamond; squares read as cut gems, dots stay round */}
      <g transform="rotate(45 11 11)">
        {CELLS.map(({ i, cx, cy }) =>
          i === 4 ? (
            <rect key={i} className="bn-mark-land" x={cx - 3.5} y={cy - 3.5} width="7" height="7" rx="1.4" fill="rgb(var(--bn-gold))" />
          ) : (
            <circle key={i} className="bn-mark-dot" style={{ ["--i" as string]: i }} cx={cx} cy={cy} r="1.7" fill="rgb(var(--bn-gold-soft))" />
          )
        )}
      </g>
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
