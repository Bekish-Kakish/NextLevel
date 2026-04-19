"use client";

import { useState } from "react";

import { EquipmentPanel } from "../components/game/EquipmentPanel";
import { GameFrame } from "../components/game/GameFrame";
import { InventoryGrid } from "../components/game/InventoryGrid";
import { PageTitle } from "../components/shared/PageTitle";
import { SectionCard } from "../components/shared/SectionCard";
import { getEquippedItems, getFusionDrafts, getInventoryGrid, getInventoryItems } from "../lib/inventoryUtils";
import { equipPlayerItem, usePlayer } from "../lib/playerStore";

export default function InventoryPage() {
  const player = usePlayer();
  const [notice, setNotice] = useState<string | null>(null);

  const slots = getInventoryGrid(player.inventory, 16);
  const items = getInventoryItems(player.inventory);
  const equipped = getEquippedItems(player);
  const fusionDrafts = getFusionDrafts(player.inventory);

  function handleEquip(itemId: number) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;

    const result = equipPlayerItem(item);

    if (result) {
      setNotice(`Предмет «${item.name}» надет.`);
      return;
    }

    setNotice("Этот предмет нельзя надеть.");
  }

  return (
    <GameFrame player={player} active="inventory">
      <PageTitle
        eyebrow="Рюкзак героя"
        title="Инвентарь"
        description="Сетка 4x4 для предметов, экипировка и заготовки для будущего смешивания."
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Сетка предметов" subtitle="Хранилище 4x4">
          <InventoryGrid
            slots={slots}
            equippedWeaponId={player.equippedWeapon}
            equippedArmorId={player.equippedArmor}
          />
        </SectionCard>

        <div className="space-y-5">
          <EquipmentPanel
            weapon={equipped.weapon}
            armor={equipped.armor}
            attack={player.attack}
            defense={player.defense}
          />

          <SectionCard title="Управление предметами" subtitle="Подготовка к бою">
            {notice ? (
              <p className="ui-card ui-frame mb-3 border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {notice}
              </p>
            ) : null}

            <div className="space-y-2">
              {items
                .filter((item) => item.type !== "artifact")
                .map((item) => {
                  const equippedNow =
                    item.type === "weapon"
                      ? player.equippedWeapon === item.id
                      : player.equippedArmor === item.id;

                  return (
                    <div key={item.id} className="ui-card ui-frame border-white/10 bg-black/30 p-3">
                      <p className="font-semibold text-zinc-100">{item.name}</p>
                      <p className="text-xs text-zinc-400">{item.description}</p>

                      <button
                        onClick={() => handleEquip(item.id)}
                        disabled={equippedNow}
                        className={`ui-btn mt-2 border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          equippedNow
                            ? "cursor-not-allowed border-white/15 bg-black/20 text-zinc-500"
                            : "border-cyan-500/35 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                        }`}
                      >
                        {equippedNow ? "Надето" : "Надеть"}
                      </button>
                    </div>
                  );
                })}

              {items.filter((item) => item.type !== "artifact").length === 0 ? (
                <p className="text-sm text-zinc-400">Нет доступных предметов для экипировки.</p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Подготовка к смешиванию" subtitle="Будущая механика комбинирования">
            <div className="space-y-2 text-sm">
              {fusionDrafts.length === 0 ? (
                <p className="text-zinc-400">Нет артефактов для заготовок.</p>
              ) : (
                fusionDrafts.map((draft, index) => (
                  <div key={`${draft.leftItem.id}-${index}`} className="ui-card ui-frame border-white/10 bg-black/30 p-3">
                    <p className="font-semibold text-zinc-100">
                      {draft.leftItem.name} + {draft.rightItem.name}
                    </p>
                    <p className="text-zinc-400">
                      Ожидаемый результат: {draft.projectedType}. Состояние: {draft.ready ? "готово" : "нужно больше материалов"}.
                    </p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </GameFrame>
  );
}
