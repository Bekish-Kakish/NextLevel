"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SpriteAnimator } from "../components/game/SpriteAnimator";
import { completeCampaignMissionNode, getCampaignNodeById } from "../lib/campaignMap";
import {
  type BattleActionType,
  type BattleResolution,
  type BattleState,
  createInitialBattleState,
  resolveEnemyTurn,
  resolveHeroAction,
} from "../lib/battleEngine";
import { getLevelById, getMapLevels } from "../lib/mapData";
import {
  buildMissionProfileKey,
  MISSION_DAILY_LIMIT,
  getMissionLootChanceByDifficulty,
  getMissionRunsDebug,
  getMissionRunsRemainingToday,
  getMissionRunsToday,
  registerMissionRun,
} from "../lib/missionRules";
import { getEnemyVisualType, missionsAssets, type SpriteAnimation } from "../lib/missionsAssets";
import {
  consumePlayerEnergy,
  finishBattleDefeat,
  finishBattleVictory,
  getPlayer,
  startMissionProgress,
  updatePlayer,
  usePlayer,
} from "../lib/playerStore";
import { getShopItemById } from "../lib/shopData";
import styles from "./battle-screen.module.css";

type FloatingHit = {
  id: number;
  target: "hero" | "enemy";
  amount: number;
  mode: "damage" | "heal" | "critical";
};

type RewardSummary = {
  xp: number;
  gold: number;
  loot: string | null;
};

type ActionButton = {
  action: BattleActionType;
  label: string;
  hint: string;
};

type LootDropEntry = {
  label: string;
  chance: number;
  itemId?: number;
  goldBonus?: number;
};

const ACTIONS: ActionButton[] = [
  { action: "attack", label: "Атака", hint: "Надёжный удар по одной цели" },
  { action: "skill", label: "Навык", hint: "Мощный удар (перезарядка 2 хода)" },
  { action: "item", label: "Предмет", hint: "Использовать лечебное зелье" },
  { action: "defend", label: "Защита", hint: "Снижает входящий урон" },
];

const LOOT_TABLE_BY_MISSION: Record<string, LootDropEntry[]> = {
  "lesnoy-razboynik": [
    { label: "Ржавый меч", chance: 15, itemId: 8 },
    { label: "Тканевая броня", chance: 10, itemId: 9 },
    { label: "Тайник с золотом", chance: 75, goldBonus: 8 },
  ],
  "peshchernyy-zver": [
    { label: "Клыкастый кинжал", chance: 15, itemId: 10 },
    { label: "Кожаная броня", chance: 10, itemId: 11 },
    { label: "Тайник с золотом", chance: 75, goldBonus: 10 },
  ],
  "strazh-ruin": [
    { label: "Кожаная броня", chance: 24, itemId: 11 },
    { label: "Тайник с золотом", chance: 76, goldBonus: 14 },
  ],
  "tenevoy-okhotnik": [
    { label: "Пепельная алебарда", chance: 18, itemId: 12 },
    { label: "Тайник с золотом", chance: 82, goldBonus: 20 },
  ],
  "vladyka-pepla": [
    { label: "Доспех хранителя", chance: 18, itemId: 13 },
    { label: "Тайник с золотом", chance: 82, goldBonus: 30 },
  ],
};

function getDifficultyLabel(value: "easy" | "medium" | "hard") {
  if (value === "easy") return "Лёгкая";
  if (value === "medium") return "Средняя";
  return "Сложная";
}

function getScaledEnemyHealth(
  health: number,
  difficulty: "easy" | "medium" | "hard",
  heroAttack: number,
) {
  const scale = difficulty === "easy" ? 0.45 : difficulty === "medium" ? 0.42 : 0.38;
  const floor = difficulty === "easy" ? 28 : difficulty === "medium" ? 36 : 44;
  const pacingFloor =
    difficulty === "easy"
      ? Math.round(heroAttack * 2.4)
      : difficulty === "medium"
        ? Math.round(heroAttack * 2.9)
        : Math.round(heroAttack * 3.4);

  return Math.max(floor, Math.round(health * scale), pacingFloor);
}

