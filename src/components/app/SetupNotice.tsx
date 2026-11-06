import { CopyButton } from "@/components/landing/CopyButton";

const CMDS = "npm run chain\nnpm run setup";

/** Shown when /api/config says the contracts aren't deployed yet. */
export function SetupNotice() {
  return (
    <div role="status" className="mb-8 rounded-panel border border-bn-amber/40 bg-bn-amber/[0.07] px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium text-bn-ink">The test chain isn’t set up yet</div>
        <p className="m-0 mt-1 text-[13.5px] text-bn-ink-2">
          Start a local chain and deploy the contracts in a second terminal, then reload. You can still open each step below to read how it works.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-data bg-bn-night text-bn-fog pl-4 pr-1 py-1 font-mono text-[12.5px]">
        <span><span className="text-bn-ember-glow">$</span> npm run chain <span className="text-bn-fog-2">&amp;&amp;</span> npm run setup</span>
        <CopyButton text={CMDS} label="Copy" onNight />
      </div>
    </div>
  );
}
