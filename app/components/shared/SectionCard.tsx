import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, subtitle, children, className = "" }: SectionCardProps) {
  return (
    <section
      className={`ui-panel ui-frame relative overflow-hidden border-white/12 bg-zinc-950/75 p-5 ${className}`}
    >
      {title ? (
        <div className="mb-4 border-b border-white/10 pb-3">
          <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-100">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
