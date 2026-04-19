import { missionsAssets } from "../../lib/missionsAssets";

type DefeatModalProps = {
  open: boolean;
  enemyName: string;
  onRetry: () => void;
  onMap: () => void;
};

function panelBackground(src: string) {
  return {
    backgroundImage: `url(${src})`,
    backgroundRepeat: "repeat",
    backgroundSize: "32px 32px",
    imageRendering: "pixelated" as const,
  };
}

export function DefeatModal({ open, enemyName, onRetry, onMap }: DefeatModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-[1px]">
      <div
        className="ui-panel relative w-full max-w-3xl overflow-hidden border border-rose-700/80 p-4"
        style={panelBackground(missionsAssets.ui.theme.panel1)}
      >
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-rose-700/70 p-4 text-left" style={panelBackground(missionsAssets.ui.theme.panel3)}>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-rose-200">Результат боя</p>
            <h3 className="mt-2 text-5xl font-black uppercase leading-none text-rose-100">Поражение</h3>
            <p className="mt-3 text-sm text-zinc-100">
              Враг <span className="font-black text-rose-100">{enemyName}</span> оказался сильнее.
            </p>
          </div>

          <div className="border border-rose-700/70 p-4" style={panelBackground(missionsAssets.ui.theme.panel2)}>
            <div className="border border-rose-700/65 bg-black/35 p-3 text-sm text-zinc-100" style={panelBackground(missionsAssets.ui.theme.panelInterior)}>
              Попытка завершилась поражением. Можно сразу снова вступить в бой или вернуться к карте миссий.
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={onRetry}
                className="ui-btn flex-1 border border-amber-400/55 bg-amber-500/15 px-4 py-3 text-sm font-black uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/25"
              >
                Попробовать снова
              </button>
              <button
                onClick={onMap}
                className="ui-btn flex-1 border border-zinc-400/45 bg-zinc-800/35 px-4 py-3 text-sm font-black uppercase tracking-wide text-zinc-100 transition hover:bg-zinc-700/45"
              >
                Назад к миссиям
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
