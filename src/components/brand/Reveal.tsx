"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Fade-up once when scrolled into view. Renders static content under reduced motion. */
export function Reveal({ children, delay = 0, y = 18, className, as = "div" }:
  { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "li" | "section" }) {
  const reduce = useReducedMotion();
  const M = motion[as];
  if (reduce) return <M className={className}>{children}</M>;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </M>
  );
}
