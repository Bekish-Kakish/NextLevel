"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { GameFrame } from "../components/game/GameFrame";
import { EquipmentPanel } from "../components/game/EquipmentPanel";
import { PageTitle } from "../components/shared/PageTitle";
import { SectionCard } from "../components/shared/SectionCard";
import {
  emitGameRewardGranted,
  emitPlayerResourcesChanged,
  emitTaskCompleted,
  emitTaskStreakUpdated,
} from "../lib/game-integration/bridge";
import { getEquippedItems } from "../lib/inventoryUtils";
import {
  ENERGY_RESTORE_DAILY_LIMIT,
  applyPlayerResourceDelta,
  getEnergyRestoresRemainingToday as getEnergyRestoresRemainingTodayFromStore,
  getEnergyRestoresUsedToday,
  getPlayerSnapshot,
  resetPlayer,
  restorePlayerEnergy,
  setProductivityStreak,
  usePlayer,
} from "../lib/playerStore";
import { buildMissionProfileKey, MISSION_DAILY_LIMIT, getMissionRunsToday } from "../lib/missionRules";
import { getLevelRange, getTodayKey } from "../lib/playerUtils";

type TaskType = "habit" | "daily" | "quest";
type Difficulty = "easy" | "medium" | "hard";
type TaskSection = "habits" | "dailies" | "quests" | "completed";

type TaskRewards = {
  xp: number;
  energy: number;
  gold: number;
};

type DailySchedule = {
  daysOfWeek: number[];
};

type TaskBase = {
  id: number;
  title: string;
  description: string;
  type: TaskType;
  difficulty: Difficulty;
  rewards: TaskRewards;
  completed: boolean;
  createdAt: string;
};

type HabitTask = TaskBase & {
  type: "habit";
  positiveCount: number;
  negativeCount: number;
  lastCompletedAt: string | null;
};

type DailyTask = TaskBase & {
  type: "daily";
  schedule: DailySchedule;
  lastCompletedAt: string | null;
  isDueToday: boolean;
  completionHistory: string[];
};

type QuestTask = TaskBase & {
  type: "quest";
  dueDate: string | null;
  completedAt: string | null;
};

type Task = HabitTask | DailyTask | QuestTask;

type DayProgressEntry = {
  xp: number;
  energy: number;
  gold: number;
  tasksCompleted: number;
  dailiesCompleted: number;
  habitPositive: number;
  habitNegative: number;
  streakGranted: boolean;
};

type TasksState = {
  tasks: Task[];
  dayProgress: Record<string, DayProgressEntry>;
  lastDailyAuditDate: string | null;
};

type DailyAuditResult = {
  changed: boolean;
  state: TasksState;
  missedCount: number;
  streakShouldReset: boolean;
  resourceDelta: TaskRewards;
};

type TaskSlotLimits = {
  habit: number;
  daily: number;
  quest: number;
};

type RewardBurst = {
  id: number;
  taskId: number;
  rewards: TaskRewards;
  label: string;
};

const EMPTY_TASKS_STATE: TasksState = {
  tasks: [],
  dayProgress: {},
  lastDailyAuditDate: null,
};

const TASKS_STORAGE_KEY_V2 = "nextlevel_productivity_tasks_v2";
const LEGACY_TASKS_STORAGE_KEY_V1 = "nextlevel_productivity_tasks_v1";
const DAILY_COMPLETION_LIMIT = 10;

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Лёгкая",
  medium: "Средняя",
  hard: "Сложная",
};

const TYPE_LABELS: Record<TaskType, string> = {
  habit: "Привычка",
  daily: "Ежедневная",
  quest: "Квест",
};

const SECTION_LABELS: Record<TaskSection, string> = {
  habits: "Привычки",
  dailies: "Ежедневные",
  quests: "Квесты",
  completed: "Выполненные",
};

const TYPE_BADGES: Record<TaskType, string> = {
  habit: "ПР",
  daily: "ЕЖ",
  quest: "КВ",
};

const TYPE_ACCENT_STYLES: Record<TaskType, string> = {
  habit: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  daily: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  quest: "border-amber-400/35 bg-amber-500/10 text-amber-200",
};

const DIFFICULTY_ACCENT_STYLES: Record<Difficulty, string> = {
  easy: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  medium: "border-cyan-400/25 bg-cyan-500/10 text-cyan-200",
  hard: "border-rose-400/30 bg-rose-500/10 text-rose-200",
};

const CLASS_AVATAR_MAP = {
  Воин: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_warrior.png",
  Страж: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_healer.png",
  Следопыт: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_rogue.png",
  Мистик: "/habitica-ref/HabitRPG-habitica-images-32a4678/misc/avatar_floral_wizard.png",
} as const;

const DAY_OPTIONS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 0, label: "Вс" },
];

const DIFFICULTY_BASE_REWARDS: Record<Difficulty, TaskRewards> = {
  easy: { xp: 10, energy: 3, gold: 5 },
  medium: { xp: 20, energy: 5, gold: 10 },
  hard: { xp: 40, energy: 10, gold: 20 },
};

const TYPE_REWARD_MULTIPLIER: Record<TaskType, number> = {
  habit: 0.45,
  daily: 1,
  quest: 1.75,
};

const ENERGY_REWARD_BY_TASK_TYPE: Record<TaskType, number> = {
  habit: 1,
  daily: 3,
  quest: 8,
};

const DAILY_MISS_PENALTY: Record<Difficulty, TaskRewards> = {
  easy: { xp: -2, energy: -2, gold: 0 },
  medium: { xp: -4, energy: -4, gold: -1 },
  hard: { xp: -6, energy: -6, gold: -2 },
};

const DAILY_STREAK_BONUSES: Record<number, TaskRewards> = {
  3: { xp: 5, energy: 0, gold: 0 },
  7: { xp: 10, energy: 0, gold: 0 },
  14: { xp: 20, energy: 0, gold: 0 },
};

function getTaskSlotLimits(level: number): TaskSlotLimits {
  const _safeLevel = Math.max(1, Math.floor(level));
  return {
    habit: 4,
    daily: 4,
    quest: 2,
  };
}

function buildRewards(type: TaskType, difficulty: Difficulty): TaskRewards {
  const base = DIFFICULTY_BASE_REWARDS[difficulty];
  const ratio = TYPE_REWARD_MULTIPLIER[type];

  return {
    xp: Math.max(1, Math.round(base.xp * ratio)),
    energy: ENERGY_REWARD_BY_TASK_TYPE[type],
    gold: Math.max(1, Math.round(base.gold * ratio)),
  };
}

function createEmptyDayProgress(): DayProgressEntry {
  return {
    xp: 0,
    energy: 0,
    gold: 0,
    tasksCompleted: 0,
    dailiesCompleted: 0,
    habitPositive: 0,
    habitNegative: 0,
    streakGranted: false,
  };
}

function clampDayIndex(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  if (normalized < 0 || normalized > 6) return null;
  return normalized;
}

