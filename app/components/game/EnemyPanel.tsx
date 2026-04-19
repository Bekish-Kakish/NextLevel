import { StatBar } from "./StatBar";

type EnemyPanelProps = {
  title: string;
  level: number;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
};

export function EnemyPanel({
  title,
  level,
  health,
  maxHealth,
  attack,
  defense,
}: EnemyPanelProps) {
  return (
    <article className="ui-panel ui-frame border-rose-500/25 bg-gradient-to-b from-rose-950/35 to-black/40 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-rose-300">Противник</p>
      <h3 className="mt-2 text-2xl font-black">{title}</h3>
      <p className="text-sm text-zinc-400">Уровень врага: {level}</p>

      <div className="mt-4 space-y-3">
        <StatBar label="Здоровье" value={health} max={maxHealth} tone="health" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="ui-card ui-frame border-white/10 bg-black/30 p-3">
          <p className="text-zinc-400">Атака</p>
          <p className="text-lg font-bold">{attack}</p>
        </div>
        <div className="ui-card ui-frame border-white/10 bg-black/30 p-3">
          <p className="text-zinc-400">Защита</p>
          <p className="text-lg font-bold">{defense}</p>
        </div>
      </div>
    </article>
  );
}
