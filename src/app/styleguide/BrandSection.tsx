import { ArrowRight } from "lucide-react";
import { Button, Designator, Eyebrow, Hl, Mark, Tag, Wordmark } from "@/components/brand";
import { ToastDemo } from "./ToastDemo";

// Light-theme hex values; the swatches themselves use the live tokens, so they follow the theme toggle.
const PAPER = [
  { token: "bn-paper", hex: "#F3EFE6", use: "Page" },
  { token: "bn-paper-2", hex: "#ECE7DB", use: "Bands" },
  { token: "bn-line", hex: "#D8D1C2", use: "Hairlines" },
  { token: "bn-muted", hex: "#686358", use: "Metadata" },
  { token: "bn-ink-2", hex: "#3A3730", use: "Body" },
  { token: "bn-ink", hex: "#15140F", use: "Headings, primary" },
];
const NIGHT = [
  { token: "bn-night", hex: "#0E0F11", use: "Chain world" },
  { token: "bn-night-2", hex: "#16181B", use: "Raised" },
  { token: "bn-night-line", hex: "#282B30", use: "Hairlines" },
  { token: "bn-fog-2", hex: "#9C988D", use: "Muted" },
  { token: "bn-fog", hex: "#E8E4DA", use: "Text" },
];
const SIGNAL = [
  { token: "bn-ember", hex: "#E5431F", use: "Signal · fills & large text" },
  { token: "bn-ember-ink", hex: "#B2310E", use: "Ember small text on paper" },
  { token: "bn-ember-glow", hex: "#FF6B45", use: "Ember on night" },
  { token: "bn-seal", hex: "#1F7A59", use: "Held / live" },
  { token: "bn-seal-glow", hex: "#5EC99C", use: "Seal on night" },
  { token: "bn-amber", hex: "#8A570B", use: "Warning / in progress" },
  { token: "bn-amber-glow", hex: "#E9B44C", use: "Amber on night" },
  { token: "bn-info", hex: "#2C54C4", use: "Information" },
];

function Swatches({ items }: { items: { token: string; hex: string; use: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {items.map((s) => (
        <div key={s.token} className="rounded-data border border-bn-line overflow-hidden bg-bn-paper">
          <div className="h-14 border-b border-bn-line" style={{ background: `rgb(var(--${s.token}))` }} />
          <div className="px-2.5 py-2">
            <div className="font-mono text-[11px] text-bn-ink">{s.token}</div>
            <div className="font-mono text-[10.5px] text-bn-muted">{s.hex}</div>
            <div className="text-[11px] text-bn-ink-2 mt-0.5">{s.use}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h3 className="font-mono text-eyebrow uppercase text-bn-muted mb-4">{title}</h3>
      {children}
    </section>
  );
}

export function BrandSection() {
  return (
    <div>
      <div className="max-w-page mx-auto px-6 py-10">
        <Wordmark />
        <h1 className="font-serif font-normal text-display-m mt-8 mb-0">Binonce brand system</h1>
        <p className="text-bn-ink-2 mt-3 max-w-[62ch] text-[15px] leading-relaxed">
          One system for the landing page and the app, in light and dark. Paper is what people see; night is what the
          chain records and stays dark in both themes. Ember marks the breach. Full rationale in <code className="font-mono text-[13px]">DESIGN_SYSTEM.md</code>.
        </p>

        <Block title="Paper"><Swatches items={PAPER} /></Block>
        <Block title="Night"><Swatches items={NIGHT} /></Block>
        <Block title="Signal & semantic"><Swatches items={SIGNAL} /></Block>

        <Block title="Type">
          <div className="space-y-4">
            <p className="font-serif text-display-l m-0">Display · Instrument Serif</p>
            <p className="font-serif text-display-s m-0">Section lead, <em>italic for the turn of phrase</em></p>
            <p className="text-body-l text-bn-ink-2 m-0 max-w-[62ch]">Body large · Geist 19/1.6. Used for section intros.</p>
            <p className="text-[16px] text-bn-ink-2 m-0">Body · Geist 16/1.6</p>
            <Eyebrow index="01">Eyebrow · Geist Mono 12, tracked 0.14em</Eyebrow>
            <Designator delegate="0x5FbDB2315678afecb367f032d93F642f64180aa3" className="text-[13px] block" />
          </div>
        </Block>

        <Block title="Buttons">
          <div className="flex flex-wrap gap-3 items-center">
            <Button icon={<ArrowRight className="h-4 w-4" />}>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-3 items-center mt-4 p-5 rounded-panel bg-bn-night">
            <Button variant="danger">Danger · launch attack</Button>
            <Button variant="inverse">Inverse</Button>
            <Button variant="inverse-ghost">Inverse ghost</Button>
          </div>
        </Block>

        <Block title="Status tags">
          <div className="flex flex-wrap gap-2">
            <Tag tone="live">Live</Tag><Tag tone="progress">In progress</Tag><Tag tone="planned">Planned</Tag>
            <Tag tone="breach">Breach</Tag><Tag tone="seal">Held</Tag><Tag tone="neutral">Neutral</Tag>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 p-5 rounded-panel bg-bn-night">
            <Tag tone="live" onNight>Live</Tag><Tag tone="progress" onNight>In progress</Tag><Tag tone="planned" onNight>Planned</Tag>
            <Tag tone="breach" onNight pulse>Breach</Tag>
          </div>
        </Block>

        <Block title="Toasts">
          <ToastDemo />
        </Block>

        <Block title="Highlight">
          <p className="text-body-l text-bn-ink-2 m-0 max-w-[62ch]">One key phrase per section gets <Hl>a marker stroke that sweeps in on scroll</Hl>, in the same colours as text selection.</p>
        </Block>

        <Block title="Mark">
          <div className="flex flex-wrap items-end gap-10 text-bn-ink">
            <div className="text-center"><Mark size={64} /><div className="font-mono text-[11px] text-bn-muted mt-2">static</div></div>
            <div className="text-center"><Mark size={64} animate="loop" /><div className="font-mono text-[11px] text-bn-muted mt-2">loop · busy state</div></div>
            <div className="text-center"><img src="/binonce-loader.svg" width={64} height={64} alt="Animated Binonce mark" /><div className="font-mono text-[11px] text-bn-muted mt-2">binonce-loader.svg</div></div>
          </div>
          <p className="text-[14px] text-bn-ink-2 mt-4 max-w-[62ch]">Nine authorizations signed at consecutive nonces. Eight are spent spares; the first one lands. In the replay the matching nonce is always the first.</p>
        </Block>

        <Block title="Radius & elevation">
          <div className="flex flex-wrap gap-6 items-end">
            {[["tag", "rounded-tag", "shadow-none"], ["panel", "rounded-panel", "shadow-bn-1"], ["panel · float", "rounded-panel", "shadow-bn-2"], ["hero object", "rounded-panel", "shadow-bn-3"]].map(([n, r, sh]) => (
              <div key={n} className="text-center">
                <div className={`w-24 h-20 bg-bn-paper border border-bn-line ${r} ${sh}`} />
                <div className="font-mono text-[11px] text-bn-muted mt-2">{n}</div>
              </div>
            ))}
          </div>
        </Block>
      </div>
    </div>
  );
}
