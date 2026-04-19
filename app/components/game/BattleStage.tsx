import { missionsAssets, type EnemyVisualType, type SpriteAnimation } from "../../lib/missionsAssets";
import { SpriteAnimator } from "./SpriteAnimator";

type HealthStripProps = {
  side: "left" | "right";
  title: string;
  level: number;
  health: number;
  maxHealth: number;
};

function HealthStrip({ side, title, level, health, maxHealth }: HealthStripProps) {
  const safeMax = Math.max(1, maxHealth);
  const percent = Math.max(0, Math.min(100, Math.round((health / safeMax) * 100)));

  return (
    <div className={`absolute top-3 z-30 w-[min(42vw,360px)] ${side === "left" ? "left-3" : "right-3"}`}>
      <div className="mb-1 flex items-center justify-between text-xs font-black uppercase tracking-wide text-amber-100">
        <span>{title}</span>
        <span>Ур. {level}</span>
      </div>

      <div className="ui-card ui-frame relative h-10 border-amber-800/80 bg-black/65 px-2 py-1">
        <img
          src={missionsAssets.ui.receptacle.iconHeart}
          alt=""
          className="absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 object-contain"
          style={{ imageRendering: "pixelated" }}
        />

        <div className="absolute left-9 right-2 top-1/2 h-4 -translate-y-1/2 border border-black/70 bg-black/60 p-[3px]">
          <div
            className="absolute inset-[3px]"
            style={{
              backgroundImage: `url(${missionsAssets.ui.receptacle.lifeBarUnder})`,
              backgroundRepeat: "repeat-x",
              backgroundSize: "18px 100%",
              imageRendering: "pixelated",
            }}
          />
          <div className="absolute inset-y-[3px] left-[3px] overflow-hidden" style={{ width: `calc(${percent}% - 6px)` }}>
            <div
              className="h-full w-full"
              style={{
                backgroundImage: `url(${missionsAssets.ui.receptacle.lifeBarProgress})`,
                backgroundRepeat: "repeat-x",
                backgroundSize: "18px 100%",
                imageRendering: "pixelated",
              }}
            />
          </div>
        </div>
      </div>

      <p className="mt-1 text-[11px] font-semibold text-zinc-100">
        {health} / {safeMax} HP
      </p>
    </div>
  );
}

type HitPulse = {
  target: "hero" | "enemy";
  amount: number;
  key: number;
};

type BattleStageProps = {
  heroName: string;
  heroLevel: number;
  heroHealth: number;
  heroMaxHealth: number;
  enemyName: string;
  enemyLevel: number;
  enemyHealth: number;
  enemyMaxHealth: number;
  heroPosition: number;
  enemyVisible: boolean;
  phase: "run" | "fight" | "reward" | "afterVictory" | "defeat" | "done";
  enemyType: EnemyVisualType;
  heroAnimation: SpriteAnimation;
  enemyAnimation: SpriteAnimation;
  hitPulse: HitPulse | null;
};

