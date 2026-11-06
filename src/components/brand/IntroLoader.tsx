import { Mark } from "./Mark";

/**
 * First-visit intro: the mark signs its nonces, the first one lands, then the curtain lifts.
 * CSS-only and decorative (aria-hidden); content underneath is already rendered and reachable.
 */
export function IntroLoader() {
  return (
    <div className="bn-intro fixed inset-0 z-[200] bg-bn-paper text-bn-ink grid place-items-center" aria-hidden>
      <div className="flex flex-col items-center">
        <Mark size={72} animate="once" />
        <div className="bn-intro-word mt-6 font-serif text-[44px] leading-none tracking-[-0.01em]">Binonce</div>
        <div className="bn-intro-cap mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-bn-muted">50 signatures · 1 lands</div>
      </div>
    </div>
  );
}
