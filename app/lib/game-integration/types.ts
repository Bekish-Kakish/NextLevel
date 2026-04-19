export type GameIntegrationStatus = "idle" | "pending" | "connected" | "disconnected";

export type PendingTaskReward = {
  id: string;
  sourceTaskId: string;
  label: string;
  quantity: number;
};

export type GameBridgeEventType =
  | "TASK_COMPLETED"
  | "TASK_STREAK_UPDATED"
  | "PLAYER_RESOURCES_CHANGED"
  | "GAME_REWARD_GRANTED";

export type TaskCompletedBridgePayload = {
  taskId: number;
  taskTitle: string;
  taskType: "habit" | "daily" | "quest";
  completedAt: string;
};

export type TaskStreakUpdatedBridgePayload = {
  previousStreak: number;
  nextStreak: number;
  updatedAt: string;
  reason: "daily_completion" | "daily_audit_reset";
};

export type PlayerResourcesChangedBridgePayload = {
  source: string;
  changedAt: string;
  delta: {
    xp: number;
    energy: number;
    gold: number;
  };
  before: {
    xp: number;
    energy: number;
    gold: number;
  };
  after: {
    xp: number;
    energy: number;
    gold: number;
  };
};

export type GameRewardGrantedBridgePayload = {
  source: string;
  grantedAt: string;
  taskId?: number;
  taskTitle?: string;
  label: string;
  rewards: {
    xp: number;
    energy: number;
    gold: number;
  };
};

export type GameBridgePayloadMap = {
  TASK_COMPLETED: TaskCompletedBridgePayload;
  TASK_STREAK_UPDATED: TaskStreakUpdatedBridgePayload;
  PLAYER_RESOURCES_CHANGED: PlayerResourcesChangedBridgePayload;
  GAME_REWARD_GRANTED: GameRewardGrantedBridgePayload;
};

export type GameBridgeEvent<TType extends GameBridgeEventType = GameBridgeEventType> = {
  id: string;
  type: TType;
  createdAt: string;
  payload: GameBridgePayloadMap[TType];
};

export type GameBridgeListener = (event: GameBridgeEvent) => void;

export type GameIframeMessageType =
  | "SITE_READY"
  | "GAME_READY"
  | "TASK_COMPLETED"
  | "PLAYER_RESOURCES_CHANGED"
  | "GAME_REWARD_GRANTED";

export type SiteReadyMessagePayload = {
  source: "nextlevel-host";
  timestamp: string;
};

export type GameReadyMessagePayload = {
  source: "kaetram-game";
  timestamp: string;
  version?: string;
};

export type GameIframePayloadMap = {
  SITE_READY: SiteReadyMessagePayload;
  GAME_READY: GameReadyMessagePayload;
  TASK_COMPLETED: TaskCompletedBridgePayload;
  PLAYER_RESOURCES_CHANGED: PlayerResourcesChangedBridgePayload;
  GAME_REWARD_GRANTED: GameRewardGrantedBridgePayload;
};

export type GameIframeMessage<TType extends GameIframeMessageType = GameIframeMessageType> = {
  channel: "NEXTLEVEL_GAME_BRIDGE";
  type: TType;
  sentAt: string;
  payload: GameIframePayloadMap[TType];
};

export type IframeMessageDirection = "to-game" | "from-game" | "ignored";

export type IframeMessageLog = {
  id: string;
  createdAt: string;
  direction: IframeMessageDirection;
  origin: string;
  type: GameIframeMessageType | "UNKNOWN";
  summary: string;
};

export type IframeBridgeListener = (
  message: GameIframeMessage,
  event: MessageEvent<unknown>,
) => void;

export type IframeConnectionStatus = "idle" | "loading" | "waiting_game_ready" | "connected";

export type GameIntegrationState = {
  provider: string;
  status: GameIntegrationStatus;
  message: string;
  rewards: PendingTaskReward[];
};

export type GameIntegrationBridge = {
  connect: () => Promise<GameIntegrationState>;
  disconnect: () => void;
  getState: () => GameIntegrationState;
  isConnected: () => boolean;
  emitTaskCompleted: (payload: TaskCompletedBridgePayload) => GameBridgeEvent<"TASK_COMPLETED">;
  emitTaskStreakUpdated: (
    payload: TaskStreakUpdatedBridgePayload,
  ) => GameBridgeEvent<"TASK_STREAK_UPDATED">;
  emitPlayerResourcesChanged: (
    payload: PlayerResourcesChangedBridgePayload,
  ) => GameBridgeEvent<"PLAYER_RESOURCES_CHANGED">;
  emitGameRewardGranted: (
    payload: GameRewardGrantedBridgePayload,
  ) => GameBridgeEvent<"GAME_REWARD_GRANTED">;
  subscribeToGameBridge: (listener: GameBridgeListener) => () => void;
  getRecentGameBridgeEvents: () => GameBridgeEvent[];
};
