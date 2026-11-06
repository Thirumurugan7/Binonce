import type { Metadata } from "next";
import { AttackPage } from "@/components/app/AttackPage";

export const metadata: Metadata = { title: "Attack replay · Binonce" };

export default function Page() {
  return <AttackPage />;
}
