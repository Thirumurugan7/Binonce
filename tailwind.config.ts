import type { Config } from "tailwindcss";

/**
 * Binonce design tokens. Colors are CSS vars in globals.css (light + `.dark`).
 * No raw hex in components. See DESIGN_SYSTEM.md and /styleguide.
 */
const bn = (v: string) => `rgb(var(--bn-${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Binonce brand ──
        bn: {
          paper: bn("paper"), "paper-2": bn("paper-2"),
          card: bn("card"), ink: bn("ink"), "ink-2": bn("ink-2"), muted: bn("muted"), line: bn("line"),
          night: bn("night"), "night-2": bn("night-2"), "night-line": bn("night-line"),
          fog: bn("fog"), "fog-2": bn("fog-2"),
          ember: bn("ember"), "ember-ink": bn("ember-ink"), "ember-glow": bn("ember-glow"),
          seal: bn("seal"), "seal-glow": bn("seal-glow"),
          amber: bn("amber"), "amber-glow": bn("amber-glow"),
          gold: bn("gold"), "gold-soft": bn("gold-soft"),
          info: bn("info"),
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "Arial", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        serif: ["var(--font-serif)", "Iowan Old Style", "Georgia", "serif"],
      },
      // Brand type scale (landing). Fluid display sizes; body sizes are fixed.
      fontSize: {
        "display-xl": ["clamp(3rem, 7.4vw, 6.75rem)", { lineHeight: "0.94", letterSpacing: "-0.025em" }],
        "display-l": ["clamp(2.5rem, 5.2vw, 4.5rem)", { lineHeight: "1", letterSpacing: "-0.02em" }],
        "display-m": ["clamp(2rem, 3.6vw, 3.25rem)", { lineHeight: "1.04", letterSpacing: "-0.015em" }],
        "display-s": ["clamp(1.5rem, 2.4vw, 2rem)", { lineHeight: "1.12", letterSpacing: "-0.01em" }],
        "body-l": ["1.1875rem", { lineHeight: "1.6" }],
        eyebrow: ["0.75rem", { lineHeight: "1", letterSpacing: "0.14em" }],
      },
      borderRadius: { data: "8px", panel: "14px", tag: "4px" },
      boxShadow: {
        // brand elevation: 1 = resting card on paper, 2 = floating panel, 3 = hero object
        "bn-1": "0 1px 0 rgb(var(--bn-shadow) / 0.04), 0 1px 2px rgb(var(--bn-shadow) / 0.06)",
        "bn-2": "0 2px 4px rgb(var(--bn-shadow) / 0.05), 0 12px 32px -8px rgb(var(--bn-shadow) / 0.18)",
        "bn-3": "0 4px 8px rgb(var(--bn-shadow) / 0.06), 0 40px 80px -24px rgb(var(--bn-shadow) / 0.45)",
      },
      maxWidth: { page: "1240px", prose: "62ch" },
      transitionTimingFunction: { "bn-out": "cubic-bezier(.16, 1, .3, 1)" },
      transitionDuration: { fast: "150ms", base: "240ms", slow: "480ms" },
      keyframes: {
        beat: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
        toastin: { from: { transform: "translateX(120%)", opacity: "0" }, to: { transform: "translateX(0)", opacity: "1" } },
      },
      animation: { beat: "beat 1s infinite", toastin: "toastin .35s cubic-bezier(.2,.8,.2,1) forwards" },
    },
  },
  plugins: [],
};
export default config;
