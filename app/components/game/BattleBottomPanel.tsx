import { useMemo, useState } from "react";

import { getHudItemIcon, missionsAssets } from "../../lib/missionsAssets";
import { SpriteAnimator } from "./SpriteAnimator";

export type MissionHudItem = {
  name: string;
  kind: string;
};

type BattleBottomPanelProps = {
  heroName: string;
  heroLevel: number;
  heroHealth: number;
  heroMaxHealth: number;
  heroAttack: number;
  heroDefense: number;
  weaponName: string | null;
  armorName: string | null;
  artifactName: string | null;
  inventorySlots: Array<MissionHudItem | null>;
  logEntries: string[];
  battleStatus: string;
  onMix: (left: MissionHudItem | null, right: MissionHudItem | null) => void;
};

function panelBackground(src: string) {
  return {
    backgroundImage: `url(${src})`,
    backgroundRepeat: "repeat",
    backgroundSize: "32px 32px",
    imageRendering: "pixelated" as const,
  };
}

function getItemIcon(item: MissionHudItem | null, index: number) {
  if (!item) return "";

  const name = item.name.toLowerCase();
  const kind = item.kind.toLowerCase();

  if (kind.includes("оруж")) return name.includes("коп") ? missionsAssets.items.lance : missionsAssets.items.sword;
  if (kind.includes("брон")) return missionsAssets.items.armor;
  if (kind.includes("арте")) return name.includes("кольц") ? missionsAssets.items.ring : missionsAssets.items.gem;
  if (kind.includes("расход")) return missionsAssets.items.potion;

  return getHudItemIcon(index);
}

