import type { Config } from "tailwindcss";

/**
 * Design system — Binance-faithful tokens.
 * Everything visual references these names; no raw hex in components.
 * See STYLE_GUIDE.md and /styleguide.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // brand (theme-independent)
        yellow: { DEFAULT: "#F0B90B", hi: "#FCD535", press: "#D0980B" },
        // semantic (price data / attack state only) — theme-independent
        up: "#0ECB81",
        down: "#F6465D",
        // theme-aware surfaces — driven by CSS vars (see globals.css), flip on `.dark`
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          2: "rgb(var(--ink-2) / <alpha-value>)",
          3: "rgb(var(--ink-3) / <alpha-value>)",
          4: "rgb(var(--ink-4) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          soft: "rgb(var(--surface-soft) / <alpha-value>)",
          fill: "rgb(var(--surface-fill) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
        // dark surfaces kept for the /styleguide reference page
        night: { DEFAULT: "#0B0E11", 2: "#0F141B", 3: "#070A0F", line: "#1B222C" },
        dim: { DEFAULT: "#8B98A8", 2: "#5A6676" },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "Arial", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: { card: "12px", data: "8px", btn: "8px", chip: "6px" },
      boxShadow: {
        card: "rgba(32,32,37,0.05) 0px 3px 5px 0px",
        toast: "rgba(0,0,0,0.08) 0px 8px 24px",
      },
      maxWidth: { shell: "1200px" },
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
