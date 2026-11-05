const MAP: Record<string, [string, string]> = {
  USDT: ["#26A17B", "₮"],
  ETH: ["#627EEA", "Ξ"],
  BNB: ["#F0B90B", "◆"],
  BTC: ["#F7931A", "₿"],
};

export function CoinIcon({ sym, size = 30 }: { sym: string; size?: number }) {
  const [bg, glyph] = MAP[sym] ?? ["#848E9C", "?"];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="16" fill={bg} />
      <text x="16" y="21" textAnchor="middle" fontSize="15" fill="#fff" fontFamily="Inter, Arial">
        {glyph}
      </text>
    </svg>
  );
}