export function BattleStage({
  heroName,
  heroLevel,
  heroHealth,
  heroMaxHealth,
  enemyName,
  enemyLevel,
  enemyHealth,
  enemyMaxHealth,
  heroPosition,
  enemyVisible,
  phase,
  enemyType,
  heroAnimation,
  enemyAnimation,
  hitPulse,
}: BattleStageProps) {
  const enemyPosition = 72;
  const heroSheet = missionsAssets.hero[heroAnimation];
  const enemySheet = missionsAssets.enemies[enemyType][enemyAnimation];

  return (
    <section className="ui-panel relative overflow-hidden border border-amber-700/40 bg-[#0f1115]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, rgba(10, 18, 18, 0.55), rgba(4, 8, 10, 0.88)),
            url(${missionsAssets.background.tilesetField}),
            url(${missionsAssets.background.tilesetNature}),
            url(${missionsAssets.background.tilesetRelief})
          `,
          backgroundRepeat: "no-repeat, repeat, no-repeat, no-repeat",
          backgroundSize: "100% 100%, 320px 240px, 720px 420px, 620px 360px",
          backgroundPosition: "center, center bottom, center -40px, center 14px",
          imageRendering: "pixelated",
        }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          backgroundImage: `url(${missionsAssets.background.tilesetFloor}), url(${missionsAssets.background.tilesetFloorDetail})`,
          backgroundRepeat: "repeat-x, repeat-x",
          backgroundSize: "600px 230px, 280px 80px",
          backgroundPosition: "center bottom, center bottom",
          imageRendering: "pixelated",
        }}
      />

      <img
        src={missionsAssets.background.tilesetElement}
        alt=""
        className="pointer-events-none absolute left-[16%] bottom-[28%] h-24 w-24 object-contain opacity-70"
        style={{ imageRendering: "pixelated" }}
      />
      <img
        src={missionsAssets.background.tilesetWater}
        alt=""
        className="pointer-events-none absolute right-[11%] bottom-[23%] h-24 w-36 object-contain opacity-45"
        style={{ imageRendering: "pixelated" }}
      />
      <img
        src={missionsAssets.background.tilesetReliefDetail}
        alt=""
        className="pointer-events-none absolute left-[45%] bottom-[42%] h-20 w-24 -translate-x-1/2 object-contain opacity-60"
        style={{ imageRendering: "pixelated" }}
      />

      <HealthStrip side="left" title={heroName} level={heroLevel} health={heroHealth} maxHealth={heroMaxHealth} />
      <HealthStrip side="right" title={enemyName} level={enemyLevel} health={enemyHealth} maxHealth={enemyMaxHealth} />

      <div className="relative h-[420px] px-4 pt-20 md:h-[460px] md:px-8">
        <div className="pointer-events-none absolute inset-x-10 bottom-20 h-3 border border-black/65 bg-black/60" />
        <div className="pointer-events-none absolute inset-x-16 bottom-[70px] h-8 bg-black/55 blur-md" />

        <div className="absolute bottom-[78px] z-20 transition-all duration-200" style={{ left: `calc(${heroPosition}% - 42px)` }}>
          <SpriteAnimator
            key={`hero-${heroAnimation}-${heroSheet.src}`}
            src={heroSheet.src}
            frameWidth={heroSheet.frameWidth}
            frameHeight={heroSheet.frameHeight}
            frames={heroSheet.frames}
            fps={heroSheet.fps}
            row={heroSheet.row}
            loop={heroAnimation !== "dead"}
            scale={4.8}
            className="drop-shadow-[0_10px_0_rgba(0,0,0,0.45)]"
          />
          {hitPulse?.target === "hero" ? (
            <p key={hitPulse.key} className="absolute -top-8 left-8 animate-bounce text-3xl font-black text-amber-100">
              -{hitPulse.amount}
            </p>
          ) : null}
        </div>

        {enemyVisible ? (
          <div
            className={`absolute bottom-[78px] z-20 transition-all duration-200 ${phase === "defeat" ? "opacity-80" : "opacity-100"}`}
            style={{ left: `calc(${enemyPosition}% - 42px)` }}
          >
            <SpriteAnimator
              key={`enemy-${enemyType}-${enemyAnimation}-${enemySheet.src}`}
              src={enemySheet.src}
              frameWidth={enemySheet.frameWidth}
              frameHeight={enemySheet.frameHeight}
              frames={enemySheet.frames}
              fps={enemySheet.fps}
              row={enemySheet.row}
              loop={enemyAnimation !== "dead"}
              flipX
              scale={4.8}
              className="drop-shadow-[0_10px_0_rgba(0,0,0,0.5)]"
            />
            {hitPulse?.target === "enemy" ? (
              <p key={hitPulse.key} className="absolute -top-8 left-8 animate-bounce text-3xl font-black text-amber-100">
                -{hitPulse.amount}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-amber-700/50 bg-[linear-gradient(to_bottom,#6b5631,#4f3d22)] px-4 py-2 md:px-6">
        <div className="flex items-center justify-between">
          <p className="text-lg font-black uppercase text-zinc-950">{phase === "fight" ? "Схватка" : "Маршрут"}</p>
          <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-wider text-zinc-900">
            <span>Узел I</span>
            <span>Узел II</span>
            <span>Узел III</span>
          </div>
        </div>
      </div>
    </section>
  );
}
