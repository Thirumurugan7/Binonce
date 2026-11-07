import type { Metadata } from "next";
import { Pitch } from "@/components/pitch/Pitch";

export const metadata: Metadata = { title: "Binonce · the pitch" };

export default function Page() {
  return <Pitch />;
}