function toDateKey(input: Date) {
  const y = input.getFullYear();
  const m = String(input.getMonth() + 1).padStart(2, "0");
  const d = String(input.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromKey(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map((part) => Number(part));
  if (!y || !m || !d) {
    return new Date();
  }
  return new Date(y, m - 1, d);
}

function shiftDayKey(dayKey: string, offset: number) {
  const date = dateFromKey(dayKey);
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
}

function normalizeTaskType(value: unknown): TaskType {
  if (value === "habit" || value === "Привычка") return "habit";
  if (value === "daily" || value === "Дейлик") return "daily";
  if (value === "quest" || value === "Квест") return "quest";
  return "daily";
}

function normalizeDifficulty(value: unknown): Difficulty {
  if (value === "easy" || value === "Легко") return "easy";
  if (value === "medium" || value === "Средне") return "medium";
  if (value === "hard" || value === "Сложно") return "hard";
  return "easy";
}

function normalizeDateString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

function dateStringToDayKey(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return toDateKey(date);
}

function normalizeSchedule(value: unknown): DailySchedule {
  const rawDays =
    Array.isArray(value)
      ? value
      : value && typeof value === "object" && Array.isArray((value as DailySchedule).daysOfWeek)
        ? (value as DailySchedule).daysOfWeek
        : [1, 2, 3, 4, 5, 6, 0];

  const days = Array.from(
    new Set(
      rawDays
        .map((item) => clampDayIndex(item))
        .filter((day): day is number => day !== null),
    ),
  ).sort((a, b) => a - b);

  return {
    daysOfWeek: days.length > 0 ? days : [1, 2, 3, 4, 5, 6, 0],
  };
}

function normalizeRewards(
  value: unknown,
  taskType: TaskType,
  difficulty: Difficulty,
  source?: Record<string, unknown>,
): TaskRewards {
  const fallback = buildRewards(taskType, difficulty);

  if (!value || typeof value !== "object") {
    const legacyXp = source?.xpReward;
    const legacyEnergy = source?.energyReward;
    const legacyGold = source?.goldReward;
    if (
      typeof legacyXp === "number" &&
      typeof legacyEnergy === "number" &&
      typeof legacyGold === "number"
    ) {
      return {
        xp: Math.max(1, Math.round(legacyXp)),
        energy: Math.max(1, Math.round(legacyEnergy)),
        gold: Math.max(1, Math.round(legacyGold)),
      };
    }
    return fallback;
  }

  const raw = value as Partial<TaskRewards>;
  return {
    xp:
      typeof raw.xp === "number" && Number.isFinite(raw.xp)
        ? Math.max(1, Math.round(raw.xp))
        : fallback.xp,
    energy:
      typeof raw.energy === "number" && Number.isFinite(raw.energy)
        ? Math.max(1, Math.round(raw.energy))
        : fallback.energy,
    gold:
      typeof raw.gold === "number" && Number.isFinite(raw.gold)
        ? Math.max(1, Math.round(raw.gold))
        : fallback.gold,
  };
}

function isTaskDueOnDay(schedule: DailySchedule, dayKey: string) {
  return schedule.daysOfWeek.includes(dateFromKey(dayKey).getDay());
}

function mergeProgress(
  source: Record<string, DayProgressEntry>,
  dayKey: string,
  delta: Partial<DayProgressEntry>,
) {
  const current = source[dayKey] ?? createEmptyDayProgress();

  return {
    ...source,
    [dayKey]: {
      ...current,
      xp: current.xp + (delta.xp ?? 0),
      energy: current.energy + (delta.energy ?? 0),
      gold: current.gold + (delta.gold ?? 0),
      tasksCompleted: current.tasksCompleted + (delta.tasksCompleted ?? 0),
      dailiesCompleted: current.dailiesCompleted + (delta.dailiesCompleted ?? 0),
      habitPositive: current.habitPositive + (delta.habitPositive ?? 0),
      habitNegative: current.habitNegative + (delta.habitNegative ?? 0),
      streakGranted: delta.streakGranted ?? current.streakGranted,
    },
  };
}

function addRewards(a: TaskRewards, b: TaskRewards): TaskRewards {
  return {
    xp: a.xp + b.xp,
    energy: a.energy + b.energy,
    gold: a.gold + b.gold,
  };
}

function normalizeCompletionHistory(source: Record<string, unknown>) {
  const fromArray = Array.isArray(source.completionHistory)
    ? source.completionHistory.filter((item): item is string => typeof item === "string")
    : [];

  const merged = [...fromArray];
  const lastCompletedFromRaw = normalizeDateString(source.lastCompletedAt);
  const completedAtFromRaw = normalizeDateString(source.completedAt);

  const legacyCompletedKey = dateStringToDayKey(completedAtFromRaw);
  if (legacyCompletedKey) {
    merged.push(legacyCompletedKey);
  }

  const lastCompletedKey = dateStringToDayKey(lastCompletedFromRaw);
  if (lastCompletedKey) {
    merged.push(lastCompletedKey);
  }

  return Array.from(new Set(merged));
}
function normalizeTask(item: unknown, fallbackId: number): Task | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const raw = item as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return null;
  }

  const id =
    typeof raw.id === "number" && Number.isFinite(raw.id)
      ? Math.floor(raw.id)
      : fallbackId;
  const type = normalizeTaskType(raw.type);
  const difficulty = normalizeDifficulty(raw.difficulty);
  const rewards = normalizeRewards(raw.rewards, type, difficulty, raw);
  const createdAt = normalizeDateString(raw.createdAt) ?? new Date().toISOString();
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";

  if (type === "habit") {
    const positiveFromLegacy =
      raw.completed === true && normalizeTaskType(raw.type) === "habit" ? 1 : 0;
    const lastCompletedAt =
      normalizeDateString(raw.lastCompletedAt) ?? normalizeDateString(raw.completedAt);

    return {
      id,
      title,
      description,
      type,
      difficulty,
      rewards,
      completed: false,
      createdAt,
      positiveCount:
        typeof raw.positiveCount === "number" && Number.isFinite(raw.positiveCount)
          ? Math.max(0, Math.floor(raw.positiveCount))
          : positiveFromLegacy,
      negativeCount:
        typeof raw.negativeCount === "number" && Number.isFinite(raw.negativeCount)
          ? Math.max(0, Math.floor(raw.negativeCount))
          : 0,
      lastCompletedAt,
    };
  }

  if (type === "daily") {
    const completionHistory = normalizeCompletionHistory(raw);
    const lastCompletedAt = normalizeDateString(raw.lastCompletedAt) ?? normalizeDateString(raw.completedAt);
    const schedule = normalizeSchedule(raw.schedule);
    const todayKey = getTodayKey();
    const isDueToday = isTaskDueOnDay(schedule, todayKey);
    const completedToday = completionHistory.includes(todayKey);

    return {
      id,
      title,
      description,
      type,
      difficulty,
      rewards,
      completed: isDueToday ? completedToday : false,
      createdAt,
      schedule,
      lastCompletedAt,
      isDueToday,
      completionHistory,
    };
  }

  const completedAt = normalizeDateString(raw.completedAt);
  const completed =
    typeof raw.completed === "boolean"
      ? raw.completed
      : completedAt !== null;

  return {
    id,
    title,
    description,
    type,
    difficulty,
    rewards,
    completed,
    createdAt,
    dueDate: normalizeDateString(raw.dueDate),
    completedAt: completed ? completedAt ?? createdAt : null,
  };
}

function synchronizeDailyFlags(tasks: Task[], todayKey: string): Task[] {
  return tasks.map((task) => {
    if (task.type === "habit") {
      return {
        ...task,
        completed: dateStringToDayKey(task.lastCompletedAt) === todayKey,
      };
    }

    if (task.type !== "daily") {
      return task;
    }

    const isDueToday = isTaskDueOnDay(task.schedule, todayKey);
    const completedToday = task.completionHistory.includes(todayKey);

    return {
      ...task,
      isDueToday,
      completed: isDueToday ? completedToday : false,
    };
  });
}

