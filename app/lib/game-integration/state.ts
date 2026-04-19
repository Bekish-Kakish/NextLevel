import type { GameBridgeEvent, GameIntegrationState, IframeMessageLog } from "./types";

const initialGameIntegrationState: GameIntegrationState = {
  provider: "Kaetram",
  status: "idle",
  message: "Kaetram integration is not connected yet",
  rewards: [],
};

const MAX_RECENT_GAME_BRIDGE_EVENTS = 12;
const MAX_RECENT_IFRAME_MESSAGES = 20;
let recentGameBridgeEvents: GameBridgeEvent[] = [];
let recentIframeMessages: IframeMessageLog[] = [];

export function getInitialGameIntegrationState(): GameIntegrationState {
  return {
    ...initialGameIntegrationState,
    rewards: [...initialGameIntegrationState.rewards],
  };
}

export function getGameIntegrationState(): GameIntegrationState {
  return getInitialGameIntegrationState();
}

export function pushRecentGameBridgeEvent(event: GameBridgeEvent) {
  recentGameBridgeEvents = [event, ...recentGameBridgeEvents].slice(0, MAX_RECENT_GAME_BRIDGE_EVENTS);
}

export function getStoredRecentGameBridgeEvents(): GameBridgeEvent[] {
  return recentGameBridgeEvents.map((event) => ({
    ...event,
    payload: { ...event.payload },
  }));
}

export function pushRecentIframeMessage(entry: IframeMessageLog) {
  recentIframeMessages = [entry, ...recentIframeMessages].slice(0, MAX_RECENT_IFRAME_MESSAGES);
}

export function getStoredRecentIframeMessages(): IframeMessageLog[] {
  return recentIframeMessages.map((entry) => ({ ...entry }));
}
