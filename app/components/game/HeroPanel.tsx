import { StatBar } from "./StatBar";

type HeroPanelProps = {
  name: string;
  classType: string;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  attack: number;
  defense: number;
};

export function HeroPanel(props: HeroPanelProps) {
  const { name, classType, health, maxHealth, energy, maxEnergy, attack, defense } = props;

  return (
    <article className="ui-panel ui-frame border-emerald-500/25 bg-gradient-to-b from-emerald-950/35 to-black/40 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Герой</p>
      <h3 className="mt-2 text-2xl font-black">{name}</h3>
      <p className="text-sm text-zinc-400">{classType}</p>

      <div className="mt-4 space-y-3">
        <StatBar label="Здоровье" value={health} max={maxHealth} tone="health" />
        <StatBar label="Энергия" value={energy} max={maxEnergy} tone="energy" />
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
