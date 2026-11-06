import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/brand";
import { BrandSection } from "./BrandSection";

export const metadata: Metadata = { title: "Design system · Binonce" };

export default function StyleGuide() {
  return (
    <>
      <div className="max-w-page mx-auto px-6 pt-6 flex items-center justify-between">
        <Link href="/" className="bn-focus rounded text-[14px] text-bn-ink-2 hover:text-bn-ink">← Binonce</Link>
        <ThemeToggle />
      </div>
      <BrandSection />
    </>
  );
}
