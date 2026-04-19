import Image from "next/image";
import Link from "next/link";

import type { Player } from "../../lib/playerStore";
import { getLevelRange } from "../../lib/playerUtils";
import { StatBar } from "./StatBar";

type TopBarProps = {
  player: Player;
};

const CLASS_AVATAR_MAP: Record<Player["classType"], string> = {
  Воин: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_warrior.png",
  Страж: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_healer.png",
  Следопыт: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_rogue.png",
  Мистик: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_wizard.png",
};

export function TopBar({ player }: TopBarProps) {
  const levelRange = getLevelRange(player.level);
  const currentXp = player.xp - levelRange.min;
  const xpNeed = levelRange.max - levelRange.min;
  const xpPercent = Math.min(100, Math.max(0, (currentXp / Math.max(1, xpNeed)) * 100));

  return (
    <div className="ui-panel ui-frame relative overflow-hidden border-white/15 px-5 py-4">
      <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-8 h-44 w-44 rounded-full bg-amber-300/15 blur-3xl" />

      <div className="relative grid gap-4 xl:grid-cols-[1.18fr_1.82fr]">
        <div className="hero-core ui-card ui-frame border-cyan-300/20 p-3">
          <div className="flex items-center gap-3">
            <div className="ui-slot subtle-glow-cyan border border-cyan-200/25 bg-black/40 p-2">
              <Image
                src={CLASS_AVATAR_MAP[player.classType]}
                alt={`Аватар: ${player.classType}`}
                width={88}
                height={88}
                className="pixel-art h-[72px] w-[72px] md:h-[88px] md:w-[88px]"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/85">Герой</p>
                {player.role === "admin" ? (
                  <span className="rounded border border-red-400/35 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-100">
                    Админ
                  </span>
                ) : null}
              </div>
              <h2 className="truncate text-xl font-black text-zinc-100 md:text-2xl">{player.name}</h2>
              <p className="text-xs text-zinc-300 md:text-sm">
                {player.classType} • Уровень {player.level}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Опыт: {currentXp}/{xpNeed}
              </p>
              {player.role === "admin" ? (
                <Link href="/admin" className="mt-1 inline-block text-xs text-amber-200 underline underline-offset-4">
                  Панель управления
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            <div className="ui-slot overflow-hidden border border-cyan-300/25 bg-black/45">
              <div
                className="progress-live h-2.5 bg-gradient-to-r from-cyan-300/80 via-sky-300/90 to-indigo-300/85"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <StatBar label="Здоровье" value={player.health} max={player.maxHealth} tone="health" />
          <StatBar label="Энергия" value={player.energy} max={player.maxEnergy} tone="energy" />
          <StatBar label="Опыт" value={currentXp} max={xpNeed} tone="xp" />

          <div className="ui-card ui-frame subtle-glow-amber flex items-center gap-2 border-amber-300/25 bg-amber-500/10 px-3 py-2">
            <Image
              src="/habitica-ref/HabitRPG-habitica-images-32a4678/shop/shop_gem.png"
              alt="Иконка золота"
              width={32}
              height={32}
              className="pixel-art h-7 w-7"
            />
            <div>
              <p className="text-xs text-amber-100/85">Золото</p>
              <p className="text-lg font-black text-amber-200">{player.gold}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
