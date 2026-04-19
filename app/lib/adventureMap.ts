import { getLevelById } from "./mapData";

export type MissionNodeType =
  | "combat"
  | "elite"
  | "boss"
  | "treasure"
  | "rest"
  | "event";

export type MissionNodeState = "locked" | "available" | "completed";

export type MissionNode = {
  id: string;
  type: MissionNodeType;
  row: number;
  column: number;
  connections: string[];
  state: MissionNodeState;
  levelId: string | null;
  requiredLevel: number;
  title: string;
  description: string;
};

export type AdventureMapState = {
  rows: number;
  rowSizes: number[];
  currentRow: number;
  lastCompletedNodeId: string | null;
  createdAt: string;
  nodes: MissionNode[];
};

export const ADVENTURE_MAP_STORAGE_KEY = "nextlevel_adventure_map_v1";
const MAP_ROWS = 5;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted<T extends string>(pool: readonly T[]) {
  return pool[randomInt(0, pool.length - 1)] ?? pool[0];
}

function getLevelIdForNode(type: MissionNodeType, row: number) {
  if (type === "boss") return "vladyka-pepla";
  if (type === "elite") return "tenevoy-okhotnik";
  if (type !== "combat") return null;

  if (row <= 0) return "lesnoy-razboynik";
  if (row === 1) return "peshchernyy-zver";
  if (row === 2) return "strazh-ruin";
  return "tenevoy-okhotnik";
}

function getNodeTitle(type: MissionNodeType) {
  if (type === "combat") return "Combat";
  if (type === "elite") return "Elite";
  if (type === "boss") return "Boss";
  if (type === "treasure") return "Treasure";
  if (type === "rest") return "Rest";
  return "Event";
}

function getNodeDescription(type: MissionNodeType) {
  if (type === "combat") return "Обычная битва с противником.";
  if (type === "elite") return "Сильный враг и более ценный лут.";
  if (type === "boss") return "Финальный бой карты.";
  if (type === "treasure") return "Сундук с добычей.";
  if (type === "rest") return "Костёр: восстановление здоровья.";
  return "Случайное событие с риском и наградой.";
}

function buildRowTypes(row: number, nodeCount: number): MissionNodeType[] {
  if (row === 0) {
    return Array.from({ length: nodeCount }, () => "combat");
  }

  if (row === MAP_ROWS - 1) {
    return ["boss"];
  }

  if (row === 2) {
    const base = Array.from({ length: nodeCount }, () => "combat" as MissionNodeType);
    const eliteIndex = randomInt(0, nodeCount - 1);
    base[eliteIndex] = "elite";
    if (nodeCount > 2) {
      const restIndex = eliteIndex === 0 ? 1 : 0;
      base[restIndex] = "rest";
    }
    return base;
  }

  const pool =
    row === 1
      ? (["combat", "combat", "event", "treasure"] as const)
      : (["combat", "combat", "event", "treasure", "rest"] as const);

  return Array.from({ length: nodeCount }, () => pickWeighted(pool));
}

function getRequiredLevel(levelId: string | null) {
  if (!levelId) return 1;
  const level = getLevelById(levelId);
  return level?.enemyLevel ?? 1;
}

function buildConnections(
  rows: number,
  rowSizes: number[],
  nodeIdsByRow: string[][],
) {
  const byNode = new Map<string, string[]>();

  for (let row = 0; row < rows - 1; row += 1) {
    const currentCount = rowSizes[row] ?? 0;
    const nextCount = rowSizes[row + 1] ?? 0;

    for (let col = 0; col < currentCount; col += 1) {
      const currentId = nodeIdsByRow[row]?.[col];
      if (!currentId) continue;

      const fromRatio = currentCount > 1 ? col / (currentCount - 1) : 0;
      const pivot = Math.round(fromRatio * Math.max(0, nextCount - 1));
      const options = new Set<number>([pivot]);
      if (pivot + 1 < nextCount) options.add(pivot + 1);
      if (pivot - 1 >= 0) options.add(pivot - 1);

      const normalized = Array.from(options)
        .sort((a, b) => a - b)
        .slice(0, 2)
        .map((index) => nodeIdsByRow[row + 1]?.[index])
        .filter((id): id is string => Boolean(id));

      byNode.set(currentId, normalized);
    }
  }

  for (let row = 1; row < rows; row += 1) {
    const nextNodes = nodeIdsByRow[row] ?? [];
    nextNodes.forEach((nextId, nextCol) => {
      const hasIncoming = Array.from(byNode.values()).some((targets) =>
        targets.includes(nextId),
      );
      if (hasIncoming) return;

      const prevNodes = nodeIdsByRow[row - 1] ?? [];
      if (prevNodes.length === 0) return;

      const mappedPrevIndex = Math.round(
        (nextCol / Math.max(1, nextNodes.length - 1)) *
          Math.max(0, prevNodes.length - 1),
      );
      const prevId = prevNodes[mappedPrevIndex] ?? prevNodes[0];
      const prevTargets = byNode.get(prevId) ?? [];
      byNode.set(prevId, Array.from(new Set([...prevTargets, nextId])));
    });
  }

  return byNode;
}

