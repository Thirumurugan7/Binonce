"use client";

import { useRef, type ReactNode } from "react";
import { useInView } from "framer-motion";

/** Marks a key phrase: an ember marker stroke sweeps across it the first time it scrolls into view. */
export function Hl({ children, onNight }: { children: ReactNode; onNight?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const on = useInView(ref, { once: true, margin: "0px 0px -18% 0px" });
  return <mark ref={ref} data-on={on} className={`bn-hl ${onNight ? "bn-hl--night" : ""} bg-transparent text-inherit`}>{children}</mark>;
}
