import type { Metadata } from "next";

export const metadata: Metadata = { title: "Style guide" };

const SWATCHES: { name: string; token: string; hex: string; dark?: boolean }[] = [
  { name: "Yellow", token: "yellow", hex: "#F0B90B" },
  { name: "Yellow hi", token: "yellow-hi", hex: "#FCD535" },
  { name: "Ink", token: "ink", hex: "#1E2026", dark: true },
  { name: "Ink 3", token: "ink-3", hex: "#707A8A", dark: true },
  { name: "Fill", token: "surface-fill", hex: "#F5F5F5" },
  { name: "Line", token: "line", hex: "#E6E8EA" },
  { name: "Up", token: "up", hex: "#0ECB81" },
  { name: "Down", token: "down", hex: "#F6465D" },
  { name: "Night", token: "night", hex: "#0B0E11", dark: true },
  { name: "Dim", token: "dim", hex: "#8B98A8" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-ink-3 mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function StyleGuide() {
  return (
    <main className="max-w-shell mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold">Design system</h1>
      <p className="text-ink-3 mt-2 max-w-[60ch]">
        Binance-faithful tokens. Every component references these names — no raw hex in the UI. Defined in
        <code className="font-mono text-[13px] bg-surface-fill px-1.5 py-0.5 rounded mx-1">tailwind.config.ts</code>.
      </p>

      <Section title="Color">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {SWATCHES.map((s) => (
            <div key={s.token} className="rounded-data border border-line overflow-hidden">
              <div className="h-16" style={{ background: s.hex }} />
              <div className="px-3 py-2">
                <div className="text-[13px] font-semibold">{s.name}</div>
                <div className="font-mono text-[11px] text-ink-4">{s.token}</div>
                <div className="font-mono text-[11px] text-ink-4">{s.hex}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="space-y-2">
          <p className="text-[30px] font-semibold tracking-[-0.5px]">Estimated balance — 30 / 600</p>
          <p className="text-xl font-bold">Section heading — 20 / 700</p>
          <p className="text-sm font-semibold">Nav & labels — 14 / 600</p>
          <p className="text-[13px] text-ink-3">Body & metadata — 13 / 400</p>
          <p className="font-mono text-[11.5px] text-ink-4">Mono — tx hashes, nonces, logs</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <button className="rounded-btn px-5 py-2.5 font-semibold text-sm bg-yellow text-ink hover:bg-yellow-hi">Primary</button>
          <button className="rounded-btn px-5 py-2.5 font-semibold text-sm bg-surface-fill text-ink hover:bg-[#EEEEF0]">Secondary</button>
          <button className="rounded-btn px-4 py-2.5 font-semibold text-[13px] bg-down text-white">Destructive</button>
          <button className="rounded-btn px-5 py-2.5 font-semibold text-sm bg-surface-fill text-ink-4 cursor-not-allowed" disabled>Disabled</button>
        </div>
      </Section>

      <Section title="Semantic (price data only)">
        <div className="flex gap-6 text-sm font-medium">
          <span className="text-up">+0.86%</span>
          <span className="text-down">-1.24%</span>
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex gap-4 items-end">
          {[["chip", "6"], ["btn / data", "8"], ["card", "12"]].map(([n, px]) => (
            <div key={n} className="text-center">
              <div className="w-20 h-20 bg-surface border border-line" style={{ borderRadius: `${px}px` }} />
              <div className="text-[12px] text-ink-4 mt-1.5">{n} · {px}px</div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