function rollMissionLoot(levelId: string, difficulty: "easy" | "medium" | "hard") {
  const chance = getMissionLootChanceByDifficulty(difficulty);
  if (Math.random() > chance) {
    return null;
  }

  const table = LOOT_TABLE_BY_MISSION[levelId];
  if (!table || table.length === 0) {
    return null;
  }

  const roll = Math.random() * 100;
  let border = 0;
  for (const entry of table) {
    border += entry.chance;
    if (roll <= border) {
      return entry;
    }
  }

  return table[table.length - 1] ?? null;
}

function formatPercent(current: number, max: number) {
  return Math.max(0, Math.min(100, Math.round((current / Math.max(1, max)) * 100)));
}

function UnitCard({
  side,
  name,
  level,
  health,
  maxHealth,
  sprite,
  floating,
}: {
  side: "hero" | "enemy";
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  sprite: {
    src: string;
    frameWidth: number;
    frameHeight: number;
    frames: number;
    fps: number;
    row?: number;
    flipX?: boolean;
  };
  floating: FloatingHit[];
}) {
  const hpPercent = formatPercent(health, maxHealth);

  return (
    <article className={styles.unitCard}>
      <p className={styles.unitName}>
        {name} <span>Ур. {level}</span>
      </p>

      <div className={styles.hpTrack}>
        <div className={styles.hpFill} style={{ width: `${hpPercent}%` }} />
      </div>
      <p className={styles.hpLabel}>
        {health} / {maxHealth} здоровья
      </p>

      <div className={styles.spriteBox}>
        <SpriteAnimator
          src={sprite.src}
          frameWidth={sprite.frameWidth}
          frameHeight={sprite.frameHeight}
          frames={sprite.frames}
          fps={sprite.fps}
          row={sprite.row}
          scale={5}
          flipX={sprite.flipX}
          playing
          loop
        />

        {floating.map((entry) => (
          <span
            key={entry.id}
            className={`${styles.floatingHit} ${
              entry.mode === "heal"
                ? styles.floatingHeal
                : entry.mode === "critical"
                  ? styles.floatingCritical
                  : styles.floatingDamage
            }`}
          >
            {entry.mode === "heal" ? "+" : "-"}
            {entry.amount}
          </span>
        ))}
      </div>

      <p className={styles.unitSide}>{side === "hero" ? "Герой" : "Враг"}</p>
    </article>
  );
}

