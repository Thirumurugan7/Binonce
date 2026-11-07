import type { Metadata } from "next";
import { DefensePage } from "@/components/app/DefensePage";

export const metadata: Metadata = { title: "With Chainwall · Binonce" };

// The defense page runs a live wallet flow (Privy/wagmi), so it can't be statically
// prerendered at build time — render it on demand instead.
export const dynamic = "force-dynamic";

export default function Page() {
  return <DefensePage />;
}