export function BattleBottomPanel({
  heroName,
  heroLevel,
  heroHealth,
  heroMaxHealth,
  heroAttack,
  heroDefense,
  weaponName,
  armorName,
  artifactName,
  inventorySlots,
  logEntries,
  battleStatus,
  onMix,
}: BattleBottomPanelProps) {
  const [mixLeftIndex, setMixLeftIndex] = useState<number | null>(null);
  const [mixRightIndex, setMixRightIndex] = useState<number | null>(null);
  const [nextTarget, setNextTarget] = useState<"left" | "right">("left");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const mixLeft = useMemo(
    () => (mixLeftIndex === null ? null : inventorySlots[mixLeftIndex] ?? null),
    [inventorySlots, mixLeftIndex],
  );
  const mixRight = useMemo(
    () => (mixRightIndex === null ? null : inventorySlots[mixRightIndex] ?? null),
    [inventorySlots, mixRightIndex],
  );
  const visibleLog = logEntries.slice(-4);

  function handleInventorySelect(index: number) {
    const slot = inventorySlots[index] ?? null;
    if (!slot) return;

    setSelectedIndex(index);

    if (nextTarget === "left") {
      setMixLeftIndex(index);
      if (mixRightIndex === index) setMixRightIndex(null);
      setNextTarget("right");
      return;
    }

    setMixRightIndex(index);
    if (mixLeftIndex === index) setMixLeftIndex(null);
    setNextTarget("left");
  }

  return (
    <section
      className="ui-panel relative border border-amber-700/50 p-3 md:p-4"
      style={panelBackground(missionsAssets.ui.theme.panel2)}
    >
      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10">
        <div className="ui-card mb-3 border border-amber-700/55 p-2.5" style={panelBackground(missionsAssets.ui.theme.panel3)}>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">Журнал боя</p>
          <p className="mt-1 text-xs text-zinc-100">{battleStatus}</p>
          <div className="mt-1.5 space-y-1 text-xs text-zinc-200">
            {visibleLog.map((entry, index) => (
              <p key={`${entry}-${index}`} className="truncate border-l-2 border-amber-600/40 pl-2">
                {entry}
              </p>
            ))}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[0.92fr_1.36fr_0.8fr]">
          <aside className="ui-panel border border-amber-700/55 p-3" style={panelBackground(missionsAssets.ui.theme.panel1)}>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Панель героя</p>

            <div className="mt-2 grid grid-cols-[84px_1fr] gap-3">
              <div className="ui-card border border-amber-700/55 bg-black/45 p-2" style={panelBackground(missionsAssets.ui.theme.panelInterior)}>
                <div className="mx-auto mt-1 h-14 w-14">
                  <SpriteAnimator
                    src={missionsAssets.hero.idle.src}
                    frameWidth={missionsAssets.hero.idle.frameWidth}
                    frameHeight={missionsAssets.hero.idle.frameHeight}
                    frames={missionsAssets.hero.idle.frames}
                    fps={missionsAssets.hero.idle.fps}
                    row={missionsAssets.hero.idle.row}
                    scale={3}
                    className="mx-auto"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs text-zinc-100">
                <p className="text-sm font-black">{heroName}</p>
                <p>Уровень: {heroLevel}</p>
                <p>
                  Здоровье: {heroHealth}/{heroMaxHealth}
                </p>
                <p>Атака: {heroAttack}</p>
                <p>Защита: {heroDefense}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div className="ui-card border border-amber-700/55 p-2 text-center" style={panelBackground(missionsAssets.ui.theme.panelInterior)}>
                <img src={missionsAssets.items.sword} alt="" className="mx-auto mb-1 h-5 w-5 object-contain" style={{ imageRendering: "pixelated" }} />
                <p className="text-zinc-300">Оружие</p>
                <p className="mt-0.5 truncate text-zinc-100">{weaponName ?? "нет"}</p>
              </div>
              <div className="ui-card border border-amber-700/55 p-2 text-center" style={panelBackground(missionsAssets.ui.theme.panelInterior)}>
                <img src={missionsAssets.items.armor} alt="" className="mx-auto mb-1 h-5 w-5 object-contain" style={{ imageRendering: "pixelated" }} />
                <p className="text-zinc-300">Броня</p>
                <p className="mt-0.5 truncate text-zinc-100">{armorName ?? "нет"}</p>
              </div>
              <div className="ui-card border border-amber-700/55 p-2 text-center" style={panelBackground(missionsAssets.ui.theme.panelInterior)}>
                <img src={missionsAssets.items.ring} alt="" className="mx-auto mb-1 h-5 w-5 object-contain" style={{ imageRendering: "pixelated" }} />
                <p className="text-zinc-300">Артефакт</p>
                <p className="mt-0.5 truncate text-zinc-100">{artifactName ?? "нет"}</p>
              </div>
            </div>
          </aside>

          <div className="ui-panel border border-amber-700/55 p-3" style={panelBackground(missionsAssets.ui.theme.panel2)}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Инвентарь</p>
              <p className="text-[11px] text-zinc-300">Выберите два предмета для смешивания</p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }).map((_, index) => {
                const item = inventorySlots[index] ?? null;
                const selected = selectedIndex === index;
                const usedForMix = mixLeftIndex === index || mixRightIndex === index;
                const icon = getItemIcon(item, index);

                return (
                  <button
                    key={`hud-slot-${index}`}
                    onClick={() => handleInventorySelect(index)}
                    className={`ui-slot min-h-16 border p-1 text-center transition ${
                      selected ? "border-cyan-300/70" : "border-amber-700/55"
                    } ${usedForMix ? "ring-1 ring-amber-300/55" : ""}`}
                    style={panelBackground(missionsAssets.ui.theme.panelInterior)}
                  >
                    {item ? (
                      <>
                        <img src={icon} alt="" className="mx-auto h-6 w-6 object-contain" style={{ imageRendering: "pixelated" }} />
                        <p className="text-[11px] font-semibold text-zinc-100">{item.name}</p>
                        <p className="text-[10px] text-zinc-300">{item.kind}</p>
                      </>
                    ) : (
                      <p className="pt-4 text-[10px] text-zinc-500">Пусто</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="ui-panel border border-amber-700/55 p-3" style={panelBackground(missionsAssets.ui.theme.panel1)}>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Смешивание</p>

            <div className="mt-3 space-y-2 text-xs">
              <div className="ui-card border border-amber-700/55 p-2 text-zinc-100" style={panelBackground(missionsAssets.ui.theme.panelInterior)}>
                {mixLeft ? `${mixLeft.name} (${mixLeft.kind})` : "Первый предмет"}
              </div>
              <div className="text-center text-zinc-500">+</div>
              <div className="ui-card border border-amber-700/55 p-2 text-zinc-100" style={panelBackground(missionsAssets.ui.theme.panelInterior)}>
                {mixRight ? `${mixRight.name} (${mixRight.kind})` : "Второй предмет"}
              </div>
              <div className="text-center text-zinc-500">↓</div>
              <div className="ui-card border border-amber-700/55 p-2 text-cyan-100" style={panelBackground(missionsAssets.ui.theme.panel3)}>
                {mixLeft && mixRight ? "Новый предмет готов к созданию" : "Ожидает два предмета"}
              </div>
            </div>

            <button
              onClick={() => onMix(mixLeft, mixRight)}
              className="ui-btn mt-3 w-full border border-cyan-500/60 bg-cyan-500/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-500/25"
            >
              MIX
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
