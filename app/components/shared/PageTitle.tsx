import type { ReactNode } from "react";

type PageTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  rightSlot?: ReactNode;
};

export function PageTitle({ eyebrow, title, description, rightSlot }: PageTitleProps) {
  return (
    <header className="ui-panel ui-frame border-amber-500/20 bg-gradient-to-b from-stone-900/90 to-black/70 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-black uppercase text-zinc-100 md:text-4xl">
            {title}
          </h1>
          {description ? <p className="mt-3 max-w-3xl text-sm text-zinc-300">{description}</p> : null}
        </div>

        {rightSlot ? <div className="flex gap-2">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
