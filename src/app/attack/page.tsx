import type { Metadata } from "next";
import { AttackPage } from "@/components/app/AttackPage";

export const metadata: Metadata = { title: "Without Chainwall · Binonce" };

export default function Page() {
  return <AttackPage />;
}