function createStarterTasks(): Task[] {
  const now = new Date().toISOString();
  const todayKey = getTodayKey();

  return [
    {
      id: 1,
      title: "Прочитать 10 страниц",
      description: "Минимальный шаг в день для прокачки фокуса и знаний.",
      type: "habit",
      difficulty: "easy",
      rewards: buildRewards("habit", "easy"),
      completed: false,
      createdAt: now,
      positiveCount: 0,
      negativeCount: 0,
      lastCompletedAt: null,
    },
    {
      id: 2,
      title: "20 минут глубокой работы",
      description: "Ежедневный дисциплинарный минимум.",
      type: "daily",
      difficulty: "medium",
      rewards: buildRewards("daily", "medium"),
      completed: false,
      createdAt: now,
      schedule: { daysOfWeek: [1, 2, 3, 4, 5, 6, 0] },
      lastCompletedAt: null,
      isDueToday: true,
      completionHistory: [],
    },
    {
      id: 3,
      title: "Закрыть важный отчёт",
      description: "Крупная задача с повышенной наградой за завершение.",
      type: "quest",
      difficulty: "hard",
      rewards: buildRewards("quest", "hard"),
      completed: false,
      createdAt: now,
      dueDate: shiftDayKey(todayKey, 2),
      completedAt: null,
    },
  ];
}

function normalizeTasksArray(value: unknown): Task[] {
  if (!Array.isArray(value)) {
    return createStarterTasks();
  }

  const tasks = value
    .map((item, index) => normalizeTask(item, Date.now() + index))
    .filter((task): task is Task => task !== null);

  if (tasks.length === 0) {
    return createStarterTasks();
  }

  return tasks;
}

function normalizeDayProgressMap(value: unknown): Record<string, DayProgressEntry> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const output: Record<string, DayProgressEntry> = {};
  for (const [dayKey, rawEntry] of Object.entries(value as Record<string, unknown>)) {
    if (!rawEntry || typeof rawEntry !== "object") continue;
    const entry = rawEntry as Partial<DayProgressEntry>;
    output[dayKey] = {
      xp: typeof entry.xp === "number" && Number.isFinite(entry.xp) ? Math.round(entry.xp) : 0,
      energy:
        typeof entry.energy === "number" && Number.isFinite(entry.energy)
          ? Math.round(entry.energy)
          : 0,
      gold:
        typeof entry.gold === "number" && Number.isFinite(entry.gold)
          ? Math.round(entry.gold)
          : 0,
      tasksCompleted:
        typeof entry.tasksCompleted === "number" && Number.isFinite(entry.tasksCompleted)
          ? Math.max(0, Math.floor(entry.tasksCompleted))
          : 0,
      dailiesCompleted:
        typeof entry.dailiesCompleted === "number" && Number.isFinite(entry.dailiesCompleted)
          ? Math.max(0, Math.floor(entry.dailiesCompleted))
          : 0,
      habitPositive:
        typeof entry.habitPositive === "number" && Number.isFinite(entry.habitPositive)
          ? Math.max(0, Math.floor(entry.habitPositive))
          : 0,
      habitNegative:
        typeof entry.habitNegative === "number" && Number.isFinite(entry.habitNegative)
          ? Math.max(0, Math.floor(entry.habitNegative))
          : 0,
      streakGranted: entry.streakGranted === true,
    };
  }

  return output;
}

function buildInitialStateFromTasks(tasks: Task[], preserveAuditDate = false): TasksState {
  const todayKey = getTodayKey();
  return {
    tasks: synchronizeDailyFlags(tasks, todayKey),
    dayProgress: {},
    lastDailyAuditDate: preserveAuditDate ? null : todayKey,
  };
}

function readTasksState(): TasksState {
  if (typeof window === "undefined") {
    return buildInitialStateFromTasks(createStarterTasks());
  }

  const rawV2 = window.localStorage.getItem(TASKS_STORAGE_KEY_V2);
  if (rawV2) {
    try {
      const parsed = JSON.parse(rawV2) as
        | TasksState
        | {
            tasks?: unknown;
            dayProgress?: unknown;
            lastDailyAuditDate?: unknown;
          };

      const parsedTasks = Array.isArray(parsed) ? parsed : parsed.tasks;
      const tasks = normalizeTasksArray(parsedTasks);

      return {
        tasks: synchronizeDailyFlags(tasks, getTodayKey()),
        dayProgress: normalizeDayProgressMap(
          Array.isArray(parsed) ? {} : parsed.dayProgress,
        ),
        lastDailyAuditDate:
          !Array.isArray(parsed) && typeof parsed.lastDailyAuditDate === "string"
            ? parsed.lastDailyAuditDate
            : getTodayKey(),
      };
    } catch {
      window.localStorage.removeItem(TASKS_STORAGE_KEY_V2);
    }
  }

  const rawLegacy = window.localStorage.getItem(LEGACY_TASKS_STORAGE_KEY_V1);
  if (rawLegacy) {
    try {
      const legacyTasks = normalizeTasksArray(JSON.parse(rawLegacy));
      const migrated = buildInitialStateFromTasks(legacyTasks);
      window.localStorage.setItem(TASKS_STORAGE_KEY_V2, JSON.stringify(migrated));
      return migrated;
    } catch {
      window.localStorage.removeItem(LEGACY_TASKS_STORAGE_KEY_V1);
    }
  }

  const fresh = buildInitialStateFromTasks(createStarterTasks());
  window.localStorage.setItem(TASKS_STORAGE_KEY_V2, JSON.stringify(fresh));
  return fresh;
}

function runDailyAudit(state: TasksState, todayKey: string): DailyAuditResult {
  const syncedTasks = synchronizeDailyFlags(state.tasks, todayKey);
  if (state.lastDailyAuditDate === todayKey) {
    const tasksChanged = JSON.stringify(syncedTasks) !== JSON.stringify(state.tasks);
    return {
      changed: tasksChanged,
      state: tasksChanged ? { ...state, tasks: syncedTasks } : state,
      missedCount: 0,
      streakShouldReset: false,
      resourceDelta: { xp: 0, energy: 0, gold: 0 },
    };
  }

  const auditStart = state.lastDailyAuditDate
    ? shiftDayKey(state.lastDailyAuditDate, 1)
    : todayKey;
  const yesterdayKey = shiftDayKey(todayKey, -1);

  let missedCount = 0;
  let penalty: TaskRewards = { xp: 0, energy: 0, gold: 0 };

  if (auditStart <= yesterdayKey) {
    let cursor = auditStart;
    while (cursor <= yesterdayKey) {
      for (const task of syncedTasks) {
        if (task.type !== "daily") continue;
        if (!isTaskDueOnDay(task.schedule, cursor)) continue;
        if (task.completionHistory.includes(cursor)) continue;

        missedCount += 1;
        penalty = addRewards(penalty, DAILY_MISS_PENALTY[task.difficulty]);
      }
      cursor = shiftDayKey(cursor, 1);
    }
  }

  let nextDayProgress = state.dayProgress;
  if (missedCount > 0) {
    nextDayProgress = mergeProgress(nextDayProgress, todayKey, {
      xp: penalty.xp,
      energy: penalty.energy,
      gold: penalty.gold,
    });
  }

  return {
    changed: true,
    state: {
      ...state,
      tasks: syncedTasks,
      dayProgress: nextDayProgress,
      lastDailyAuditDate: todayKey,
    },
    missedCount,
    streakShouldReset: missedCount > 0,
    resourceDelta: penalty,
  };
}

function formatReward(value: number) {
  return value >= 0 ? `+${value}` : `${value}`;
}

