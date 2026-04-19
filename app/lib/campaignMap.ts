export type CampaignMissionType = "combat" | "elite" | "boss";
export type CampaignMissionState = "locked" | "available" | "completed";

export type CampaignMissionNode = {
  id: string;
  order: number;
  name: string;
  type: CampaignMissionType;
  enemy: string;
  levelId: string;
  x: number;
  y: number;
  nextIds: string[];
};

type CampaignProgressEntry = {
  completedNodeIds: string[];
  unlockedNodeIds: string[];
  lastUpdatedAt: string;
};

type CampaignProgressStore = {
  byProfile: Record<string, CampaignProgressEntry>;
};

export const CAMPAIGN_PROGRESS_STORAGE_KEY = "nextlevel_campaign_progress_v1";

export const CAMPAIGN_NODES: CampaignMissionNode[] = [
  {
    id: "m01",
    order: 1,
    name: "Шепчущий лес",
    type: "combat",
    enemy: "Дорожный разбойник",
    levelId: "lesnoy-razboynik",
    x: 10,
    y: 74,
    nextIds: ["m02"],
  },
  {
    id: "m02",
    order: 2,
    name: "Дорога Западной Твердыни",
    type: "combat",
    enemy: "Разбойник-разведчик",
    levelId: "peshchernyy-zver",
    x: 18,
    y: 66,
    nextIds: ["m03"],
  },
  {
    id: "m03",
    order: 3,
    name: "Врата старых черепов",
    type: "combat",
    enemy: "Туннельный налётчик",
    levelId: "peshchernyy-zver",
    x: 26,
    y: 58,
    nextIds: ["m04"],
  },
  {
    id: "m04",
    order: 4,
    name: "Нижний перевал",
    type: "combat",
    enemy: "Горный мародёр",
    levelId: "strazh-ruin",
    x: 34,
    y: 50,
    nextIds: ["m05"],
  },
  {
    id: "m05",
    order: 5,
    name: "Клыки виверны",
    type: "combat",
    enemy: "Пещерный зверь",
    levelId: "strazh-ruin",
    x: 42,
    y: 42,
    nextIds: ["m06"],
  },
  {
    id: "m06",
    order: 6,
    name: "Змеиная пасть",
    type: "combat",
    enemy: "Капитан дозора",
    levelId: "tenevoy-okhotnik",
    x: 50,
    y: 34,
    nextIds: ["m07"],
  },
  {
    id: "m07",
    order: 7,
    name: "Переправа Теневых топей",
    type: "combat",
    enemy: "Пепельный налётчик",
    levelId: "tenevoy-okhotnik",
    x: 58,
    y: 26,
    nextIds: ["m08"],
  },
  {
    id: "m08",
    order: 8,
    name: "Хребет дозорной башни",
    type: "elite",
    enemy: "Капитан разбойников",
    levelId: "tenevoy-okhotnik",
    x: 68,
    y: 34,
    nextIds: ["m09"],
  },
  {
    id: "m09",
    order: 9,
    name: "Крепость Вулканус",
    type: "elite",
    enemy: "Пепельный чемпион",
    levelId: "vladyka-pepla",
    x: 78,
    y: 42,
    nextIds: ["m10"],
  },
  {
    id: "m10",
    order: 10,
    name: "Цитадель Когтя дракона",
    type: "boss",
    enemy: "Повелитель пепла",
    levelId: "vladyka-pepla",
    x: 88,
    y: 50,
    nextIds: [],
  },
];

function getDefaultProgressEntry(): CampaignProgressEntry {
  return {
    completedNodeIds: [],
    unlockedNodeIds: [CAMPAIGN_NODES[0]?.id ?? "m01"],
    lastUpdatedAt: new Date().toISOString(),
  };
}

function getDefaultStore(): CampaignProgressStore {
  return {
    byProfile: {},
  };
}

function uniqueIds(ids: string[]) {
  const valid = new Set(CAMPAIGN_NODES.map((node) => node.id));
  return Array.from(new Set(ids.filter((id) => valid.has(id))));
}

