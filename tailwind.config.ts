import type { Config } from "tailwindcss";

/**
 * Design system — Binance-faithful tokens.
 * Everything visual references these names; no raw hex in components.
 * See STYLE_GUIDE.md and /styleguide.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // brand
        yellow: { DEFAULT: "#F0B90B", hi: "#FCD535", press: "#D0980B" },
        // light surfaces
        ink: { DEFAULT: "#1E2026", 2: "#32313A", 3: "#707A8A", 4: "#848E9C" },
        surface: { DEFAULT: "#FFFFFF", soft: "#FAFAFA", fill: "#F5F5F5" },
        line: "#E6E8EA",
        // semantic (price data only)
        up: "#0ECB81",
        down: "#F6465D",
        // dark surfaces (attack trace / demo chrome)
        night: { DEFAULT: "#0B0E11", 2: "#0F141B", 3: "#070A0F", line: "#1B222C" },
        dim: { DEFAULT: "#8B98A8", 2: "#5A6676" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "BinancePlex", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
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
