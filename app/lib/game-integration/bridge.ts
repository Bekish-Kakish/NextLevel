import {
  getInitialGameIntegrationState,
  getStoredRecentGameBridgeEvents,
  pushRecentGameBridgeEvent,
} from "./state";
import type {
  GameBridgeEvent,
  GameBridgeEventType,
  GameBridgeListener,
  GameBridgePayloadMap,
  GameIntegrationBridge,
  GameIntegrationState,
} from "./types";

const gameBridgeListeners = new Set<GameBridgeListener>();

function createGameBridgeEvent<TType extends GameBridgeEventType>(
  type: TType,
  payload: GameBridgePayloadMap[TType],
): GameBridgeEvent<TType> {
  return {
    id: `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    createdAt: new Date().toISOString(),
    payload,
  };
}

function publishGameBridgeEvent<TType extends GameBridgeEventType>(
  type: TType,
  payload: GameBridgePayloadMap[TType],
): GameBridgeEvent<TType> {
  const event = createGameBridgeEvent(type, payload);
  pushRecentGameBridgeEvent(event);
  gameBridgeListeners.forEach((listener) => listener(event));
  return event;
}

export function emitTaskCompleted(payload: GameBridgePayloadMap["TASK_COMPLETED"]) {
  return publishGameBridgeEvent("TASK_COMPLETED", payload);
}

export function emitTaskStreakUpdated(payload: GameBridgePayloadMap["TASK_STREAK_UPDATED"]) {
  return publishGameBridgeEvent("TASK_STREAK_UPDATED", payload);
}

export function emitPlayerResourcesChanged(
  payload: GameBridgePayloadMap["PLAYER_RESOURCES_CHANGED"],
) {
  return publishGameBridgeEvent("PLAYER_RESOURCES_CHANGED", payload);
}

export function emitGameRewardGranted(payload: GameBridgePayloadMap["GAME_REWARD_GRANTED"]) {
  return publishGameBridgeEvent("GAME_REWARD_GRANTED", payload);
}

export function subscribeToGameBridge(listener: GameBridgeListener) {
  gameBridgeListeners.add(listener);
  return () => {
    gameBridgeListeners.delete(listener);
  };
}

export function getRecentGameBridgeEvents() {
  return getStoredRecentGameBridgeEvents();
}

export function createGameIntegrationBridge(): GameIntegrationBridge {
  let currentState: GameIntegrationState = getInitialGameIntegrationState();

  return {
    async connect() {
      currentState = {
        ...currentState,
        status: "pending",
      };

      return currentState;
    },
    disconnect() {
      currentState = {
        ...getInitialGameIntegrationState(),
        status: "disconnected",
      };
    },
    getState() {
      return {
        ...currentState,
        rewards: [...currentState.rewards],
      };
    },
    isConnected() {
      return currentState.status === "connected";
    },
    emitTaskCompleted,
    emitTaskStreakUpdated,
    emitPlayerResourcesChanged,
    emitGameRewardGranted,
    subscribeToGameBridge,
    getRecentGameBridgeEvents,
  };
}
