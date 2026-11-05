const MARKS: Record<string, { bg: string; path: React.ReactNode }> = {
  USDT: {
    bg: "#26A17B",
    path: (
      <path
        fill="#fff"
        d="M17.9 17.4v-2.1c3.3-.15 5.8-.8 5.8-1.58s-2.5-1.43-5.8-1.58V9.9h4.5V6.9H9.6v3h4.5v2.25c-3.3.15-5.8.8-5.8 1.58s2.5 1.43 5.8 1.58v6.6h3.8zm0-3.68v.01c-.08.01-.5.04-1.9.04-1.12 0-1.9-.03-2.18-.04v-.01c-3.4-.15-5.94-.74-5.94-1.45s2.54-1.3 5.94-1.45v2.32c.28.02 1.08.07 2.2.07 1.34 0 1.8-.06 1.88-.07v-2.32c3.4.15 5.93.74 5.93 1.45s-2.53 1.3-5.93 1.45z"
      />
    ),
  },
  ETH: {
    bg: "#627EEA",
    path: (
      <>
        <path fill="#fff" fillOpacity={0.6} d="M16 4v8.87l7.5 3.35z" />
        <path fill="#fff" d="M16 4 8.5 16.22 16 12.87z" />
        <path fill="#fff" fillOpacity={0.6} d="M16 21.97V28l7.5-10.38z" />
        <path fill="#fff" d="M16 28v-6.03L8.5 17.62z" />
        <path fill="#fff" fillOpacity={0.2} d="m16 20.57 7.5-4.35L16 12.87z" />
        <path fill="#fff" fillOpacity={0.6} d="m8.5 16.22 7.5 4.35v-7.7z" />
      </>
    ),
  },
  BNB: {
    bg: "#F3BA2F",
    path: (
      <path
        fill="#fff"
        d="m12.12 14.18 3.88-3.88 3.88 3.88 2.26-2.26L16 5.78l-6.14 6.14zM6.6 16l2.26-2.26L11.12 16l-2.26 2.26zm5.52 1.82L16 21.7l3.88-3.88 2.26 2.25L16 26.22l-6.14-6.14zM20.88 16l2.26-2.26L25.4 16l-2.26 2.26zm-2.6 0L16 13.72 14.3 15.4l-.2.2-.4.4 2.3 2.3z"
      />
    ),
  },
};

export function CoinIcon({ sym, size = 30 }: { sym: string; size?: number }) {
  const mark = MARKS[sym];
  if (!mark) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-ink-4 text-white grid place-items-center text-[11px] font-semibold"
      >
        {sym.slice(0, 2)}
      </div>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="16" fill={mark.bg} />
      {mark.path}
    </svg>
  );
}
