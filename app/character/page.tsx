"use client";

import Image from "next/image";

import { GameFrame } from "../components/game/GameFrame";
import { EquipmentPanel } from "../components/game/EquipmentPanel";
import { PageTitle } from "../components/shared/PageTitle";
import { SectionCard } from "../components/shared/SectionCard";
import { getEquippedItems, getInventoryItems } from "../lib/inventoryUtils";
import { usePlayer } from "../lib/playerStore";
import { getLevelRange } from "../lib/playerUtils";

const CLASS_AVATAR_MAP = {
  Воин: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_warrior.png",
  Страж: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_healer.png",
  Следопыт: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_rogue.png",
  Мистик: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_wizard.png",
} as const;

export default function CharacterPage() {
  const player = usePlayer();
  const equipped = getEquippedItems(player);
  const inventoryItems = getInventoryItems(player.inventory);
  const xpRange = getLevelRange(player.level);
  const xpInsideLevel = player.xp - xpRange.min;
  const xpNeed = xpRange.max - xpRange.min;
  const xpPercent = Math.min(100, Math.max(0, (xpInsideLevel / Math.max(1, xpNeed)) * 100));

  return (
    <GameFrame player={player} active="character">
      <PageTitle
        eyebrow="Лист героя"
        title="Персонаж"
        description="Центральный блок героя, экипировка и прогресс прокачки в одном месте."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <SectionCard title="Герой" subtitle="Центральный RPG-блок персонажа">
            <div className="hero-core ui-card ui-frame relative overflow-hidden border-cyan-300/20 p-4 md:p-5">
              <div className="pointer-events-none absolute inset-0 opacity-30">
                <Image
                  src="/habitica-ref/HabitRPG-habitica-images-32a4678/backgrounds/background_hall_of_heroes.png"
                  alt="Зал героев"
                  fill
                  className="pixel-art object-cover"
                />
              </div>

              <div className="relative grid gap-4 md:grid-cols-[110px_1fr]">
                <div className="ui-slot subtle-glow-cyan w-fit border border-cyan-200/30 bg-black/45 p-3">
                  <Image
                    src={CLASS_AVATAR_MAP[player.classType]}
                    alt="Аватар героя"
                    width={92}
                    height={92}
                    className="pixel-art h-[92px] w-[92px]"
                  />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/85">Активный герой</p>
                  <h2 className="mt-1 text-2xl font-black text-zinc-100">{player.name}</h2>
                  <p className="text-sm text-zinc-300">
                    {player.classType} • Уровень {player.level}
                  </p>

                  <div className="mt-3 ui-slot overflow-hidden border border-cyan-300/25 bg-black/40">
                    <div
                      className="progress-live h-2.5 bg-gradient-to-r from-cyan-300/80 via-sky-300/90 to-indigo-300/85"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Опыт в уровне: {xpInsideLevel}/{xpNeed}
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="ui-card ui-frame border-white/10 bg-black/35 px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Энергия</p>
                      <p className="font-bold text-cyan-100">
                        {player.energy}/{player.maxEnergy}
                      </p>
                    </div>
                    <div className="ui-card ui-frame border-white/10 bg-black/35 px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Золото</p>
                      <p className="font-bold text-amber-200">{player.gold}</p>
                    </div>
                    <div className="ui-card ui-frame border-white/10 bg-black/35 px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Серия</p>
                      <p className="font-bold text-violet-200">{player.streak} д.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <div className="ui-card ui-frame flex items-center gap-2 border-amber-300/20 bg-amber-500/10 p-3">
                <Image
                  src="/habitica-ref/HabitRPG-habitica-images-32a4678/notifications/notif_weapon_special_takeThis.png"
                  alt="Оружие"
                  width={32}
                  height={32}
                  className="pixel-art h-8 w-8"
                />
                <div>
                  <p className="text-[11px] text-amber-100/80">Оружие</p>
                  <p className="text-sm font-semibold text-zinc-100">{equipped.weapon?.name ?? "Не выбрано"}</p>
                </div>
              </div>
              <div className="ui-card ui-frame flex items-center gap-2 border-cyan-300/20 bg-cyan-500/10 p-3">
                <Image
                  src="/habitica-ref/HabitRPG-habitica-images-32a4678/notifications/notif_armor_special_takeThis.png"
                  alt="Броня"
                  width={32}
                  height={32}
                  className="pixel-art h-8 w-8"
                />
                <div>
                  <p className="text-[11px] text-cyan-100/85">Броня</p>
                  <p className="text-sm font-semibold text-zinc-100">{equipped.armor?.name ?? "Не выбрана"}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Основные характеристики" subtitle="Состояние персонажа">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Здоровье</p>
                <p className="mt-1 text-2xl font-black">
                  {player.health} / {player.maxHealth}
                </p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Энергия</p>
                <p className="mt-1 text-2xl font-black">
                  {player.energy} / {player.maxEnergy}
                </p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Атака</p>
                <p className="mt-1 text-2xl font-black">{player.attack}</p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Защита</p>
                <p className="mt-1 text-2xl font-black">{player.defense}</p>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <EquipmentPanel
            weapon={equipped.weapon}
            armor={equipped.armor}
            attack={player.attack}
            defense={player.defense}
          />

          <SectionCard title="Прогресс кампании" subtitle="Состояние прохождения">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Пройдено уровней</p>
                <p className="mt-1 text-2xl font-black">{player.completedLevels.length}</p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Попыток боев</p>
                <p className="mt-1 text-2xl font-black">
                  {Object.values(player.missionProgress).reduce((sum, item) => sum + item.attempts, 0)}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Инвентарь героя" subtitle="Предметы в рюкзаке">
            <div className="space-y-2">
              {inventoryItems.length === 0 ? (
                <p className="text-sm text-zinc-400">Рюкзак пуст.</p>
              ) : (
                inventoryItems.map((item) => (
                  <div key={item.id} className="ui-card ui-frame border-white/10 bg-black/30 p-3 text-sm">
                    <p className="font-semibold text-zinc-100">{item.name}</p>
                    <p className="text-zinc-400">{item.description}</p>
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
