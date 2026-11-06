import type { Metadata } from "next";
import { DefensePage } from "@/components/app/DefensePage";

export const metadata: Metadata = { title: "Defense · Binonce" };

export default function Page() {
  return <DefensePage />;
}
