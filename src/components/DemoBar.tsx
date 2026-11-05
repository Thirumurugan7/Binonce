"use client";

export function DemoBar({
  state, live, running, disabled, chain, onRun, onTrace,
}: {
  state: string; live: boolean; running: boolean; disabled: boolean; chain: string;
  onRun: () => void; onTrace: () => void;
}) {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 bg-night text-[#EAECEF] flex items-center gap-4 px-5 py-3 border-t-2 border-down">
      <span className="font-mono text-[11px] text-down tracking-wide flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full bg-down ${live ? "animate-beat" : ""}`} />
        {state}
      </span>
      <span className="text-[12.5px] text-dim hidden sm:inline">
        Real EIP-7702 drain, executed on-chain.
      </span>
      <span className="font-mono text-[11px] text-dim-2 border border-night-line rounded px-2 py-1 hidden md:inline">
        {chain}
      </span>
      <span className="flex-1" />
      <button
        onClick={onRun}
        disabled={running || disabled}
        title={disabled ? "Run `npm run setup` first" : undefined}
        className="rounded-btn px-5 py-2.5 font-semibold text-[13px] bg-down text-white hover:bg-[#ff5b6b] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {running ? "Attack running…" : "Launch attack"}
      </button>
      <button onClick={onTrace} className="rounded-btn px-4 py-2.5 font-semibold text-[13px] bg-yellow text-[#111]">
        Attack trace ›
      </button>
    </div>
  );
}
