import type { ShopItem } from "../../lib/shopData";

type EquipmentPanelProps = {
  weapon: ShopItem | null;
  armor: ShopItem | null;
  attack: number;
  defense: number;
};

export function EquipmentPanel({ weapon, armor, attack, defense }: EquipmentPanelProps) {
  return (
    <section className="ui-panel ui-frame border-white/10 bg-black/35 p-4">
      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Экипировка</h3>
      <div className="mt-3 space-y-2 text-sm text-zinc-200">
        <p>
          Оружие: <span className="text-zinc-100">{weapon?.name ?? "Не выбрано"}</span>
        </p>
        <p>
          Броня: <span className="text-zinc-100">{armor?.name ?? "Не выбрана"}</span>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="ui-card ui-frame border-white/10 bg-black/30 p-3 text-sm">
          <p className="text-zinc-400">Итоговая атака</p>
          <p className="text-lg font-bold text-zinc-100">{attack}</p>
        </div>
        <div className="ui-card ui-frame border-white/10 bg-black/30 p-3 text-sm">
          <p className="text-zinc-400">Итоговая защита</p>
          <p className="text-lg font-bold text-zinc-100">{defense}</p>
        </div>
      </div>
    </section>
  );
}
