import { missionsAssets } from "../../lib/missionsAssets";

type RewardModalProps = {
  open: boolean;
  enemyName: string;
  rewardXp: number;
  rewardGold: number;
  droppedItems: string[];
  rewardCollected: boolean;
  onCollect: () => void;
  onContinue: () => void;
};

function panelBackground(src: string) {
  return {
    backgroundImage: `url(${src})`,
    backgroundRepeat: "repeat",
    backgroundSize: "32px 32px",
    imageRendering: "pixelated" as const,
  };
}

export function RewardModal({
  open,
  enemyName,
  rewardXp,
  rewardGold,
  droppedItems,
  rewardCollected,
  onCollect,
  onContinue,
}: RewardModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-[1px]">
      <div
        className="ui-panel relative w-full max-w-4xl overflow-hidden border border-amber-700/85 p-4"
        style={panelBackground(missionsAssets.ui.theme.panel1)}
      >
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-amber-700/70 p-4 text-left" style={panelBackground(missionsAssets.ui.theme.panel3)}>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-200">Результат боя</p>
            <h3 className="mt-2 text-5xl font-black uppercase leading-none text-amber-50">Победа</h3>
            <p className="mt-3 text-sm text-zinc-100">
              Враг <span className="font-black text-amber-100">{enemyName}</span> повержен.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
              <div className="border border-amber-700/70 p-3 text-zinc-100" style={panelBackground(missionsAssets.ui.theme.panelInterior)}>
                <p className="text-xs uppercase tracking-wide text-zinc-300">Опыт</p>
                <p className="text-xl font-black text-amber-100">+{rewardXp}</p>
              </div>
              <div className="border border-amber-700/70 p-3 text-zinc-100" style={panelBackground(missionsAssets.ui.theme.panelInterior)}>
                <p className="text-xs uppercase tracking-wide text-zinc-300">Золото</p>
                <div className="flex items-center gap-2">
                  <img src={missionsAssets.items.gold} alt="" className="h-5 w-5 object-contain" style={{ imageRendering: "pixelated" }} />
                  <p className="text-xl font-black text-amber-100">+{rewardGold}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-amber-700/70 p-4" style={panelBackground(missionsAssets.ui.theme.panel2)}>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-100">Выпавшие предметы</p>
            <div className="grid min-h-[112px] grid-cols-2 gap-2 border border-amber-700/60 p-2" style={panelBackground(missionsAssets.ui.theme.panelInterior)}>
              {droppedItems.map((item, index) => (
                <div key={`${item}-${index}`} className="ui-card flex items-center gap-2 border border-amber-700/65 bg-black/35 p-2 text-xs text-zinc-100">
                  <img
                    src={[missionsAssets.items.gem, missionsAssets.items.scroll, missionsAssets.items.ring, missionsAssets.items.potion][index % 4]}
                    alt=""
                    className="h-5 w-5 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={onCollect}
                disabled={rewardCollected}
                className={`ui-btn flex-1 border px-4 py-3 text-sm font-black uppercase tracking-wide transition ${
                  rewardCollected
                    ? "cursor-not-allowed border-zinc-700 bg-zinc-900/70 text-zinc-500"
                    : "border-amber-400/60 bg-amber-500/18 text-amber-100 hover:bg-amber-500/28"
                }`}
              >
                {rewardCollected ? "Награда получена" : "Забрать награду"}
              </button>
              <button
                onClick={onContinue}
                className="ui-btn flex-1 border border-emerald-400/55 bg-emerald-500/15 px-4 py-3 text-sm font-black uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/25"
              >
                Продолжить путь
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
