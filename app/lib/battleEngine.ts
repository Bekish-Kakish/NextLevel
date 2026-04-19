import { clamp } from "./playerUtils";

export type BattleActionType = "attack" | "skill" | "item" | "defend";
export type BattleTurn = "hero" | "enemy";
export type BattleOutcome = "ongoing" | "victory" | "defeat";

export type BattleUnit = {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  critChance: number;
  defending: boolean;
};

export type BattleState = {
  hero: BattleUnit;
  enemy: BattleUnit;
  turn: BattleTurn;
  outcome: BattleOutcome;
  skillCooldown: number;
  potionCharges: number;
};

export type BattleEvent = {
  target?: "hero" | "enemy";
  amount?: number;
  text: string;
  critical?: boolean;
  action: BattleActionType | "enemy_attack" | "enemy_defend";
};

export type BattleResolution = {
  state: BattleState;
  events: BattleEvent[];
};

type CalculateDamageOptions = {
  attackerAttack: number;
  defenderDefense: number;
  multiplier?: number;
  variance?: number;
};

const SKILL_COOLDOWN = 2;
const ITEM_HEAL = 24;
const DEFEND_BONUS = 7;

function randomVariance(range: number) {
  const safe = Math.max(0, Math.floor(range));
  return Math.floor(Math.random() * (safe * 2 + 1)) - safe;
}

// Core formula:
// damage = max(1, ATK - DEF + small random variance)
export function calculateDamage({
  attackerAttack,
  defenderDefense,
  multiplier = 1,
  variance = 2,
}: CalculateDamageOptions) {
  const attack = Math.max(1, Math.round(attackerAttack * Math.max(0.1, multiplier)));
  const defense = Math.max(0, Math.round(defenderDefense));
  return Math.max(1, attack - defense + randomVariance(variance));
}

function withOutcome(state: BattleState): BattleState {
  if (state.enemy.hp <= 0) {
    return {
      ...state,
      outcome: "victory",
      turn: "hero",
    };
  }

  if (state.hero.hp <= 0) {
    return {
      ...state,
      outcome: "defeat",
      turn: "enemy",
    };
  }

  return state;
}

export function createInitialBattleState(options: {
  heroHp: number;
  heroMaxHp: number;
  heroAttack: number;
  heroDefense: number;
  heroCritChance: number;
  enemyHp: number;
  enemyAttack: number;
  enemyDefense: number;
  enemyCritChance?: number;
  potionCharges?: number;
}): BattleState {
  return {
    hero: {
      hp: clamp(Math.round(options.heroHp), 1, Math.max(1, Math.round(options.heroMaxHp))),
      maxHp: Math.max(1, Math.round(options.heroMaxHp)),
      attack: Math.max(1, Math.round(options.heroAttack)),
      defense: Math.max(0, Math.round(options.heroDefense)),
      critChance: Math.max(0, options.heroCritChance),
      defending: false,
    },
    enemy: {
      hp: Math.max(1, Math.round(options.enemyHp)),
      maxHp: Math.max(1, Math.round(options.enemyHp)),
      attack: Math.max(1, Math.round(options.enemyAttack)),
      defense: Math.max(0, Math.round(options.enemyDefense)),
      critChance: Math.max(0, options.enemyCritChance ?? 8),
      defending: false,
    },
    turn: "hero",
    outcome: "ongoing",
    skillCooldown: 0,
    potionCharges: Math.max(0, Math.floor(options.potionCharges ?? 1)),
  };
}

