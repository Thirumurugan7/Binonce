import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "danger" | "secondary" | "ghost" | "inverse" | "inverse-ghost";
type Size = "md" | "lg";

const base =
  "bn-focus inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap " +
  "transition-[background-color,color,border-color,transform] duration-base ease-bn-out active:scale-[0.98] " +
  "disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  // on paper
  primary: "bg-bn-ink text-bn-paper hover:bg-bn-ember-ink",
  // the one destructive action (launching the attack): ember with black text, 5:1 in both themes
  danger: "bg-bn-ember text-black font-semibold hover:bg-bn-ember-glow",
  secondary: "border border-bn-ink/25 text-bn-ink hover:border-bn-ink hover:bg-bn-ink/[0.04]",
  ghost: "text-bn-ink-2 hover:text-bn-ink underline-offset-4 hover:underline",
  // on night
  inverse: "bg-bn-fog text-bn-night hover:bg-bn-ember-glow",
  "inverse-ghost": "border border-bn-fog/25 text-bn-fog hover:border-bn-fog hover:bg-bn-fog/[0.06]",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

interface Common { variant?: Variant; size?: Size; icon?: ReactNode; children: ReactNode; className?: string }

/** Brand button. Pass `href` to render a link (internal → next/link, external → new tab). */
export function Button({ variant = "primary", size = "md", icon, children, className = "", href, ...rest }:
  Common & ({ href: string } | ({ href?: undefined } & ComponentProps<"button">))) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const inner = <>{children}{icon}</>;
  if (href) {
    const external = /^https?:/.test(href);
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
    ) : (
      <Link href={href} className={cls}>{inner}</Link>
    );
  }
  return <button className={cls} {...(rest as ComponentProps<"button">)}>{inner}</button>;
}
