import type { MapLevel } from "../../lib/mapData";
import { missionsAssets } from "../../lib/missionsAssets";

type LevelMapProps = {
  levels: MapLevel[];
  selectedLevelId: string;
  onSelectLevel: (levelId: string) => void;
};

function panelBackground(src: string) {
  return {
    backgroundImage: `url(${src})`,
    backgroundRepeat: "repeat",
    backgroundSize: "32px 32px",
    imageRendering: "pixelated" as const,
  };
}

export function LevelMap({ levels, selectedLevelId, onSelectLevel }: LevelMapProps) {
  return (
    <div className="overflow-x-auto">
      <div
        className="ui-panel relative min-w-[860px] overflow-hidden border border-amber-700/50 p-4 md:p-6"
        style={{
          backgroundImage: `
            linear-gradient(rgba(18,14,10,0.58), rgba(18,14,10,0.7)),
            url(${missionsAssets.background.tilesetField}),
            url(${missionsAssets.background.tilesetNature})
          `,
          backgroundRepeat: "no-repeat, repeat, no-repeat",
          backgroundSize: "100% 100%, 320px 240px, 720px 420px",
          backgroundPosition: "center, center, center -52px",
          imageRendering: "pixelated",
        }}
      >
        <img
          src={missionsAssets.background.tilesetElement}
          alt=""
          className="pointer-events-none absolute left-3 top-2 h-28 w-28 object-contain opacity-60"
          style={{ imageRendering: "pixelated" }}
        />
        <img
          src={missionsAssets.background.tilesetReliefDetail}
          alt=""
          className="pointer-events-none absolute right-5 top-3 h-24 w-24 object-contain opacity-55"
          style={{ imageRendering: "pixelated" }}
        />

        <div className="relative border border-amber-700/55 bg-black/30 px-8 py-10" style={panelBackground(missionsAssets.ui.theme.panel3)}>
          <div className="pointer-events-none absolute left-12 right-12 top-1/2 h-4 -translate-y-1/2 bg-[#5a4526]/85" />
          <div className="pointer-events-none absolute left-12 right-12 top-1/2 h-px -translate-y-1/2 border-t-2 border-dashed border-black/40" />

          <div className="relative flex items-start justify-between gap-3">
            {levels.map((level, index) => {
              const selected = selectedLevelId === level.id;
              const statusLabel = level.completed
                ? "пройдено"
                : level.unlocked
                  ? "доступно"
                  : `LOCK • требуется ур. ${level.enemyLevel}`;

              return (
                <div key={level.id} className="flex min-w-[140px] flex-col items-center">
                  <button
                    onClick={() => onSelectLevel(level.id)}
                    disabled={!level.unlocked && !level.completed}
                    className={`ui-slot relative z-10 flex h-16 w-16 items-center justify-center border transition ${
                      level.completed
                        ? "border-emerald-300 bg-emerald-500/20"
                        : selected
                          ? "border-amber-100 bg-amber-400/25 ring-1 ring-amber-200/50"
                          : level.unlocked
                            ? "border-cyan-300 bg-cyan-500/20"
                            : "cursor-not-allowed border-zinc-700 bg-zinc-900/65"
                    }`}
                    style={panelBackground(missionsAssets.ui.theme.panelInterior)}
                  >
                    <img
                      src={
                        level.completed
                          ? missionsAssets.items.gem
                          : level.unlocked
                            ? missionsAssets.items.scroll
                            : missionsAssets.items.ring
                      }
                      alt=""
                      className="h-8 w-8 object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                    <span className="absolute -bottom-2 border border-zinc-700 bg-black/75 px-1.5 text-[10px] font-black text-zinc-100">
                      {index + 1}
                    </span>
                  </button>

                  <p className="mt-3 text-center text-xs font-black uppercase tracking-wide text-zinc-100">{level.title}</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-200/90">{statusLabel}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