function BattleArena({
  player,
  missionProfileKey,
  levelId,
  missionTitle,
  enemyName,
  enemyLevel,
  enemyHealthMax,
  enemyAttack,
  enemyDefense,
  enemyType,
  rewardXp,
  rewardGold,
  missionEnergyCost,
  missionDifficulty,
  adventureNodeId,
  onMap,
  onMissionRunsChanged,
}: {
  player: ReturnType<typeof usePlayer>;
  missionProfileKey: string;
  levelId: string;
  missionTitle: string;
  enemyName: string;
  enemyLevel: number;
  enemyHealthMax: number;
  enemyAttack: number;
  enemyDefense: number;
  enemyType: ReturnType<typeof getEnemyVisualType>;
  rewardXp: number;
  rewardGold: number;
  missionEnergyCost: number;
  missionDifficulty: "easy" | "medium" | "hard";
  adventureNodeId: string | null;
  onMap: () => void;
  onMissionRunsChanged: () => void;
}) {
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [turnLabel, setTurnLabel] = useState("Подготовка боя...");
  const [resolving, setResolving] = useState(false);
  const [heroAnimation, setHeroAnimation] = useState<SpriteAnimation>("idle");
  const [enemyAnimation, setEnemyAnimation] = useState<SpriteAnimation>("idle");
  const [floatingHits, setFloatingHits] = useState<FloatingHit[]>([]);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);
  const [defeatPenaltyGold, setDefeatPenaltyGold] = useState(0);

  const battleStateRef = useRef<BattleState | null>(null);
  const entryCommittedRef = useRef(false);
  const outcomeCommittedRef = useRef(false);

  useEffect(() => {
    battleStateRef.current = battleState;
  }, [battleState]);

  const enemyVisual = missionsAssets.enemies[enemyType];
  const heroVisual = missionsAssets.hero;

  const heroSprite =
    heroAnimation === "attack"
      ? heroVisual.attack
      : heroAnimation === "dead"
        ? heroVisual.dead
        : heroVisual.idle;
  const enemySprite =
    enemyAnimation === "attack"
      ? enemyVisual.attack
      : enemyAnimation === "dead"
        ? enemyVisual.dead
        : enemyVisual.idle;

  function appendLog(entries: string[]) {
    setBattleLog((current) => [...entries, ...current].slice(0, 40));
  }

  function spawnFloatingHit(target: "hero" | "enemy", amount: number, mode: "damage" | "heal" | "critical") {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setFloatingHits((current) => [...current, { id, target, amount, mode }]);
    window.setTimeout(() => {
      setFloatingHits((current) => current.filter((entry) => entry.id !== id));
    }, 950);
  }

  function commitVictory(state: BattleState) {
    if (outcomeCommittedRef.current) return;
    outcomeCommittedRef.current = true;

    const lootDrop = rollMissionLoot(levelId, missionDifficulty);
    const bonusGold = lootDrop?.goldBonus ?? 0;
    const totalGold = rewardGold + bonusGold;
    const lootLabel =
      lootDrop?.itemId !== undefined
        ? getShopItemById(lootDrop.itemId)?.name ?? lootDrop.label
        : lootDrop?.label ?? null;

    finishBattleVictory({
      levelId,
      rewardXp,
      rewardGold: totalGold,
      remainingHealth: state.hero.hp,
      remainingEnergy: getPlayer().energy,
    });

    if (adventureNodeId) {
      completeCampaignMissionNode(missionProfileKey, adventureNodeId);
    }

    if (lootDrop?.itemId !== undefined) {
      updatePlayer((current) => ({
        ...current,
        inventory: current.inventory.includes(lootDrop.itemId!)
          ? current.inventory
          : [...current.inventory, lootDrop.itemId!],
      }));
    }

    setRewardSummary({
      xp: rewardXp,
      gold: totalGold,
      loot: lootLabel,
    });
    setTurnLabel("Победа");
    setResolving(false);
    onMissionRunsChanged();

    appendLog([
      bonusGold > 0
        ? `Победа! Награды: +${rewardXp} опыта, +${totalGold} золота (с бонусом лута).`
        : `Победа! Награды: +${rewardXp} опыта, +${totalGold} золота.`,
      lootLabel ? `Найден лут: ${lootLabel}.` : "В этом забеге лута нет.",
    ]);
  }

  function commitDefeat() {
    if (outcomeCommittedRef.current) return;
    outcomeCommittedRef.current = true;

    const penaltyGold = 8;
    finishBattleDefeat({
      levelId,
      remainingHealth: Math.max(1, Math.floor(player.maxHealth * 0.35)),
      remainingEnergy: Math.max(0, Math.floor(player.maxEnergy * 0.25)),
    });
    updatePlayer((current) => ({
      ...current,
      gold: current.isAdmin ? current.gold : Math.max(0, current.gold - penaltyGold),
    }));

    setDefeatPenaltyGold(penaltyGold);
    setTurnLabel("Поражение");
    setResolving(false);
    onMissionRunsChanged();
    appendLog([`Поражение. Штраф: -${penaltyGold} золота.`]);
  }

  function applyResolution(resolution: BattleResolution, source: "hero" | "enemy") {
    setBattleState(resolution.state);
    appendLog(resolution.events.map((event) => event.text));

    for (const event of resolution.events) {
      if (!event.target || typeof event.amount !== "number" || event.amount <= 0) continue;
      if (event.action === "item") {
        spawnFloatingHit(event.target, event.amount, "heal");
      } else if (event.critical) {
        spawnFloatingHit(event.target, event.amount, "critical");
      } else {
        spawnFloatingHit(event.target, event.amount, "damage");
      }
    }

    if (source === "hero") {
      setHeroAnimation("attack");
      window.setTimeout(() => setHeroAnimation("idle"), 330);
    } else {
      setEnemyAnimation("attack");
      window.setTimeout(() => setEnemyAnimation("idle"), 360);
    }

    if (resolution.state.outcome === "victory") {
      setEnemyAnimation("dead");
      commitVictory(resolution.state);
      return;
    }

    if (resolution.state.outcome === "defeat") {
      setHeroAnimation("dead");
      commitDefeat();
      return;
    }

    if (resolution.state.turn === "enemy") {
      setTurnLabel("Ход врага");
      setResolving(true);
      window.setTimeout(() => {
        const latest = battleStateRef.current;
        if (!latest || latest.outcome !== "ongoing" || latest.turn !== "enemy") {
          setResolving(false);
          return;
        }

        const enemyResolution = resolveEnemyTurn(latest);
        applyResolution(enemyResolution, "enemy");
        if (enemyResolution.state.outcome === "ongoing") {
          setTurnLabel("Ваш ход");
          setResolving(false);
        }
      }, 760);
      return;
    }

    setTurnLabel("Ваш ход");
    setResolving(false);
  }

  const startBattleAttempt = useCallback(
    (mode: "initial" | "retry") => {
      const snapshot = getPlayer();
      const debugBefore = getMissionRunsDebug(missionProfileKey);
      console.log("[battle:start-attempt]", {
        mode,
        heroId: missionProfileKey,
        heroName: snapshot.name,
        missionsUsedToday: debugBefore.runsToday,
        dailyLimit: debugBefore.dailyLimit,
        remainingMissions: debugBefore.remaining,
        lastResetTimestamp: debugBefore.lastResetAt,
      });

      const runsRemaining = getMissionRunsRemainingToday(missionProfileKey);
      if (runsRemaining <= 0) {
        setEntryError("Дневной лимит миссий достигнут. Завершите задачи и попробуйте завтра.");
        onMissionRunsChanged();
        return false;
      }

      if (snapshot.energy < missionEnergyCost) {
        setEntryError(`Недостаточно энергии: нужно ${missionEnergyCost}, доступно ${snapshot.energy}.`);
        return false;
      }

      const energyConsumed = consumePlayerEnergy(missionEnergyCost);
      if (!energyConsumed) {
        setEntryError("Не удалось списать энергию за вход в миссию.");
        return false;
      }

      const runRegistered = registerMissionRun(missionProfileKey);
      if (!runRegistered) {
        // Safety rollback for edge race conditions.
        updatePlayer((current) => ({
          ...current,
          energy: Math.min(current.maxEnergy, current.energy + missionEnergyCost),
        }));
        setEntryError("Дневной лимит миссий достигнут. Запуск миссии отменён.");
        onMissionRunsChanged();
        return false;
      }

      startMissionProgress(levelId);
      const afterSpend = getPlayer();
      const scaledEnemyHp = getScaledEnemyHealth(enemyHealthMax, missionDifficulty, afterSpend.attack);

      const initialState = createInitialBattleState({
        heroHp: afterSpend.health,
        heroMaxHp: afterSpend.maxHealth,
        heroAttack: afterSpend.attack,
        heroDefense: afterSpend.defense,
        heroCritChance: afterSpend.critChance,
        enemyHp: scaledEnemyHp,
        enemyAttack,
        enemyDefense,
        enemyCritChance: missionDifficulty === "hard" ? 12 : missionDifficulty === "medium" ? 9 : 6,
        potionCharges: 1,
      });

      outcomeCommittedRef.current = false;
      setBattleState(initialState);
      setEntryError(null);
      setRewardSummary(null);
      setDefeatPenaltyGold(0);
      setTurnLabel("Ваш ход");
      setHeroAnimation("idle");
      setEnemyAnimation("idle");
      setResolving(false);
      setFloatingHits([]);
      setBattleLog([
        mode === "retry"
          ? `Повторная попытка миссии «${missionTitle}».`
          : `Бой начался: ${enemyName} преграждает путь.`,
        "Формула урона: max(1, АТК - ЗАЩ + случайный разброс).",
      ]);
      onMissionRunsChanged();
      return true;
    },
    [
      enemyAttack,
      enemyDefense,
      enemyHealthMax,
      enemyName,
      levelId,
      missionDifficulty,
      missionEnergyCost,
      missionProfileKey,
      missionTitle,
      onMissionRunsChanged,
    ],
  );

  useEffect(() => {
    if (entryCommittedRef.current) return;
    entryCommittedRef.current = true;
    startBattleAttempt("initial");
  }, [startBattleAttempt]);

  function handleHeroAction(action: BattleActionType) {
    const current = battleStateRef.current;
    if (!current || current.outcome !== "ongoing" || current.turn !== "hero" || resolving) {
      return;
    }

    const resolution = resolveHeroAction(current, action);
    applyResolution(resolution, "hero");
  }

  function handleRetry() {
    setResolving(false);
    startBattleAttempt("retry");
  }

  const activeState = battleState;
  const heroFloating = floatingHits.filter((entry) => entry.target === "hero");
  const enemyFloating = floatingHits.filter((entry) => entry.target === "enemy");
  const canInteract =
    activeState !== null &&
    activeState.outcome === "ongoing" &&
    activeState.turn === "hero" &&
    !resolving;

  if (!activeState) {
    return (
      <section className={styles.battleShell}>
        <div className={styles.statusCard}>
          <p>{entryError ?? "Подготовка боя..."}</p>
          <div className={styles.resultActions}>
            <button onClick={handleRetry} className={styles.primaryButton}>
              Повторить вход
            </button>
            <button onClick={onMap} className={styles.secondaryButton}>
              Назад к миссиям
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.battleShell}>
      <header className={styles.battleHeader}>
        <div>
          <p className={styles.missionEyebrow}>Миссия</p>
          <h2 className={styles.missionTitle}>{missionTitle}</h2>
          <p className={styles.missionMeta}>
            Сложность: {getDifficultyLabel(missionDifficulty)} - Стоимость входа: {missionEnergyCost} энергии - Враг уровня {enemyLevel}
          </p>
        </div>
        <p className={styles.turnBadge}>{turnLabel}</p>
      </header>

      <div className={styles.stage}>
        <UnitCard
          side="hero"
          name={player.name}
          level={player.level}
          health={activeState.hero.hp}
          maxHealth={activeState.hero.maxHp}
          sprite={{
            src: heroSprite.src,
            frameWidth: heroSprite.frameWidth,
            frameHeight: heroSprite.frameHeight,
            frames: heroSprite.frames,
            fps: heroSprite.fps,
            row: heroSprite.row,
          }}
          floating={heroFloating}
        />

        <div className={styles.centerLane}>
          <p className={styles.centerLabel}>ПРОТИВ</p>
          <p className={styles.centerSub}>
            {resolving
              ? "Разрешение хода..."
              : activeState.turn === "hero"
                ? "Выберите действие"
                : "Враг действует"}
          </p>
        </div>

        <UnitCard
          side="enemy"
          name={enemyName}
          level={enemyLevel}
          health={activeState.enemy.hp}
          maxHealth={activeState.enemy.maxHp}
          sprite={{
            src: enemySprite.src,
            frameWidth: enemySprite.frameWidth,
            frameHeight: enemySprite.frameHeight,
            frames: enemySprite.frames,
            fps: enemySprite.fps,
            row: enemySprite.row,
            flipX: true,
          }}
          floating={enemyFloating}
        />
      </div>

      <div className={styles.actionsWrap}>
        {ACTIONS.map((entry) => {
          const disabled =
            !canInteract ||
            (entry.action === "skill" && activeState.skillCooldown > 0) ||
            (entry.action === "item" && activeState.potionCharges <= 0);

          return (
            <button
              key={entry.action}
              onClick={() => handleHeroAction(entry.action)}
              disabled={disabled}
              className={`${styles.actionButton} ${disabled ? styles.actionButtonDisabled : ""}`}
            >
              <span>{entry.label}</span>
              <small>
                {entry.action === "skill" && activeState.skillCooldown > 0
                  ? `Перезарядка: ${activeState.skillCooldown}`
                  : entry.action === "item"
                    ? `Зелий: ${activeState.potionCharges}`
                    : entry.hint}
              </small>
            </button>
          );
        })}
      </div>

      <div className={styles.logWrap}>
        <p className={styles.logTitle}>Журнал боя</p>
        <div className={styles.logList}>
          {battleLog.length === 0 ? <p>Событий пока нет.</p> : null}
          {battleLog.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
      </div>

      {activeState.outcome === "victory" && rewardSummary ? (
        <div className={styles.resultCard}>
          <h3>Победа</h3>
          <p>
            Награды: +{rewardSummary.xp} опыта, +{rewardSummary.gold} золота
          </p>
          <p>{rewardSummary.loot ? `Лут: ${rewardSummary.loot}` : "В этом забеге лута нет."}</p>
          <div className={styles.resultActions}>
            <button onClick={onMap} className={styles.primaryButton}>
              Назад к миссиям
            </button>
          </div>
        </div>
      ) : null}

      {activeState.outcome === "defeat" ? (
        <div className={styles.resultCard}>
          <h3>Поражение</h3>
          <p>Штраф: -{defeatPenaltyGold} золота. Можно повторить бой, если ещё есть энергия и попытки миссий.</p>
          <div className={styles.resultActions}>
            <button onClick={handleRetry} className={styles.primaryButton}>
              Повторить бой
            </button>
            <button onClick={onMap} className={styles.secondaryButton}>
              Назад к миссиям
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function BattlePage() {
  const player = usePlayer();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [missionRunsRemaining, setMissionRunsRemaining] = useState(MISSION_DAILY_LIMIT);
  const [missionRunsToday, setMissionRunsToday] = useState(0);

  const missionProfileKey = useMemo(
    () =>
      buildMissionProfileKey({
        createdAt: player.createdAt,
        name: player.name,
        classType: player.classType,
      }),
    [player.classType, player.createdAt, player.name],
  );

  const refreshMissionRuns = useCallback(() => {
    const runsToday = getMissionRunsToday(missionProfileKey);
    const runsRemaining = getMissionRunsRemainingToday(missionProfileKey);
    setMissionRunsToday(runsToday);
    setMissionRunsRemaining(runsRemaining);

    const debug = getMissionRunsDebug(missionProfileKey);
    console.log("[battle:daily-limit]", {
      heroId: missionProfileKey,
      heroName: player.name,
      missionsUsedToday: debug.runsToday,
      dailyLimit: debug.dailyLimit,
      remainingMissions: debug.remaining,
      lastResetTimestamp: debug.lastResetAt,
    });
  }, [missionProfileKey, player.name]);

  useEffect(() => {
    refreshMissionRuns();
    window.addEventListener("focus", refreshMissionRuns);
    return () => {
      window.removeEventListener("focus", refreshMissionRuns);
    };
  }, [refreshMissionRuns]);

  const levels = useMemo(
    () =>
      getMapLevels({
        completedLevels: player.completedLevels,
        playerLevel: player.level,
      }),
    [player.completedLevels, player.level],
  );

  const firstUnlockedId = levels.find((level) => level.unlocked)?.id ?? levels[0]?.id ?? "";
  const requestedLevelId = searchParams.get("level") ?? firstUnlockedId;
  const adventureNodeId = searchParams.get("node");
  const campaignNode = adventureNodeId ? getCampaignNodeById(adventureNodeId) : null;
  const startedFromAdventureNode = Boolean(adventureNodeId);
  const selectedLevel = levels.find((level) => level.id === requestedLevelId) ?? levels[0] ?? null;
  const levelTemplate = selectedLevel ? getLevelById(selectedLevel.id) : null;

  function goToMap() {
    router.push("/app/missions");
  }

  const levelLocked =
    selectedLevel !== null &&
    !selectedLevel.unlocked &&
    !selectedLevel.completed &&
    !startedFromAdventureNode;

  return (
    <main className="game-ui min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_82%_10%,rgba(245,158,11,0.12),transparent_28%),linear-gradient(to_bottom,#070b16,#0b0f1b)] px-3 py-4 text-zinc-100 md:px-5 md:py-5">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4">
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.pageEyebrow}>Пошаговый бой</p>
            <h1 className={styles.pageTitle}>Экран боя</h1>
            {selectedLevel ? (
              <p className={styles.pageMeta}>
                Миссия: {selectedLevel.title} - Сложность: {getDifficultyLabel(selectedLevel.difficulty)} - Стоимость входа:{" "}
                {selectedLevel.energyCost} энергии
              </p>
            ) : null}
          </div>
          <div className={styles.pageStats}>
            <p>
              Попыток миссий: <strong>{missionRunsToday}</strong> / {MISSION_DAILY_LIMIT}
            </p>
            <p>
              Осталось: <strong>{missionRunsRemaining}</strong>
            </p>
            <p>
              Энергия: <strong>{player.energy}</strong> / {player.maxEnergy}
            </p>
            <div className={styles.pageLinks}>
              <Link href="/app/dashboard" className={styles.secondaryButton}>
                К панели
              </Link>
              <button onClick={goToMap} className={styles.primaryButton}>
                К миссиям
              </button>
            </div>
          </div>
        </header>

        {!selectedLevel || !levelTemplate ? (
          <section className={styles.blockedCard}>
            <p>Уровень миссии не найден. Сначала выберите миссию на карте похода.</p>
          </section>
        ) : levelLocked ? (
          <section className={styles.blockedCard}>
            <p>Эта миссия закрыта. Пройдите предыдущие миссии, чтобы открыть этап.</p>
          </section>
        ) : (
          <BattleArena
            key={`${selectedLevel.id}-${adventureNodeId ?? "no-node"}-${missionProfileKey}`}
            player={player}
            missionProfileKey={missionProfileKey}
            levelId={selectedLevel.id}
            missionTitle={campaignNode?.name ?? selectedLevel.title}
            enemyName={campaignNode?.enemy ?? levelTemplate.title}
            enemyLevel={levelTemplate.enemyLevel}
            enemyHealthMax={levelTemplate.enemyHealth}
            enemyAttack={levelTemplate.enemyAttack}
            enemyDefense={levelTemplate.enemyDefense}
            enemyType={getEnemyVisualType(selectedLevel.id)}
            rewardXp={levelTemplate.rewardXp}
            rewardGold={levelTemplate.rewardGold}
            missionEnergyCost={selectedLevel.energyCost}
            missionDifficulty={selectedLevel.difficulty}
            adventureNodeId={adventureNodeId}
            onMap={goToMap}
            onMissionRunsChanged={refreshMissionRuns}
          />
        )}
      </div>
    </main>
  );
}
