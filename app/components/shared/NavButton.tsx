import Link from "next/link";
import type { ReactNode } from "react";

type NavButtonProps = {
  href: string;
  children: ReactNode;
  active?: boolean;
};

export function NavButton({ href, children, active = false }: NavButtonProps) {
  return (
    <Link
      href={href}
      className={`ui-btn border px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
        active
          ? "subtle-glow-amber border-amber-300/50 bg-amber-500/20 text-amber-100"
          : "border-white/15 bg-black/25 text-zinc-300 hover:border-cyan-300/35 hover:bg-cyan-500/10 hover:text-cyan-100"
      }`}
    >
      {children}
    </Link>
  );
}