export function resolveHeroAction(state: BattleState, action: BattleActionType): BattleResolution {
  if (state.outcome !== "ongoing" || state.turn !== "hero") {
    return {
      state,
      events: [],
    };
  }

  let nextState: BattleState = {
    ...state,
    hero: {
      ...state.hero,
      defending: false,
    },
    enemy: {
      ...state.enemy,
      defending: false,
    },
    turn: "enemy",
    skillCooldown: Math.max(0, state.skillCooldown - 1),
  };
  const events: BattleEvent[] = [];

  if (action === "defend") {
    nextState = {
      ...nextState,
      hero: {
        ...nextState.hero,
        defending: true,
      },
    };
    events.push({
      text: "Герой занимает оборонительную стойку.",
      action: "defend",
    });

    return {
      state: withOutcome(nextState),
      events,
    };
  }

  if (action === "item") {
    if (state.potionCharges <= 0) {
      events.push({
        text: "Зелья закончились.",
        action: "item",
      });
      return {
        state: {
          ...state,
          turn: "hero",
        },
        events,
      };
    }

    const healedHp = clamp(state.hero.hp + ITEM_HEAL, 1, state.hero.maxHp);
    const restored = healedHp - state.hero.hp;
    nextState = {
      ...nextState,
      hero: {
        ...nextState.hero,
        hp: healedHp,
      },
      potionCharges: state.potionCharges - 1,
    };
    events.push({
      text: `Герой использует зелье и восстанавливает ${restored} здоровья.`,
      action: "item",
    });

    return {
      state: withOutcome(nextState),
      events,
    };
  }

  if (action === "skill") {
    if (state.skillCooldown > 0) {
      events.push({
        text: `Навык перезаряжается (осталось ходов: ${state.skillCooldown}).`,
        action: "skill",
      });
      return {
        state: {
          ...state,
          turn: "hero",
        },
        events,
      };
    }

    const critical = Math.random() * 100 < state.hero.critChance;
    const damage = calculateDamage({
      attackerAttack: state.hero.attack,
      defenderDefense: state.enemy.defense + (state.enemy.defending ? DEFEND_BONUS : 0),
      multiplier: critical ? 1.8 : 1.45,
      variance: 2,
    });
    const nextEnemyHp = Math.max(0, state.enemy.hp - damage);

    nextState = {
      ...nextState,
      skillCooldown: SKILL_COOLDOWN,
      enemy: {
        ...nextState.enemy,
        hp: nextEnemyHp,
      },
    };

    events.push({
      target: "enemy",
      amount: damage,
      text: critical
        ? `Критический навык! Герой наносит ${damage} урона.`
        : `Навык героя наносит ${damage} урона.`,
      action: "skill",
      critical,
    });

    return {
      state: withOutcome(nextState),
      events,
    };
  }

  const critical = Math.random() * 100 < state.hero.critChance;
  const damage = calculateDamage({
    attackerAttack: state.hero.attack,
    defenderDefense: state.enemy.defense + (state.enemy.defending ? DEFEND_BONUS : 0),
    multiplier: critical ? 1.45 : 1,
    variance: 2,
  });
  const nextEnemyHp = Math.max(0, state.enemy.hp - damage);

  nextState = {
    ...nextState,
    enemy: {
      ...nextState.enemy,
      hp: nextEnemyHp,
    },
  };

  events.push({
    target: "enemy",
    amount: damage,
    text: critical
      ? `Критический удар! Герой наносит ${damage} урона.`
      : `Герой атакует и наносит ${damage} урона.`,
    action: "attack",
    critical,
  });

  return {
    state: withOutcome(nextState),
    events,
  };
}

export function resolveEnemyTurn(state: BattleState): BattleResolution {
  if (state.outcome !== "ongoing" || state.turn !== "enemy") {
    return {
      state,
      events: [],
    };
  }

  let nextState: BattleState = {
    ...state,
    turn: "hero",
  };

  if (Math.random() < 0.2 && state.enemy.hp <= Math.round(state.enemy.maxHp * 0.42)) {
    nextState = {
      ...nextState,
      enemy: {
        ...state.enemy,
        defending: true,
      },
      hero: {
        ...state.hero,
        defending: false,
      },
    };
    return {
      state: withOutcome(nextState),
      events: [
        {
          action: "enemy_defend",
          text: "Враг усиливает защиту.",
        },
      ],
    };
  }

  const critical = Math.random() * 100 < state.enemy.critChance;
  const damage = calculateDamage({
    attackerAttack: state.enemy.attack,
    defenderDefense: state.hero.defense + (state.hero.defending ? DEFEND_BONUS : 0),
    multiplier: critical ? 1.42 : 1,
    variance: 2,
  });
  const nextHeroHp = Math.max(0, state.hero.hp - damage);

  nextState = {
    ...nextState,
    hero: {
      ...state.hero,
      hp: nextHeroHp,
      defending: false,
    },
    enemy: {
      ...state.enemy,
      defending: false,
    },
  };

  return {
    state: withOutcome(nextState),
    events: [
      {
        action: "enemy_attack",
        target: "hero",
        amount: damage,
        text: critical
          ? `Критический удар врага! Вы получаете ${damage} урона.`
          : `Враг атакует и наносит ${damage} урона.`,
        critical,
      },
    ],
  };
}