function normalizeProgressEntry(value: unknown): CampaignProgressEntry {
  if (!value || typeof value !== "object") {
    return getDefaultProgressEntry();
  }

  const raw = value as Partial<CampaignProgressEntry>;
  const completedNodeIds = Array.isArray(raw.completedNodeIds)
    ? uniqueIds(raw.completedNodeIds.filter((value): value is string => typeof value === "string"))
    : [];
  const unlockedNodeIds = Array.isArray(raw.unlockedNodeIds)
    ? uniqueIds(raw.unlockedNodeIds.filter((value): value is string => typeof value === "string"))
    : [];

  const firstNodeId = CAMPAIGN_NODES[0]?.id ?? "m01";
  if (!completedNodeIds.includes(firstNodeId) && !unlockedNodeIds.includes(firstNodeId)) {
    unlockedNodeIds.unshift(firstNodeId);
  }

  return {
    completedNodeIds,
    unlockedNodeIds,
    lastUpdatedAt:
      typeof raw.lastUpdatedAt === "string" && raw.lastUpdatedAt.length > 0
        ? raw.lastUpdatedAt
        : new Date().toISOString(),
  };
}

function normalizeStore(value: unknown): CampaignProgressStore {
  if (!value || typeof value !== "object") {
    return getDefaultStore();
  }

  const raw = value as Partial<CampaignProgressStore>;
  if (!raw.byProfile || typeof raw.byProfile !== "object") {
    return getDefaultStore();
  }

  const byProfile: Record<string, CampaignProgressEntry> = {};
  for (const [profileKey, progress] of Object.entries(raw.byProfile)) {
    if (typeof profileKey !== "string" || profileKey.length === 0) continue;
    byProfile[profileKey] = normalizeProgressEntry(progress);
  }

  return { byProfile };
}

function readCampaignStore() {
  if (typeof window === "undefined") {
    return getDefaultStore();
  }

  const raw = window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY);
  if (!raw) {
    return getDefaultStore();
  }

  try {
    return normalizeStore(JSON.parse(raw));
  } catch {
    return getDefaultStore();
  }
}

function writeCampaignStore(store: CampaignProgressStore) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CAMPAIGN_PROGRESS_STORAGE_KEY, JSON.stringify(store));
}

function getProgressEntryForProfile(profileKey: string) {
  const store = readCampaignStore();
  const current = normalizeProgressEntry(store.byProfile[profileKey]);
  const nextStore: CampaignProgressStore = {
    ...store,
    byProfile: {
      ...store.byProfile,
      [profileKey]: current,
    },
  };
  writeCampaignStore(nextStore);
  return current;
}

export function getCampaignNodeById(nodeId: string) {
  return CAMPAIGN_NODES.find((node) => node.id === nodeId) ?? null;
}

export function getCampaignMissionStateMap(profileKey: string): Record<string, CampaignMissionState> {
  const entry = getProgressEntryForProfile(profileKey);
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

export function completeCampaignMissionNode(profileKey: string, nodeId: string) {
  const node = getCampaignNodeById(nodeId);
  if (!node) return getCampaignMissionStateMap(profileKey);

  const store = readCampaignStore();
  const entry = normalizeProgressEntry(store.byProfile[profileKey]);
  const completed = new Set(entry.completedNodeIds);
  const unlocked = new Set(entry.unlockedNodeIds);

  if (!unlocked.has(nodeId) && !completed.has(nodeId)) {
    return getCampaignMissionStateMap(profileKey);
  }

  completed.add(nodeId);
  node.nextIds.forEach((nextNodeId) => {
    if (!completed.has(nextNodeId)) {
      unlocked.add(nextNodeId);
    }
  });

  const nextEntry: CampaignProgressEntry = {
    completedNodeIds: uniqueIds(Array.from(completed)),
    unlockedNodeIds: uniqueIds(Array.from(unlocked)),
    lastUpdatedAt: new Date().toISOString(),
  };

  const nextStore: CampaignProgressStore = {
    ...store,
    byProfile: {
      ...store.byProfile,
      [profileKey]: nextEntry,
    },
  };
  writeCampaignStore(nextStore);
  return getCampaignMissionStateMap(profileKey);
}