function normalizeTaskTitleForCompare(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function isTaskActive(task: Task) {
  if (task.type === "quest") {
    return !task.completed;
  }
  return true;
}

function getActiveTaskCountByType(tasks: Task[], type: TaskType) {
  return tasks.filter((task) => task.type === type && isTaskActive(task)).length;
}

function hasActiveDuplicateTitle(tasks: Task[], type: TaskType, title: string) {
  const normalizedTitle = normalizeTaskTitleForCompare(title);
  return tasks.some(
    (task) =>
      task.type === type &&
      isTaskActive(task) &&
      normalizeTaskTitleForCompare(task.title) === normalizedTitle,
  );
}

function validateTaskTitle(title: string) {
  if (!title) {
    return "Название задачи не должно быть пустым.";
  }
  if (title.length < 3) {
    return "Название задачи слишком короткое. Минимум 3 символа.";
  }
  if (/^\d+$/.test(title.replace(/\s+/g, ""))) {
    return "Название не должно состоять только из цифр.";
  }
  return null;
}

function formatSchedule(schedule: DailySchedule) {
  const labelMap = new Map(DAY_OPTIONS.map((day) => [day.value, day.label]));
  return schedule.daysOfWeek
    .slice()
    .sort((a, b) => a - b)
    .map((day) => labelMap.get(day) ?? day)
    .join(" • ");
}

function isQuestOverdue(task: QuestTask, todayKey: string) {
  return Boolean(task.dueDate && !task.completed && task.dueDate < todayKey);
}

function isHabitCompletedToday(task: HabitTask, todayKey: string) {
  return dateStringToDayKey(task.lastCompletedAt) === todayKey;
}

function isDailyCompletedToday(task: DailyTask, todayKey: string) {
  return task.completionHistory.includes(todayKey);
}

type DashboardScreenProps = {
  activeNav?: "dashboard" | "tasks";
};
export function DashboardScreen({ activeNav = "dashboard" }: DashboardScreenProps) {
  const player = usePlayer();
  const equipped = getEquippedItems(player);
  const [isHydrated, setIsHydrated] = useState(false);
  const [missionRunsToday, setMissionRunsToday] = useState(0);
  const [energyRestoresUsedToday, setEnergyRestoresUsedToday] = useState(0);
  const [energyRestoresRemainingToday, setEnergyRestoresRemainingToday] = useState(
    ENERGY_RESTORE_DAILY_LIMIT,
  );

  const [taskState, setTaskState] = useState<TasksState>(EMPTY_TASKS_STATE);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("daily");
  const [newTaskDifficulty, setNewTaskDifficulty] = useState<Difficulty>("easy");
  const [newDailyDays, setNewDailyDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [newQuestDueDate, setNewQuestDueDate] = useState("");
  const [activeSection, setActiveSection] = useState<TaskSection>("habits");
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
  const [rewardBursts, setRewardBursts] = useState<RewardBurst[]>([]);
  const todayKey = isHydrated ? getTodayKey() : "1970-01-01";
  const missionProfileKey = buildMissionProfileKey({
    createdAt: player.createdAt,
    name: player.name,
    classType: player.classType,
  });

  function emitResourceChange(
    source: string,
    delta: TaskRewards,
    previousResources: { xp: number; energy: number; gold: number },
  ) {
    const currentResources = getPlayerSnapshot();
    emitPlayerResourcesChanged({
      source,
      changedAt: new Date().toISOString(),
      delta,
      before: previousResources,
      after: {
        xp: currentResources.xp,
        energy: currentResources.energy,
        gold: currentResources.gold,
      },
    });
  }

  function emitRewardEvent(
    source: string,
    label: string,
    rewards: TaskRewards,
    task?: Pick<Task, "id" | "title">,
  ) {
    emitGameRewardGranted({
      source,
      grantedAt: new Date().toISOString(),
      taskId: task?.id,
      taskTitle: task?.title,
      label,
      rewards,
    });
  }

  useEffect(() => {
    const clientTodayKey = getTodayKey();
    const loadedState = readTasksState();
    const audit = runDailyAudit(loadedState, clientTodayKey);

    setTaskState(audit.state);
    setIsHydrated(true);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(TASKS_STORAGE_KEY_V2, JSON.stringify(audit.state));
    }

    if (audit.resourceDelta.xp !== 0 || audit.resourceDelta.energy !== 0 || audit.resourceDelta.gold !== 0) {
      const previousResources = {
        xp: player.xp,
        energy: player.energy,
        gold: player.gold,
      };
      applyPlayerResourceDelta(audit.resourceDelta);
      emitResourceChange("daily_audit", audit.resourceDelta, previousResources);
    }
    if (audit.streakShouldReset) {
      const updatedAt = new Date().toISOString();
      setProductivityStreak(0, null);
      emitTaskStreakUpdated({
        previousStreak: player.streak,
        nextStreak: 0,
        updatedAt,
        reason: "daily_audit_reset",
      });
    }
    if (audit.missedCount > 0) {
      setSystemNotice(
        `Пропущено ежедневных задач: ${audit.missedCount}. Штраф: ${formatReward(audit.resourceDelta.xp)} опыта, ${formatReward(audit.resourceDelta.energy)} энергии, ${formatReward(audit.resourceDelta.gold)} золота.`,
      );
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(TASKS_STORAGE_KEY_V2, JSON.stringify(taskState));
  }, [isHydrated, taskState]);

  useEffect(() => {
    if (!isHydrated) return;

    function refreshDailyMeta() {
      setMissionRunsToday(getMissionRunsToday(missionProfileKey));
      setEnergyRestoresUsedToday(getEnergyRestoresUsedToday());
      setEnergyRestoresRemainingToday(getEnergyRestoresRemainingTodayFromStore());
    }

    refreshDailyMeta();
    window.addEventListener("focus", refreshDailyMeta);
    return () => {
      window.removeEventListener("focus", refreshDailyMeta);
    };
  }, [
    isHydrated,
    missionProfileKey,
    player.energy,
    player.gold,
    player.energyRestoreCount,
    player.energyRestoreDayKey,
  ]);

  useEffect(() => {
    if (!isHydrated) return;

    const audit = runDailyAudit(taskState, todayKey);
    if (!audit.changed) return;

    setTaskState(audit.state);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TASKS_STORAGE_KEY_V2, JSON.stringify(audit.state));
    }

    if (audit.resourceDelta.xp !== 0 || audit.resourceDelta.energy !== 0 || audit.resourceDelta.gold !== 0) {
      const previousResources = {
        xp: player.xp,
        energy: player.energy,
        gold: player.gold,
      };
      applyPlayerResourceDelta(audit.resourceDelta);
      emitResourceChange("daily_audit", audit.resourceDelta, previousResources);
    }
    if (audit.streakShouldReset && player.streak !== 0) {
      const updatedAt = new Date().toISOString();
      setProductivityStreak(0, null);
      emitTaskStreakUpdated({
        previousStreak: player.streak,
        nextStreak: 0,
        updatedAt,
        reason: "daily_audit_reset",
      });
    }
    if (audit.missedCount > 0) {
      setSystemNotice(
        `Пропущено ежедневных задач: ${audit.missedCount}. Штраф: ${formatReward(audit.resourceDelta.xp)} опыта, ${formatReward(audit.resourceDelta.energy)} энергии, ${formatReward(audit.resourceDelta.gold)} золота.`,
      );
    }
  }, [isHydrated, player.streak, taskState, todayKey]);

  const tasks = taskState.tasks;
  const todayProgress = taskState.dayProgress[todayKey] ?? createEmptyDayProgress();
  const remainingDailyLimit = Math.max(
    0,
    DAILY_COMPLETION_LIMIT - todayProgress.tasksCompleted,
  );

  const levelRange = getLevelRange(player.level);
  const xpInsideLevel = player.xp - levelRange.min;
  const xpNeed = levelRange.max - levelRange.min;
  const xpPercent = Math.min(100, Math.max(0, (xpInsideLevel / Math.max(1, xpNeed)) * 100));
  const energyPercent = Math.min(100, Math.max(0, (player.energy / Math.max(1, player.maxEnergy)) * 100));
  const dailyFillPercent =
    Math.min(
      100,
      Math.max(0, (todayProgress.tasksCompleted / Math.max(1, DAILY_COMPLETION_LIMIT)) * 100),
    );

  const habits = useMemo(
    () => tasks.filter((task): task is HabitTask => task.type === "habit"),
    [tasks],
  );
  const dailies = useMemo(
    () => tasks.filter((task): task is DailyTask => task.type === "daily"),
    [tasks],
  );
  const quests = useMemo(
    () => tasks.filter((task): task is QuestTask => task.type === "quest"),
    [tasks],
  );
  const slotLimits = useMemo(() => getTaskSlotLimits(player.level), [player.level]);
  const activeCounts = useMemo(
    () => ({
      habit: getActiveTaskCountByType(tasks, "habit"),
      daily: getActiveTaskCountByType(tasks, "daily"),
      quest: getActiveTaskCountByType(tasks, "quest"),
    }),
    [tasks],
  );
  const completedTodayList = useMemo(() => {
    return tasks.filter((task) => {
      if (task.type === "habit") {
        return isHabitCompletedToday(task, todayKey);
      }
      if (task.type === "quest") {
        return task.completed;
      }
      if (task.type === "daily") {
        return isDailyCompletedToday(task, todayKey);
      }
      return false;
    });
  }, [tasks, todayKey]);

  const sectionTasks = useMemo(() => {
    if (activeSection === "habits") return habits;
    if (activeSection === "dailies") return dailies;
    if (activeSection === "quests") return quests.filter((task) => !task.completed);
    return completedTodayList;
  }, [activeSection, habits, dailies, quests, completedTodayList]);

  function pushRewardBurst(taskId: number, rewards: TaskRewards, label: string) {
    const burstId = Date.now() + Math.floor(Math.random() * 1000);
    const burst: RewardBurst = {
      id: burstId,
      taskId,
      rewards,
      label,
    };

    setRewardBursts((current) => [...current, burst]);
    window.setTimeout(() => {
      setRewardBursts((current) => current.filter((entry) => entry.id !== burstId));
    }, 1320);
  }

  function toggleDailyDay(day: number) {
    setNewDailyDays((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day);
      }
      return [...current, day].sort((a, b) => a - b);
    });
  }

  function addTask() {
    const title = newTaskTitle.trim();
    const titleError = validateTaskTitle(title);
    if (titleError) {
      setSystemNotice(titleError);
      return;
    }

    if (newTaskType === "daily" && newDailyDays.length === 0) {
      setSystemNotice("Для ежедневной задачи выберите хотя бы один день недели.");
      return;
    }

    const activeTasksOfSameTypeCount = getActiveTaskCountByType(taskState.tasks, newTaskType);

    if (activeTasksOfSameTypeCount >= slotLimits[newTaskType]) {
      setSystemNotice(
        `Достигнут лимит активных ${TYPE_LABELS[newTaskType]}-задач. Удалите или архивируйте одну из текущих.`,
      );
      return;
    }

    const hasDuplicate = hasActiveDuplicateTitle(taskState.tasks, newTaskType, title);
    if (hasDuplicate) {
      setSystemNotice("Нельзя создать дубликат задачи.");
      return;
    }

    const now = new Date().toISOString();
    const taskId = Date.now();
    const rewards = buildRewards(newTaskType, newTaskDifficulty);
    const description = newTaskDescription.trim();

    let taskToAdd: Task;

    if (newTaskType === "habit") {
      taskToAdd = {
        id: taskId,
        title,
        description,
        type: "habit",
        difficulty: newTaskDifficulty,
        rewards,
        completed: false,
        createdAt: now,
        positiveCount: 0,
        negativeCount: 0,
        lastCompletedAt: null,
      };
    } else if (newTaskType === "daily") {
      const schedule = normalizeSchedule(newDailyDays);
      const isDueToday = isTaskDueOnDay(schedule, todayKey);
      taskToAdd = {
        id: taskId,
        title,
        description,
        type: "daily",
        difficulty: newTaskDifficulty,
        rewards,
        completed: false,
        createdAt: now,
        schedule,
        lastCompletedAt: null,
        isDueToday,
        completionHistory: [],
      };
    } else {
      taskToAdd = {
        id: taskId,
        title,
        description,
        type: "quest",
        difficulty: newTaskDifficulty,
        rewards,
        completed: false,
        createdAt: now,
        dueDate: newQuestDueDate || null,
        completedAt: null,
      };
    }

    const nextState: TasksState = {
      ...taskState,
      tasks: synchronizeDailyFlags([taskToAdd, ...taskState.tasks], todayKey),
    };

    setTaskState(nextState);
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskType("daily");
    setNewTaskDifficulty("easy");
    setNewDailyDays([1, 2, 3, 4, 5, 6, 0]);
    setNewQuestDueDate("");
    setSystemNotice(null);
  }

  function handleCompleteHabit(taskId: number) {
    const task = taskState.tasks.find(
      (entry): entry is HabitTask => entry.id === taskId && entry.type === "habit",
    );
    if (!task) return;
    const completedToday = isHabitCompletedToday(task, todayKey);
    if (completedToday) return;

    const completedAt = new Date().toISOString();
    const nextTask: HabitTask = {
      ...task,
      positiveCount: task.positiveCount + 1,
      lastCompletedAt: completedAt,
      completed: true,
    };

    const nextTasks = synchronizeDailyFlags(
      taskState.tasks.map((entry) => (entry.id === taskId ? nextTask : entry)),
      todayKey,
    );
    const nextDayProgress = mergeProgress(taskState.dayProgress, todayKey, {
      xp: task.rewards.xp,
      energy: task.rewards.energy,
      gold: task.rewards.gold,
      tasksCompleted: 1,
      habitPositive: 1,
    });

    setTaskState({
      ...taskState,
      tasks: nextTasks,
      dayProgress: nextDayProgress,
    });

    const completedAtEvent = new Date().toISOString();
    const previousResources = {
      xp: player.xp,
      energy: player.energy,
      gold: player.gold,
    };
    applyPlayerResourceDelta(task.rewards);
    emitTaskCompleted({
      taskId: task.id,
      taskTitle: task.title,
      taskType: task.type,
      completedAt: completedAtEvent,
    });
    emitRewardEvent("task_completion", "Habit reward granted", task.rewards, task);
    emitResourceChange("task_completion", task.rewards, previousResources);
    pushRewardBurst(task.id, task.rewards, "Привычка выполнена");
  }

  function handleDeleteTask(taskId: number) {
    if (!taskState.tasks.some((entry) => entry.id === taskId)) {
      return;
    }

    setTaskState({
      ...taskState,
      tasks: taskState.tasks.filter((entry) => entry.id !== taskId),
    });
  }

  function handleEditTask(taskId: number) {
    const task = taskState.tasks.find((entry) => entry.id === taskId);
    if (!task) return;

    const nextTitle = window.prompt("Новое название задачи", task.title);
    if (nextTitle === null) return;

    const title = nextTitle.trim();
    const titleError = validateTaskTitle(title);
    if (titleError) {
      setSystemNotice(titleError);
      return;
    }

    const nextDescription = window.prompt(
      "Описание задачи (можно оставить пустым)",
      task.description,
    );

    setTaskState({
      ...taskState,
      tasks: taskState.tasks.map((entry) =>
        entry.id === taskId
          ? {
              ...entry,
              title,
              description: (nextDescription ?? "").trim(),
            }
          : entry,
      ),
    });
    setSystemNotice("Задача обновлена.");
  }

  function handleCompleteDaily(taskId: number) {
    const daily = taskState.tasks.find(
      (entry): entry is DailyTask => entry.id === taskId && entry.type === "daily",
    );
    if (!daily || !daily.isDueToday || daily.completionHistory.includes(todayKey)) {
      return;
    }

    const completedAt = new Date().toISOString();
    const updatedDaily: DailyTask = {
      ...daily,
      completionHistory: Array.from(new Set([...daily.completionHistory, todayKey])),
      lastCompletedAt: completedAt,
      completed: true,
      isDueToday: true,
    };

    const nextTasks = synchronizeDailyFlags(
      taskState.tasks.map((entry) => (entry.id === taskId ? updatedDaily : entry)),
      todayKey,
    );

    const nextDailies = nextTasks.filter((entry): entry is DailyTask => entry.type === "daily");
    const dueDailies = nextDailies.filter((entry) => entry.isDueToday);
    const allDueDone =
      dueDailies.length > 0 &&
      dueDailies.every((entry) => entry.completionHistory.includes(todayKey));

    let streakBonus: TaskRewards = { xp: 0, energy: 0, gold: 0 };
    let nextStreak: number | null = null;
    let nextLastCompletedAt: string | null = null;
    const todayEntry = taskState.dayProgress[todayKey] ?? createEmptyDayProgress();
    const canGrantStreakToday = allDueDone && !todayEntry.streakGranted;

    if (canGrantStreakToday) {
      const yesterdayKey = shiftDayKey(todayKey, -1);
      const lastDailyKey = dateStringToDayKey(player.lastCompletedAt);
      if (lastDailyKey === todayKey) {
        nextStreak = player.streak;
      } else if (lastDailyKey === yesterdayKey) {
        nextStreak = player.streak + 1;
      } else {
        nextStreak = 1;
      }
      nextLastCompletedAt = completedAt;
      streakBonus = DAILY_STREAK_BONUSES[nextStreak] ?? { xp: 0, energy: 0, gold: 0 };
    }

    const totalDelta = addRewards(daily.rewards, streakBonus);
    const nextProgress = mergeProgress(taskState.dayProgress, todayKey, {
      xp: totalDelta.xp,
      energy: totalDelta.energy,
      gold: totalDelta.gold,
      tasksCompleted: 1,
      dailiesCompleted: 1,
      streakGranted: canGrantStreakToday ? true : undefined,
    });

    setTaskState({
      ...taskState,
      tasks: nextTasks,
      dayProgress: nextProgress,
    });

    const previousResources = {
      xp: player.xp,
      energy: player.energy,
      gold: player.gold,
    };
    applyPlayerResourceDelta(totalDelta);
    emitTaskCompleted({
      taskId: daily.id,
      taskTitle: daily.title,
      taskType: daily.type,
      completedAt,
    });
    emitRewardEvent("task_completion", "Daily reward granted", totalDelta, daily);
    emitResourceChange("task_completion", totalDelta, previousResources);
    pushRewardBurst(daily.id, totalDelta, "Ежедневная выполнена");

    if (nextStreak !== null) {
      setProductivityStreak(nextStreak, nextLastCompletedAt);
      emitTaskStreakUpdated({
        previousStreak: player.streak,
        nextStreak,
        updatedAt: completedAt,
        reason: "daily_completion",
      });
    }

    if (streakBonus.xp > 0 || streakBonus.energy > 0 || streakBonus.gold > 0) {
      setSystemNotice(
        `Серия ${nextStreak} дней: бонус ${formatReward(streakBonus.xp)} опыта.`,
      );
    }
  }

  function handleCompleteQuest(taskId: number) {
    const quest = taskState.tasks.find(
      (entry): entry is QuestTask => entry.id === taskId && entry.type === "quest",
    );
    if (!quest || quest.completed) return;

    const completedAt = new Date().toISOString();
    const updatedQuest: QuestTask = {
      ...quest,
      completed: true,
      completedAt,
    };

    const nextTasks = taskState.tasks.map((entry) => (entry.id === taskId ? updatedQuest : entry));
    const nextProgress = mergeProgress(taskState.dayProgress, todayKey, {
      xp: quest.rewards.xp,
      energy: quest.rewards.energy,
      gold: quest.rewards.gold,
      tasksCompleted: 1,
    });

    setTaskState({
      ...taskState,
      tasks: nextTasks,
      dayProgress: nextProgress,
    });

    const previousResources = {
      xp: player.xp,
      energy: player.energy,
      gold: player.gold,
    };
    applyPlayerResourceDelta(quest.rewards);
    emitTaskCompleted({
      taskId: quest.id,
      taskTitle: quest.title,
      taskType: quest.type,
      completedAt,
    });
    emitRewardEvent("task_completion", "Quest reward granted", quest.rewards, quest);
    emitResourceChange("task_completion", quest.rewards, previousResources);
    pushRewardBurst(quest.id, quest.rewards, "Квест завершен");
  }

  function handleResetAll() {
    resetPlayer();
    const fresh = buildInitialStateFromTasks(createStarterTasks());
    setTaskState(fresh);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TASKS_STORAGE_KEY_V2);
      window.localStorage.removeItem(LEGACY_TASKS_STORAGE_KEY_V1);
    }
  }

  function handleRestoreEnergy() {
    const previousResources = {
      xp: player.xp,
      energy: player.energy,
      gold: player.gold,
    };
    const restored = restorePlayerEnergy();
    if (!restored) {
      if (energyRestoresRemainingToday <= 0) {
        setSystemNotice("Лимит восстановления энергии на сегодня достигнут (3/3).");
      } else if (player.gold < 20) {
        setSystemNotice("Недостаточно золота для восстановления энергии.");
      } else if (player.energy >= player.maxEnergy) {
        setSystemNotice("Энергия уже заполнена.");
      }
      return;
    }

    setEnergyRestoresUsedToday(getEnergyRestoresUsedToday());
    setEnergyRestoresRemainingToday(getEnergyRestoresRemainingTodayFromStore());
    emitResourceChange(
      "energy_restore",
      {
        xp: 0,
        energy: Math.min(25, player.maxEnergy - previousResources.energy),
        gold: player.isAdmin ? 0 : -20,
      },
      previousResources,
    );
    setSystemNotice(null);
  }
  return (
    <GameFrame player={player} active={activeNav}>
      <PageTitle
        eyebrow="Продуктивность в игровом ритме"
        title="РПГ-система задач"
        description="Привычки, ежедневные задачи и квесты в компактном формате: выполняйте задачи, получайте опыт и золото, усиливайте персонажа."
        rightSlot={
          <>
            <Link
              href="/app/missions"
              className="ui-btn border border-amber-400/35 bg-amber-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/25"
            >
              Открыть миссии
            </Link>
            <button
              onClick={handleResetAll}
              className="ui-btn border border-red-500/35 bg-red-500/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-red-100 transition hover:bg-red-500/25"
            >
              Сбросить прогресс
            </button>
          </>
        }
      />

      {systemNotice ? (
        <div className="mb-5 ui-card ui-frame border border-cyan-400/35 bg-cyan-500/15 px-4 py-3 text-sm text-cyan-100">
          <div className="flex items-center gap-2">
            <Image
              src="/habitica-ref/HabitRPG-habitica-images-32a4678/achievements/achievement-completedTask2x.png"
              alt="Системное уведомление"
              width={24}
              height={24}
              className="pixel-art h-6 w-6"
            />
            <span>{systemNotice}</span>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          {!isHydrated ? (
            <SectionCard title="Загрузка задач" subtitle="Синхронизация данных с локальным хранилищем">
              <div className="space-y-2">
                <div className="ui-card ui-frame border-white/10 bg-black/30 px-3 py-4 text-sm text-zinc-300">
                  Загружаем ваши задачи и прогресс...
                </div>
                <div className="ui-card ui-frame border-white/10 bg-black/20 px-3 py-4 text-sm text-zinc-500">
                  После загрузки станут доступны кнопки "+" и "-".
                </div>
              </div>
            </SectionCard>
          ) : (
            <>
          <SectionCard title="Создать задачу" subtitle="Короткая запись, быстрый запуск, понятная награда">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Название задачи"
                className="ui-btn border border-white/15 bg-black/35 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
              />

              <select
                value={newTaskType}
                onChange={(event) => setNewTaskType(event.target.value as TaskType)}
                className="ui-btn border border-white/15 bg-black/35 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
              >
                <option value="habit">Привычка</option>
                <option value="daily">Ежедневная</option>
                <option value="quest">Квест</option>
              </select>

              <textarea
                value={newTaskDescription}
                onChange={(event) => setNewTaskDescription(event.target.value)}
                placeholder="Описание (необязательно)"
                className="ui-btn border border-white/15 bg-black/35 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40 md:col-span-2"
                rows={3}
              />

              <select
                value={newTaskDifficulty}
                onChange={(event) => setNewTaskDifficulty(event.target.value as Difficulty)}
                className="ui-btn border border-white/15 bg-black/35 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
              >
                <option value="easy">{DIFFICULTY_LABELS.easy}</option>
                <option value="medium">{DIFFICULTY_LABELS.medium}</option>
                <option value="hard">{DIFFICULTY_LABELS.hard}</option>
              </select>

              <div className="ui-card ui-frame border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-300">
                Награда: +{buildRewards(newTaskType, newTaskDifficulty).xp} опыта • +
                {buildRewards(newTaskType, newTaskDifficulty).energy} энергии • +
                {buildRewards(newTaskType, newTaskDifficulty).gold} золота
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="ui-card ui-frame border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                Привычки: {activeCounts.habit} / {slotLimits.habit}
              </div>
              <div className="ui-card ui-frame border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                Ежедневные: {activeCounts.daily} / {slotLimits.daily}
              </div>
              <div className="ui-card ui-frame border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Квесты: {activeCounts.quest} / {slotLimits.quest}
              </div>
            </div>

            {newTaskType === "daily" ? (
              <div className="mt-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Расписание ежедневной задачи</p>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDailyDay(day.value)}
                      className={`ui-btn border px-3 py-1.5 text-xs font-semibold transition ${
                        newDailyDays.includes(day.value)
                          ? "border-cyan-500/35 bg-cyan-500/15 text-cyan-100"
                          : "border-white/15 bg-black/25 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {newTaskType === "quest" ? (
              <div className="mt-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Срок квеста (необязательно)</p>
                <input
                  type="date"
                  value={newQuestDueDate}
                  onChange={(event) => setNewQuestDueDate(event.target.value)}
                  className="ui-btn w-full border border-white/15 bg-black/35 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
                />
              </div>
            ) : null}

            <button
              onClick={addTask}
              className="ui-btn mt-4 w-full border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/25"
            >
              Добавить задачу
            </button>
          </SectionCard>

          <SectionCard title="Задачи" subtitle="Компактные карточки с фокусом на выполнение">
            <div className="mb-4 flex flex-wrap gap-2">
              {(
                Object.keys(SECTION_LABELS) as TaskSection[]
              ).map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`ui-btn border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                    activeSection === section
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
                      : "border-white/15 bg-black/25 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {SECTION_LABELS[section]}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {sectionTasks.length === 0 ? (
                <p className="ui-card ui-frame border-white/10 bg-black/30 px-3 py-4 text-sm text-zinc-400">
                  В этой секции пока нет задач.
                </p>
              ) : (
                sectionTasks.map((task) => {
                  const habitCompletedToday =
                    task.type === "habit" ? isHabitCompletedToday(task, todayKey) : false;
                  const dailyCompletedToday =
                    task.type === "daily" ? isDailyCompletedToday(task, todayKey) : false;
                  const questCompleted = task.type === "quest" ? task.completed : false;
                  const questOverdue = task.type === "quest" ? isQuestOverdue(task, todayKey) : false;
                  const completeDisabled =
                    task.type === "habit"
                      ? habitCompletedToday
                      : task.type === "daily"
                        ? !task.isDueToday || dailyCompletedToday
                        : questCompleted;
                  const completeAction =
                    task.type === "habit"
                      ? () => handleCompleteHabit(task.id)
                      : task.type === "daily"
                        ? () => handleCompleteDaily(task.id)
                        : () => handleCompleteQuest(task.id);
                  const completeTone =
                    task.type === "habit"
                      ? "border-emerald-400/45 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                      : task.type === "daily"
                        ? "border-cyan-400/45 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30"
                        : "border-amber-400/45 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30";
                  const taskBursts = rewardBursts.filter((entry) => entry.taskId === task.id);
                  const shortStatus =
                    task.type === "habit"
                      ? habitCompletedToday
                        ? "Выполнено сегодня"
                        : "Готово к выполнению"
                      : task.type === "daily"
                        ? task.isDueToday
                          ? dailyCompletedToday
                            ? "Ежедневная выполнена"
                            : "Нужно выполнить сегодня"
                          : "Сегодня не активен"
                        : questCompleted
                          ? "Квест завершен"
                          : task.dueDate
                            ? `Срок: ${task.dueDate}`
                            : "Без срока";

                  return (
                    <article
                      key={task.id}
                      className="task-card ui-card ui-frame relative border border-white/12 bg-black/35 px-3 py-3"
                    >
                      {taskBursts.length > 0 ? (
                        <div className="pointer-events-none absolute right-2 top-2 space-y-1">
                          {taskBursts.map((burst, index) => (
                            <div
                              key={burst.id}
                              className="floating-reward rounded border border-white/20 bg-black/70 px-2 py-1 text-[11px] font-bold"
                              style={{ animationDelay: `${index * 70}ms` }}
                            >
                              <span className="text-emerald-200">+{burst.rewards.xp} оп.</span>{" "}
                              <span className="text-amber-200">+{burst.rewards.gold} зол.</span>{" "}
                              <span className="text-cyan-200">+{burst.rewards.energy} эн.</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_ACCENT_STYLES[task.type]}`}>
                              {TYPE_BADGES[task.type]} · {TYPE_LABELS[task.type]}
                            </span>
                            <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DIFFICULTY_ACCENT_STYLES[task.difficulty]}`}>
                              {DIFFICULTY_LABELS[task.difficulty]}
                            </span>
                            {questOverdue && !questCompleted ? (
                              <span className="rounded border border-red-400/35 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-200">
                                Просрочено
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-2 truncate text-base font-semibold text-zinc-100">{task.title}</h3>
                          <p className="mt-1 text-xs text-zinc-400">{shortStatus}</p>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="rounded border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                              +{task.rewards.xp} опыта
                            </span>
                            <span className="rounded border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                              +{task.rewards.gold} золота
                            </span>
                            <span className="rounded border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                              +{task.rewards.energy} энергии
                            </span>
                          </div>

                          {task.type === "daily" ? (
                            <p className="mt-1 text-[11px] text-zinc-500">{formatSchedule(task.schedule)}</p>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-3 gap-2 lg:w-[260px]">
                          <button
                            onClick={completeAction}
                            disabled={completeDisabled}
                            className={`task-complete-btn ui-btn border px-2 py-2 text-xs font-bold uppercase tracking-wide transition ${
                              completeDisabled
                                ? "cursor-not-allowed border-white/15 bg-black/25 text-zinc-500"
                                : completeTone
                            }`}
                          >
                            Выполнить
                          </button>
                          <button
                            onClick={() => handleEditTask(task.id)}
                            className="ui-btn border border-white/20 bg-white/5 px-2 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200 hover:bg-white/10"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="ui-btn border border-red-500/35 bg-red-500/15 px-2 py-2 text-xs font-bold uppercase tracking-wide text-red-100 hover:bg-red-500/25"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </SectionCard>
            </>
          )}
        </div>

        <div className="space-y-5">
          <SectionCard title="Герой в центре" subtitle="Состояние персонажа и мгновенный прогресс">
            <div className="hero-core ui-card ui-frame relative overflow-hidden border-cyan-300/20 p-4">
              <div className="pointer-events-none absolute inset-0 opacity-25">
                <Image
                  src="/habitica-ref/HabitRPG-habitica-images-32a4678/backgrounds/background_hall_of_heroes.png"
                  alt="Зал героя"
                  fill
                  className="pixel-art object-cover"
                />
              </div>

              <div className="relative flex items-center gap-3">
                <div className="ui-slot subtle-glow-cyan border border-cyan-300/25 bg-black/45 p-2">
                  <Image
                    src={CLASS_AVATAR_MAP[player.classType]}
                    alt="Аватар персонажа"
                    width={72}
                    height={72}
                    className="pixel-art h-[72px] w-[72px]"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/85">Активный герой</p>
                  <h3 className="truncate text-xl font-black text-zinc-100">{player.name}</h3>
                  <p className="text-sm text-zinc-300">
                    {player.classType} • Уровень {player.level}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Экипировка: {equipped.weapon?.name ?? "без оружия"} / {equipped.armor?.name ?? "без брони"}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="ui-slot border border-cyan-300/25 bg-black/40 p-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-300">
                    <span>Опыт в уровне</span>
                    <span className="font-semibold text-cyan-100">
                      {xpInsideLevel}/{xpNeed}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded bg-black/55">
                    <div
                      className="progress-live h-full bg-gradient-to-r from-cyan-300/80 via-sky-300/85 to-indigo-300/80"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                </div>
                <div className="ui-slot border border-amber-300/25 bg-black/40 p-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-300">
                    <span>Энергия</span>
                    <span className="font-semibold text-cyan-100">
                      {player.energy}/{player.maxEnergy}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded bg-black/55">
                    <div
                      className="progress-live h-full bg-gradient-to-r from-cyan-300/80 via-emerald-300/80 to-green-300/80"
                      style={{ width: `${energyPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Прогресс дня" subtitle="Связь задач и экономики героя">
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              <div className="ui-slot border border-emerald-400/25 bg-emerald-500/10 p-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-300">
                  <span>Лимит дня</span>
                  <span className="font-semibold text-emerald-200">
                    {todayProgress.tasksCompleted}/{DAILY_COMPLETION_LIMIT}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded bg-black/55">
                  <div
                    className="progress-live h-full bg-gradient-to-r from-emerald-300/90 to-green-300/85"
                    style={{ width: `${dailyFillPercent}%` }}
                  />
                </div>
              </div>
              <div className="ui-slot border border-cyan-400/25 bg-cyan-500/10 p-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-300">
                  <span>Опыт в уровне</span>
                  <span className="font-semibold text-cyan-100">
                    {xpInsideLevel}/{xpNeed}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded bg-black/55">
                  <div
                    className="progress-live h-full bg-gradient-to-r from-cyan-300/90 to-sky-300/85"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
              <div className="ui-slot border border-amber-400/25 bg-amber-500/10 p-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-300">
                  <span>Энергия</span>
                  <span className="font-semibold text-amber-200">
                    {player.energy}/{player.maxEnergy}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded bg-black/55">
                  <div
                    className="progress-live h-full bg-gradient-to-r from-amber-300/90 to-orange-300/85"
                    style={{ width: `${energyPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Выполнено сегодня</p>
                <p className="mt-1 text-2xl font-black">{todayProgress.tasksCompleted}</p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Ежедневных выполнено</p>
                <p className="mt-1 text-2xl font-black">{todayProgress.dailiesCompleted}</p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Лимит на сегодня</p>
                <p className="mt-1 text-2xl font-black">
                  {remainingDailyLimit} / {DAILY_COMPLETION_LIMIT}
                </p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Серия (дней)</p>
                <p className="mt-1 text-2xl font-black">{player.streak}</p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Опыт в уровне</p>
                <p className="mt-1 text-xl font-black">
                  {xpInsideLevel} / {xpNeed}
                </p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Опыт за день</p>
                <p className={`mt-1 text-2xl font-black ${todayProgress.xp >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {formatReward(todayProgress.xp)}
                </p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Энергия за день</p>
                <p className={`mt-1 text-2xl font-black ${todayProgress.energy >= 0 ? "text-cyan-200" : "text-red-300"}`}>
                  {formatReward(todayProgress.energy)}
                </p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Миссии сегодня</p>
                <p className="mt-1 text-2xl font-black text-cyan-200">
                  {missionRunsToday} / {MISSION_DAILY_LIMIT}
                </p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Золото за день</p>
                <p className={`mt-1 text-2xl font-black ${todayProgress.gold >= 0 ? "text-amber-300" : "text-red-300"}`}>
                  {formatReward(todayProgress.gold)}
                </p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Энергия героя</p>
                <p className="mt-1 text-2xl font-black">
                  {player.energy} / {player.maxEnergy}
                </p>
              </div>
              <div className="ui-card ui-frame border-white/10 bg-black/30 p-4">
                <p className="text-sm text-zinc-400">Золото героя</p>
                <p className="mt-1 text-2xl font-black text-amber-300">{player.gold}</p>
              </div>
            </div>

            <button
              onClick={handleRestoreEnergy}
              disabled={
                player.gold < 20 ||
                player.energy >= player.maxEnergy ||
                energyRestoresRemainingToday <= 0
              }
              className={`ui-btn mt-4 w-full border px-4 py-3 text-sm font-bold uppercase tracking-wide transition ${
                player.gold < 20 ||
                player.energy >= player.maxEnergy ||
                energyRestoresRemainingToday <= 0
                  ? "cursor-not-allowed border-white/15 bg-black/30 text-zinc-500"
                  : "border-cyan-500/35 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
              }`}
            >
              Восстановить 25 энергии за 20 золота ({energyRestoresUsedToday}/{ENERGY_RESTORE_DAILY_LIMIT})
            </button>
          </SectionCard>

          <EquipmentPanel
            weapon={equipped.weapon}
            armor={equipped.armor}
            attack={player.attack}
            defense={player.defense}
          />

          <SectionCard title="Быстрые переходы" subtitle="Сначала дисциплина, затем миссии">
            <div className="grid gap-2">
              <Link href="/app/missions" className="ui-btn border border-amber-500/35 bg-amber-500/15 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25">
                Перейти в миссии
              </Link>
              <Link href="/app/character" className="ui-btn border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10">
                Открыть персонажа
              </Link>
              <Link href="/app/shop" className="ui-btn border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/10">
                Открыть магазин
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </GameFrame>
  );
}

