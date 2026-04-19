import { getMissionEnergyCostByDifficulty, getMissionLootChanceByDifficulty } from "./missionRules";



export type Enemy = {
  name: string;
  level: number;
  health: number;
  attack: number;
  defense: number;
};

export type Mission = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  energyCost: number;
  rewardXp: number;
  rewardGold: number;
  lootChance: number;
  enemy: Enemy;
};

export type MapLevel = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  energyCost: number;
  enemyLevel: number;
  enemyHealth: number;
  enemyAttack: number;
  enemyDefense: number;
  rewardXp: number;
  rewardGold: number;
  unlocked: boolean;
  completed: boolean;
};

const baseLevels: Omit<MapLevel, "unlocked" | "completed">[] = [
  {
    id: "lesnoy-razboynik",
    title: "Лесной разбойник",
    description: "Разбойничья застава перекрыла дорогу к северному тракту.",
    difficulty: "easy",
    energyCost: getMissionEnergyCostByDifficulty("easy"),
    enemyLevel: 1,
    enemyHealth: 70,
    enemyAttack: 10,
    enemyDefense: 3,
    rewardXp: 30,
    rewardGold: 15,
  },
  {
    id: "peshchernyy-zver",
    title: "Пещерный зверь",
    description: "В пещере проснулся хищник, и караваны обходят путь стороной.",
    difficulty: "easy",
    energyCost: getMissionEnergyCostByDifficulty("easy"),
    enemyLevel: 2,
    enemyHealth: 95,
    enemyAttack: 14,
    enemyDefense: 4,
    rewardXp: 30,
    rewardGold: 15,
  },
  {
    id: "strazh-ruin",
    title: "Страж руин",
    description: "Каменный страж древнего храма не подпускает путников к реликвиям.",
    difficulty: "medium",
    energyCost: getMissionEnergyCostByDifficulty("medium"),
    enemyLevel: 3,
    enemyHealth: 120,
    enemyAttack: 17,
    enemyDefense: 7,
    rewardXp: 60,
    rewardGold: 35,
  },
  {
    id: "tenevoy-okhotnik",
    title: "Теневой охотник",
    description: "Ночной убийца выслеживает всех, кто осмелился пройти перевал.",
    difficulty: "hard",
    energyCost: getMissionEnergyCostByDifficulty("hard"),
    enemyLevel: 4,
    enemyHealth: 138,
    enemyAttack: 22,
    enemyDefense: 8,
    rewardXp: 120,
    rewardGold: 70,
  },
  {
    id: "vladyka-pepla",
    title: "Владыка пепла",
    description: "Последний владыка руин охраняет сердце пылающей цитадели.",
    difficulty: "hard",
    energyCost: getMissionEnergyCostByDifficulty("hard"),
    enemyLevel: 5,
    enemyHealth: 178,
    enemyAttack: 27,
    enemyDefense: 10,
    rewardXp: 120,
    rewardGold: 70,
  },
];

export function buildMissionFromLevel(level: MapLevel): Mission {
  return {
    id: level.id,
    title: level.title,
    description: level.description,
    difficulty: level.difficulty,
    energyCost: level.energyCost,
    rewardXp: level.rewardXp,
    rewardGold: level.rewardGold,
    lootChance: getMissionLootChanceByDifficulty(level.difficulty),
    enemy: {
      name: level.title,
      level: level.enemyLevel,
      health: level.enemyHealth,
      attack: level.enemyAttack,
      defense: level.enemyDefense,
    },
  };
}

export function getMapLevels(options: {
  completedLevels: string[];
  playerLevel: number;
}) {
  const completed = new Set(options.completedLevels);

  return baseLevels.map((level, index) => {
    const previousLevel = index > 0 ? baseLevels[index - 1] : null;
    const previousCompleted = previousLevel ? completed.has(previousLevel.id) : true;
    const completedCurrent = completed.has(level.id);

    const unlocked =
      index === 0 ||
      completedCurrent ||
      (previousCompleted && options.playerLevel >= level.enemyLevel);

    return {
      ...level,
      unlocked,
      completed: completedCurrent,
    };
  });
}

export function getLevelById(levelId: string) {
  const level = baseLevels.find((item) => item.id === levelId);
  if (!level) return null;

  return {
    ...level,
    unlocked: false,
    completed: false,
  };
}

