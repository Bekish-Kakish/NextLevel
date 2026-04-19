"use client";

import {
  ADMIN_GOLD_BALANCE,
  PLAYER_STORAGE_KEY,
  type Player,
} from "./playerStore";
import {
  CAMPAIGN_NODES,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  type CampaignMissionState,
} from "./campaignMap";
import { MISSION_RUNS_STORAGE_KEY, buildMissionProfileKey } from "./missionRules";
import { clamp, getDefaultAppearance, getDerivedPlayerStats, getLevelRange, getTodayKey } from "./playerUtils";
import { getShopItemById, shopItems, starterItemId } from "./shopData";
import { listAccountProfiles, type AuthAccountProfile } from "./auth";

type MissionRunEntry = {
  dayKey: string;
  runs: number;
  lastResetAt: string | null;
};

type MissionRunState = {
  byProfile: Record<string, MissionRunEntry>;
};

type CampaignProgressEntry = {
  completedNodeIds: string[];
  unlockedNodeIds: string[];
  lastUpdatedAt: string;
};

type CampaignProgressStore = {
  byProfile: Record<string, CampaignProgressEntry>;
};

export type AdminPlayerRecord = {
  account: AuthAccountProfile;
  player: Player;
  profileKey: string;
  missionRunsToday: number;
  campaignProgressPercent: number;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getPlayerStorageKeyForEmail(email: string) {
  return `${PLAYER_STORAGE_KEY}:${normalizeEmail(email)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function getValidNodeIds() {
  return new Set(CAMPAIGN_NODES.map((node) => node.id));
}

function uniqueNodeIds(ids: string[]) {
  const validNodeIds = getValidNodeIds();
  return Array.from(new Set(ids.filter((id) => validNodeIds.has(id))));
}

function getDefaultCampaignEntry(): CampaignProgressEntry {
  return {
    completedNodeIds: [],
    unlockedNodeIds: [CAMPAIGN_NODES[0]?.id ?? "m01"],
    lastUpdatedAt: new Date().toISOString(),
  };
}

function readCampaignStore(): CampaignProgressStore {
  const fallback: CampaignProgressStore = { byProfile: {} };
  const store = readJson<CampaignProgressStore>(CAMPAIGN_PROGRESS_STORAGE_KEY, fallback);

  if (!store || typeof store !== "object" || !store.byProfile || typeof store.byProfile !== "object") {
    return fallback;
  }

  return store;
}

function writeCampaignStore(store: CampaignProgressStore) {
  writeJson(CAMPAIGN_PROGRESS_STORAGE_KEY, store);
}

function readMissionRunState(): MissionRunState {
  const fallback: MissionRunState = { byProfile: {} };
  const state = readJson<MissionRunState>(MISSION_RUNS_STORAGE_KEY, fallback);

  if (!state || typeof state !== "object" || !state.byProfile || typeof state.byProfile !== "object") {
    return fallback;
  }

  return state;
}

function writeMissionRunState(state: MissionRunState) {
  writeJson(MISSION_RUNS_STORAGE_KEY, state);
}

function createDefaultPlayerForAccount(account: AuthAccountProfile): Player {
  const xp = 0;
  const equippedWeapon = getShopItemById(starterItemId)?.type === "weapon" ? starterItemId : null;
  const equippedArmor = null;
  const derived = getDerivedPlayerStats({
    classType: account.classType,
    xp,
    equippedWeapon,
    equippedArmor,
  });

  const isAdmin = account.role === "admin";

  return {
    role: account.role,
    name: account.heroName,
    classType: account.classType,
    avatarId: `герой-${account.classType.toLowerCase()}`,
    level: derived.level,
    xp,
    gold: isAdmin ? ADMIN_GOLD_BALANCE : 120,
    health: derived.maxHealth,
    maxHealth: derived.maxHealth,
    energy: derived.maxEnergy,
    maxEnergy: derived.maxEnergy,
    attack: derived.attack,
    defense: derived.defense,
    inventory: [starterItemId],
    equippedWeapon,
    equippedArmor,
    completedLevels: [],
    missionProgress: {},
    createdAt: account.createdAt,
    appearance: getDefaultAppearance(account.classType),
    streak: 0,
    lastCompletedAt: null,
    xpBonusPercent: derived.xpBonusPercent,
    critChance: derived.critChance,
    energyRestoreDayKey: getTodayKey(),
    energyRestoreCount: 0,
    isAdmin,
  };
}

function normalizeInventory(value: unknown) {
  const fallback = [starterItemId];
  if (!Array.isArray(value)) {
    return fallback;
  }

  const result = Array.from(
    new Set(
      value.filter((item): item is number => typeof item === "number" && Number.isFinite(item) && getShopItemById(item) !== null),
    ),
  );

  if (result.length === 0) {
    return fallback;
  }

  if (!result.includes(starterItemId)) {
    result.unshift(starterItemId);
  }

  return result;
}

function normalizeEquippedId(value: unknown, inventory: number[], type: "weapon" | "armor") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (!inventory.includes(value)) {
    return null;
  }

  const item = getShopItemById(value);
  if (!item || item.type !== type) {
    return null;
  }

  return value;
}

function enforceDerivedStats(basePlayer: Player): Player {
  const safeXp = Math.max(0, Math.floor(basePlayer.xp));
  const inventory = normalizeInventory(basePlayer.inventory);
  const equippedWeapon = normalizeEquippedId(basePlayer.equippedWeapon, inventory, "weapon");
  const equippedArmor = normalizeEquippedId(basePlayer.equippedArmor, inventory, "armor");

  const derived = getDerivedPlayerStats({
    classType: basePlayer.classType,
    xp: safeXp,
    equippedWeapon,
    equippedArmor,
  });

  const isAdmin = basePlayer.role === "admin";

  return {
    ...basePlayer,
    isAdmin,
    inventory,
    equippedWeapon,
    equippedArmor,
    xp: safeXp,
    level: derived.level,
    maxHealth: derived.maxHealth,
    maxEnergy: derived.maxEnergy,
    attack: derived.attack,
    defense: derived.defense,
    health: clamp(Math.round(basePlayer.health), 1, derived.maxHealth),
    energy: clamp(Math.round(basePlayer.energy), 0, derived.maxEnergy),
    xpBonusPercent: derived.xpBonusPercent,
    critChance: derived.critChance,
    gold: isAdmin ? ADMIN_GOLD_BALANCE : Math.max(0, Math.floor(basePlayer.gold)),
    completedLevels: Array.isArray(basePlayer.completedLevels)
      ? Array.from(new Set(basePlayer.completedLevels.filter((entry) => typeof entry === "string")))
      : [],
    missionProgress:
      basePlayer.missionProgress && typeof basePlayer.missionProgress === "object"
        ? basePlayer.missionProgress
        : {},
  };
}

function readPlayerForAccount(account: AuthAccountProfile): Player {
  const fallback = createDefaultPlayerForAccount(account);
  const storageKey = getPlayerStorageKeyForEmail(account.email);
  const raw = readJson<unknown>(storageKey, null);

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const source = raw as Partial<Player>;
  const merged: Player = {
    ...fallback,
    ...source,
    role: account.role,
    isAdmin: account.role === "admin",
    classType: account.classType,
    name: typeof source.name === "string" && source.name.trim().length > 0 ? source.name.trim() : account.heroName,
    createdAt: typeof source.createdAt === "string" && source.createdAt.length > 0 ? source.createdAt : account.createdAt,
    avatarId:
      typeof source.avatarId === "string" && source.avatarId.trim().length > 0
        ? source.avatarId
        : `герой-${account.classType.toLowerCase()}`,
  };

  return enforceDerivedStats(merged);
}

function writePlayerForAccount(account: AuthAccountProfile, player: Player) {
  const storageKey = getPlayerStorageKeyForEmail(account.email);
  writeJson(storageKey, enforceDerivedStats(player));
}

function findAccountByEmail(email: string) {
  const normalized = normalizeEmail(email);
  return listAccountProfiles().find((account) => normalizeEmail(account.email) === normalized) ?? null;
}

function withPlayerByEmail(email: string, updater: (player: Player, account: AuthAccountProfile) => Player) {
  const account = findAccountByEmail(email);
  if (!account) {
    return false;
  }

  const current = readPlayerForAccount(account);
  const next = updater(current, account);
  writePlayerForAccount(account, next);
  return true;
}

function getMissionStateMap(entry: CampaignProgressEntry): Record<string, CampaignMissionState> {
  const completed = new Set(entry.completedNodeIds);
  const unlocked = new Set(entry.unlockedNodeIds);

  return Object.fromEntries(
    CAMPAIGN_NODES.map((node) => {
      if (completed.has(node.id)) {
        return [node.id, "completed" as const];
      }

      if (unlocked.has(node.id)) {
        return [node.id, "available" as const];
      }

      return [node.id, "locked" as const];
    }),
  );
}

function getCampaignEntry(profileKey: string) {
  const store = readCampaignStore();
  const entry = store.byProfile[profileKey] ?? getDefaultCampaignEntry();

  return {
    store,
    entry: {
      completedNodeIds: uniqueNodeIds(entry.completedNodeIds ?? []),
      unlockedNodeIds: uniqueNodeIds(entry.unlockedNodeIds ?? []),
      lastUpdatedAt: entry.lastUpdatedAt ?? new Date().toISOString(),
    },
  };
}

function setCampaignEntry(profileKey: string, entry: CampaignProgressEntry) {
  const { store } = getCampaignEntry(profileKey);

  const nextEntry: CampaignProgressEntry = {
    completedNodeIds: uniqueNodeIds(entry.completedNodeIds),
    unlockedNodeIds: uniqueNodeIds(entry.unlockedNodeIds),
    lastUpdatedAt: new Date().toISOString(),
  };

  if (!nextEntry.unlockedNodeIds.includes(CAMPAIGN_NODES[0]?.id ?? "m01")) {
    nextEntry.unlockedNodeIds.unshift(CAMPAIGN_NODES[0]?.id ?? "m01");
  }

  writeCampaignStore({
    ...store,
    byProfile: {
      ...store.byProfile,
      [profileKey]: nextEntry,
    },
  });
}

function setMissionRuns(profileKey: string, runs: number) {
  const today = getTodayKey();
  const state = readMissionRunState();

  writeMissionRunState({
    ...state,
    byProfile: {
      ...state.byProfile,
      [profileKey]: {
        dayKey: today,
        runs: Math.max(0, Math.floor(runs)),
        lastResetAt: new Date().toISOString(),
      },
    },
  });
}

function getMissionRunsToday(profileKey: string) {
  const today = getTodayKey();
  const state = readMissionRunState();
  const entry = state.byProfile[profileKey];

  if (!entry || entry.dayKey !== today) {
    return 0;
  }

  return Math.max(0, Math.floor(entry.runs));
}

export function getAdminPlayers(): AdminPlayerRecord[] {
  const accounts = listAccountProfiles();

  return accounts
    .map((account) => {
      const player = readPlayerForAccount(account);
      const profileKey = buildMissionProfileKey(player);
      const campaignEntry = getCampaignEntry(profileKey).entry;
      const progressPercent = Math.round(
        (campaignEntry.completedNodeIds.length / Math.max(1, CAMPAIGN_NODES.length)) * 100,
      );

      return {
        account,
        player,
        profileKey,
        missionRunsToday: getMissionRunsToday(profileKey),
        campaignProgressPercent: progressPercent,
      } satisfies AdminPlayerRecord;
    })
    .sort((a, b) => {
      if (a.account.role !== b.account.role) {
        return a.account.role === "admin" ? -1 : 1;
      }

      return a.account.email.localeCompare(b.account.email);
    });
}

export function updatePlayerProgress(
  email: string,
  updates: {
    gold?: number;
    xp?: number;
    health?: number;
    energy?: number;
    level?: number;
  },
) {
  return withPlayerByEmail(email, (player) => {
    const levelXp =
      typeof updates.level === "number" && Number.isFinite(updates.level)
        ? getLevelRange(Math.max(1, Math.floor(updates.level))).min
        : null;

    const nextXp =
      levelXp !== null
        ? levelXp
        : typeof updates.xp === "number" && Number.isFinite(updates.xp)
          ? Math.max(0, Math.floor(updates.xp))
          : player.xp;

    const nextGold =
      typeof updates.gold === "number" && Number.isFinite(updates.gold)
        ? Math.max(0, Math.floor(updates.gold))
        : player.gold;

    const nextHealth =
      typeof updates.health === "number" && Number.isFinite(updates.health)
        ? Math.round(updates.health)
        : player.health;

    const nextEnergy =
      typeof updates.energy === "number" && Number.isFinite(updates.energy)
        ? Math.round(updates.energy)
        : player.energy;

    return enforceDerivedStats({
      ...player,
      xp: nextXp,
      gold: nextGold,
      health: nextHealth,
      energy: nextEnergy,
    });
  });
}

export function resetPlayerProgress(email: string) {
  const account = findAccountByEmail(email);
  if (!account) {
    return false;
  }

  const player = createDefaultPlayerForAccount(account);
  writePlayerForAccount(account, player);

  const profileKey = buildMissionProfileKey(player);
  setMissionRuns(profileKey, 0);
  setCampaignEntry(profileKey, getDefaultCampaignEntry());
  return true;
}

export function grantStarterBonuses(email: string) {
  return withPlayerByEmail(email, (player) => {
    const nextInventory = Array.from(new Set([...player.inventory, starterItemId, 2, 4, 8, 9]));

    const updated = enforceDerivedStats({
      ...player,
      xp: player.xp + 250,
      gold: player.gold + 500,
      inventory: nextInventory,
    });

    return {
      ...updated,
      health: updated.maxHealth,
      energy: updated.maxEnergy,
    };
  });
}

export function setMissionState(email: string, nodeId: string, state: CampaignMissionState) {
  const account = findAccountByEmail(email);
  if (!account) {
    return false;
  }

  const player = readPlayerForAccount(account);
  const profileKey = buildMissionProfileKey(player);
  const current = getCampaignEntry(profileKey).entry;
  const completed = new Set(current.completedNodeIds);
  const unlocked = new Set(current.unlockedNodeIds);

  completed.delete(nodeId);
  unlocked.delete(nodeId);

  if (state === "available" || state === "completed") {
    unlocked.add(nodeId);
  }

  if (state === "completed") {
    completed.add(nodeId);
  }

  setCampaignEntry(profileKey, {
    completedNodeIds: Array.from(completed),
    unlockedNodeIds: Array.from(unlocked),
    lastUpdatedAt: new Date().toISOString(),
  });

  return true;
}

export function unlockNextMission(email: string) {
  const account = findAccountByEmail(email);
  if (!account) {
    return false;
  }

  const player = readPlayerForAccount(account);
  const profileKey = buildMissionProfileKey(player);
  const entry = getCampaignEntry(profileKey).entry;
  const stateMap = getMissionStateMap(entry);
  const nextLocked = CAMPAIGN_NODES.find((node) => stateMap[node.id] === "locked");

  if (!nextLocked) {
    return false;
  }

  const unlocked = new Set(entry.unlockedNodeIds);
  unlocked.add(nextLocked.id);

  setCampaignEntry(profileKey, {
    ...entry,
    unlockedNodeIds: Array.from(unlocked),
  });

  return true;
}

export function unlockAllMissions(email: string) {
  const account = findAccountByEmail(email);
  if (!account) {
    return false;
  }

  const player = readPlayerForAccount(account);
  const profileKey = buildMissionProfileKey(player);
  const all = CAMPAIGN_NODES.map((node) => node.id);

  setCampaignEntry(profileKey, {
    completedNodeIds: all,
    unlockedNodeIds: all,
    lastUpdatedAt: new Date().toISOString(),
  });

  return true;
}

export function resetCampaignProgress(email: string) {
  const account = findAccountByEmail(email);
  if (!account) {
    return false;
  }

  const player = readPlayerForAccount(account);
  const profileKey = buildMissionProfileKey(player);
  setCampaignEntry(profileKey, getDefaultCampaignEntry());
  return true;
}

export function resetMissionDailyLimit(email: string) {
  const account = findAccountByEmail(email);
  if (!account) {
    return false;
  }

  const player = readPlayerForAccount(account);
  const profileKey = buildMissionProfileKey(player);
  setMissionRuns(profileKey, 0);
  return true;
}

export function addInventoryItem(email: string, itemId: number) {
  const item = getShopItemById(itemId);
  if (!item) {
    return false;
  }

  return withPlayerByEmail(email, (player) => {
    if (player.inventory.includes(itemId)) {
      return player;
    }

    return {
      ...player,
      inventory: [...player.inventory, itemId],
    };
  });
}

export function removeInventoryItem(email: string, itemId: number) {
  return withPlayerByEmail(email, (player) => {
    const nextInventory = player.inventory.filter((id) => id !== itemId);

    return enforceDerivedStats({
      ...player,
      inventory: nextInventory.length > 0 ? nextInventory : [starterItemId],
      equippedWeapon: player.equippedWeapon === itemId ? null : player.equippedWeapon,
      equippedArmor: player.equippedArmor === itemId ? null : player.equippedArmor,
    });
  });
}

export function setPlayerEquipment(
  email: string,
  equipment: {
    weaponId?: number | null;
    armorId?: number | null;
  },
) {
  return withPlayerByEmail(email, (player) => {
    const nextWeapon =
      equipment.weaponId === undefined
        ? player.equippedWeapon
        : equipment.weaponId === null
          ? null
          : player.inventory.includes(equipment.weaponId) && getShopItemById(equipment.weaponId)?.type === "weapon"
            ? equipment.weaponId
            : player.equippedWeapon;

    const nextArmor =
      equipment.armorId === undefined
        ? player.equippedArmor
        : equipment.armorId === null
          ? null
          : player.inventory.includes(equipment.armorId) && getShopItemById(equipment.armorId)?.type === "armor"
            ? equipment.armorId
            : player.equippedArmor;

    return {
      ...player,
      equippedWeapon: nextWeapon,
      equippedArmor: nextArmor,
    };
  });
}

export function addTestLoot(email: string) {
  const lootPool = shopItems.filter((item) => item.id !== starterItemId);
  if (lootPool.length === 0) {
    return false;
  }

  return withPlayerByEmail(email, (player) => {
    const picked = new Set<number>();
    for (let i = 0; i < 3; i += 1) {
      const random = lootPool[Math.floor(Math.random() * lootPool.length)];
      if (random) {
        picked.add(random.id);
      }
    }

    return {
      ...player,
      inventory: Array.from(new Set([...player.inventory, ...picked])),
    };
  });
}

export function quickRestoreEnergy(email: string) {
  return withPlayerByEmail(email, (player) => ({
    ...player,
    energy: player.maxEnergy,
  }));
}

export function quickAddGold(email: string, amount = 250) {
  return withPlayerByEmail(email, (player) => ({
    ...player,
    gold: player.gold + Math.max(0, Math.floor(amount)),
  }));
}

export function quickGiveXp(email: string, amount = 120) {
  return withPlayerByEmail(email, (player) => ({
    ...player,
    xp: player.xp + Math.max(0, Math.floor(amount)),
  }));
}

export function getMissionStateForPlayer(email: string) {
  const account = findAccountByEmail(email);
  if (!account) {
    return null;
  }

  const player = readPlayerForAccount(account);
  const profileKey = buildMissionProfileKey(player);
  const entry = getCampaignEntry(profileKey).entry;

  return getMissionStateMap(entry);
}
