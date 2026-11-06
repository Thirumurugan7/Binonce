/**
 * Renders a delegated account's code: the 3-byte 0xef0100 designator highlighted,
 * followed by the 20-byte delegate address. `short` abbreviates the address.
 */
export function Designator({ delegate, short, onNight, className = "" }: { delegate: string; short?: boolean; onNight?: boolean; className?: string }) {
  const hex = delegate.replace(/^0x/i, "");
  const addr = short ? `${hex.slice(0, 6)}…${hex.slice(-4)}` : hex;
  return (
    <code className={`font-mono break-all ${className}`}>
      <span className={onNight ? "text-bn-ember-glow" : "text-bn-ember-ink"}>0xef0100</span>
      <span className={onNight ? "text-bn-fog" : "text-bn-ink"}>{addr}</span>
    </code>
  );
}
