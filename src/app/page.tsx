import { LandingNav, Hero, Cases, Timeline, Anatomy, TwoViews, Chainwall, Blacklist, RunIt, Footer } from "@/components/landing";
import { IntroLoader } from "@/components/brand";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <IntroLoader />
      <a href="#drain" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-bn-ink focus:text-bn-paper focus:px-4 focus:py-2 focus:rounded-full">
        Skip to content
      </a>
      <LandingNav />
      <main>
        <Hero />
        <Cases />
        <Timeline />
        <Anatomy />
        <TwoViews />
        <Chainwall />
        <Blacklist />
        <RunIt />
      </main>
      <Footer />
    </div>
  );
}
