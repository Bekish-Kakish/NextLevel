type BattleLogProps = {
  entries: string[];
};

export function BattleLog({ entries }: BattleLogProps) {
  const visibleEntries = entries.slice(-8);

  return (
    <section className="ui-panel ui-frame border-white/10 bg-black/45 p-4">
      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Журнал боя</h3>
      <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1 text-sm text-zinc-200">
        {visibleEntries.map((entry, index) => (
          <p key={`${entry}-${index}`} className="ui-card ui-frame border-white/5 bg-black/25 px-3 py-2">
            {entry}
          </p>
        ))}
      </div>
    </section>
  );
}