export function isCombatNodeType(type: MissionNodeType) {
  return type === "combat" || type === "elite" || type === "boss";
}

export function generateAdventureMap(): AdventureMapState {
  const rowSizes = [3, randomInt(3, 4), randomInt(3, 4), randomInt(3, 4), 1];
  const nodeIdsByRow: string[][] = [];

  for (let row = 0; row < MAP_ROWS; row += 1) {
    const count = rowSizes[row] ?? 0;
    nodeIdsByRow[row] = Array.from({ length: count }, (_, col) => `r${row}c${col}`);
  }

  const connectionMap = buildConnections(MAP_ROWS, rowSizes, nodeIdsByRow);

  const nodes: MissionNode[] = [];

  for (let row = 0; row < MAP_ROWS; row += 1) {
    const count = rowSizes[row] ?? 0;
    const types = buildRowTypes(row, count);

    for (let col = 0; col < count; col += 1) {
      const id = nodeIdsByRow[row]?.[col] ?? `r${row}c${col}`;
      const type = types[col] ?? "combat";
      const levelId = getLevelIdForNode(type, row);
      nodes.push({
        id,
        type,
        row,
        column: col,
        connections: connectionMap.get(id) ?? [],
        state: row === 0 ? "available" : "locked",
        levelId,
        requiredLevel: getRequiredLevel(levelId),
        title: getNodeTitle(type),
        description: getNodeDescription(type),
      });
    }
  }

  return {
    rows: MAP_ROWS,
    rowSizes,
    currentRow: 0,
    lastCompletedNodeId: null,
    createdAt: new Date().toISOString(),
    nodes,
  };
}

function parseAdventureMap(raw: unknown): AdventureMapState | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<AdventureMapState>;
  if (!Array.isArray(data.nodes) || !Array.isArray(data.rowSizes)) {
    return null;
  }

  const normalizedRows =
    typeof data.rows === "number" && Number.isFinite(data.rows)
      ? Math.max(1, Math.floor(data.rows))
      : MAP_ROWS;
  const currentRow =
    typeof data.currentRow === "number" && Number.isFinite(data.currentRow)
      ? Math.max(0, Math.floor(data.currentRow))
      : 0;

  const normalizedNodes = data.nodes
    .filter((entry): entry is MissionNode => Boolean(entry && typeof entry === "object"))
    .map((entry) => ({
      ...entry,
      connections: Array.isArray(entry.connections)
        ? entry.connections.filter((id): id is string => typeof id === "string")
        : [],
      state:
        entry.state === "available" || entry.state === "completed" || entry.state === "locked"
          ? entry.state
          : "locked",
      requiredLevel:
        typeof entry.requiredLevel === "number" && Number.isFinite(entry.requiredLevel)
          ? Math.max(1, Math.floor(entry.requiredLevel))
          : 1,
    }));

  if (normalizedNodes.length === 0) {
    return null;
  }

  return {
    rows: normalizedRows,
    rowSizes: data.rowSizes.map((value) =>
      typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1,
    ),
    currentRow,
    lastCompletedNodeId:
      typeof data.lastCompletedNodeId === "string" ? data.lastCompletedNodeId : null,
    createdAt:
      typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    nodes: normalizedNodes,
  };
}

export function saveAdventureMap(map: AdventureMapState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADVENTURE_MAP_STORAGE_KEY, JSON.stringify(map));
}

export function getOrCreateAdventureMap() {
  if (typeof window === "undefined") {
    return generateAdventureMap();
  }

  const raw = window.localStorage.getItem(ADVENTURE_MAP_STORAGE_KEY);
  if (!raw) {
    const generated = generateAdventureMap();
    saveAdventureMap(generated);
    return generated;
  }

  try {
    const parsed = parseAdventureMap(JSON.parse(raw));
    if (parsed) {
      return parsed;
    }
  } catch {
    // Ignore invalid localStorage payload.
  }

  const generated = generateAdventureMap();
  saveAdventureMap(generated);
  return generated;
}

export function completeAdventureNode(map: AdventureMapState, nodeId: string) {
  const target = map.nodes.find((node) => node.id === nodeId);
  if (!target || target.state !== "available" || target.row !== map.currentRow) {
    return map;
  }

  const nodes = map.nodes.map((node) => {
    if (node.id === nodeId) {
      return { ...node, state: "completed" as const };
    }

    if (node.row === target.row && node.state === "available") {
      return { ...node, state: "locked" as const };
    }

    return node;
  });

  if (target.type === "boss") {
    return generateAdventureMap();
  }

  const nextRow = target.row + 1;
  const nextSet = new Set(target.connections);

  const withUnlockedNext = nodes.map((node) => {
    if (node.row === nextRow && nextSet.has(node.id) && node.state !== "completed") {
      return { ...node, state: "available" as const };
    }

    return node;
  });

  return {
    ...map,
    currentRow: Math.min(map.rows - 1, nextRow),
    lastCompletedNodeId: target.id,
    nodes: withUnlockedNext,
  };
}

export function completeAdventureNodeInStorage(nodeId: string) {
  const currentMap = getOrCreateAdventureMap();
  const nextMap = completeAdventureNode(currentMap, nodeId);
  saveAdventureMap(nextMap);
  return nextMap;
}
