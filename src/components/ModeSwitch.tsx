"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, ShieldCheck } from "lucide-react";

const MODES = [
  { href: "/", label: "Attack", icon: Swords },
  { href: "/defense", label: "Defense", icon: ShieldCheck },
] as const;

export function ModeSwitch() {
  const path = usePathname();
  const active = path?.startsWith("/defense") ? "/defense" : "/";
  return (
    <div className="flex items-center gap-0.5 bg-surface-fill rounded-chip p-0.5">
      {MODES.map((m) => {
        const on = active === m.href;
        const Icon = m.icon;
        return (
          <Link
            key={m.href}
            href={m.href}
            className={`relative inline-flex items-center gap-1.5 rounded-chip px-3 h-7 text-[12.5px] font-semibold transition-colors ${
              on ? (m.href === "/defense" ? "text-up" : "text-down") : "text-ink-4 hover:text-ink-2"
            }`}
          >
            {on && <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-chip bg-surface shadow-card" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <Icon className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10">{m.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
