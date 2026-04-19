import type { ReactNode } from "react";
import Image from "next/image";

import type { Player } from "../../lib/playerStore";
import { NavButton } from "../shared/NavButton";
import { TopBar } from "./TopBar";

type GameFrameProps = {
  player: Player;
  active: "dashboard" | "tasks" | "missions" | "character" | "shop" | "inventory" | "admin";
  children: ReactNode;
};

export function GameFrame({ player, active, children }: GameFrameProps) {
  return (
    <main className="game-ui relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(251,146,60,0.2),transparent_30%),radial-gradient(circle_at_80%_5%,rgba(34,211,238,0.14),transparent_26%),linear-gradient(to_bottom,#06080f,#0a101c)] px-4 py-5 text-zinc-100 md:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <Image
          src="/habitica-ref/HabitRPG-habitica-images-32a4678/backgrounds/background_dark_deep.png"
          alt="Фон игрового мира"
          fill
          className="pixel-art object-cover"
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5">
        <TopBar player={player} />

        <nav className="ui-panel ui-frame flex flex-wrap gap-2 border-white/12 bg-black/35 p-3">
          <NavButton href="/app/dashboard" active={active === "dashboard"}>
            Панель
          </NavButton>
          <NavButton href="/app/tasks" active={active === "tasks"}>
            Задачи
          </NavButton>
          <NavButton href="/app/missions" active={active === "missions"}>
            Миссии
          </NavButton>
          <NavButton href="/app/inventory" active={active === "inventory"}>
            Инвентарь
          </NavButton>
          <NavButton href="/app/shop" active={active === "shop"}>
            Магазин
          </NavButton>
          <NavButton href="/app/character" active={active === "character"}>
            Персонаж
          </NavButton>
          {player.role === "admin" ? (
            <NavButton href="/admin" active={active === "admin"}>
              Админ
            </NavButton>
          ) : null}
        </nav>

        {children}
      </div>
    </main>
  );
}
