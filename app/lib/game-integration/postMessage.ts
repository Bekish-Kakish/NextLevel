import { getStoredRecentIframeMessages, pushRecentIframeMessage } from "./state";
import type {
  GameBridgeEvent,
  GameRewardGrantedBridgePayload,
  GameIframeMessage,
  GameIframeMessageType,
  IframeBridgeListener,
  IframeMessageLog,
  PlayerResourcesChangedBridgePayload,
  TaskCompletedBridgePayload,
} from "./types";

export const GAME_IFRAME_PLACEHOLDER_URL = "about:blank";
export const GAME_IFRAME_ALLOWED_ORIGIN = "*";

const MESSAGE_CHANNEL = "NEXTLEVEL_GAME_BRIDGE";

function createLogEntry(params: {
  direction: IframeMessageLog["direction"];
  origin: string;
  type: IframeMessageLog["type"];
  summary: string;
}): IframeMessageLog {
  return {
    id: `iframe-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    direction: params.direction,
    origin: params.origin,
    type: params.type,
    summary: params.summary,
  };
}

function summarizePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "No payload";

  const keys = Object.keys(payload as Record<string, unknown>);
  if (keys.length === 0) return "Empty payload";

  return keys
    .slice(0, 4)
    .map((key) => {
      const value = (payload as Record<string, unknown>)[key];
      const printable =
        value === null || value === undefined
          ? String(value)
          : typeof value === "object"
            ? "[object]"
            : String(value);
      return `${key}=${printable}`;
    })
    .join(", ");
}

function isAllowedOrigin(origin: string, expectedOrigin: string) {
  if (expectedOrigin === "*") return true;
  return origin === expectedOrigin;
}

function isGameIframeMessage(data: unknown): data is GameIframeMessage {
  if (!data || typeof data !== "object") return false;
  const candidate = data as Partial<GameIframeMessage>;
  if (candidate.channel !== MESSAGE_CHANNEL) return false;
  if (typeof candidate.type !== "string") return false;
  if (typeof candidate.sentAt !== "string") return false;
  return true;
}

export function getRecentIframeMessages() {
  return getStoredRecentIframeMessages();
}

export function mapBridgeEventToGameMessage(
  event: GameBridgeEvent,
): GameIframeMessage<Exclude<GameIframeMessageType, "SITE_READY" | "GAME_READY">> | null {
  if (event.type === "TASK_COMPLETED") {
    const payload = event.payload as TaskCompletedBridgePayload;
    return {
      channel: MESSAGE_CHANNEL,
      type: "TASK_COMPLETED",
      sentAt: new Date().toISOString(),
      payload,
    };
  }

  if (event.type === "PLAYER_RESOURCES_CHANGED") {
    const payload = event.payload as PlayerResourcesChangedBridgePayload;
    return {
      channel: MESSAGE_CHANNEL,
      type: "PLAYER_RESOURCES_CHANGED",
      sentAt: new Date().toISOString(),
      payload,
    };
  }

  if (event.type === "GAME_REWARD_GRANTED") {
    const payload = event.payload as GameRewardGrantedBridgePayload;
    return {
      channel: MESSAGE_CHANNEL,
      type: "GAME_REWARD_GRANTED",
      sentAt: new Date().toISOString(),
      payload,
    };
  }

  return null;
}

export function buildSiteReadyMessage(): GameIframeMessage<"SITE_READY"> {
  return {
    channel: MESSAGE_CHANNEL,
    type: "SITE_READY",
    sentAt: new Date().toISOString(),
    payload: {
      source: "nextlevel-host",
      timestamp: new Date().toISOString(),
    },
  };
}

export function sendPostMessageToGameIframe(params: {
  iframeElement: HTMLIFrameElement | null;
  targetOrigin: string;
  message: GameIframeMessage;
}) {
  const { iframeElement, targetOrigin, message } = params;
  const targetWindow = iframeElement?.contentWindow;

  if (!targetWindow) {
    pushRecentIframeMessage(
      createLogEntry({
        direction: "ignored",
        origin: targetOrigin,
        type: message.type,
        summary: "iframe contentWindow is unavailable",
      }),
    );
    return false;
  }

  targetWindow.postMessage(message, targetOrigin);

  pushRecentIframeMessage(
    createLogEntry({
      direction: "to-game",
      origin: targetOrigin,
      type: message.type,
      summary: summarizePayload(message.payload),
    }),
  );

  return true;
}

export function subscribeToIframeMessages(params: {
  iframeElement: HTMLIFrameElement | null;
  expectedOrigin: string;
  onMessage: IframeBridgeListener;
}) {
  const { iframeElement, expectedOrigin, onMessage } = params;

  const handler = (event: MessageEvent<unknown>) => {
    const targetWindow = iframeElement?.contentWindow;
    const isExpectedSource = Boolean(targetWindow && event.source === targetWindow);
    const hasAllowedOrigin = isAllowedOrigin(event.origin, expectedOrigin);

    if (!isExpectedSource || !hasAllowedOrigin) {
      pushRecentIframeMessage(
        createLogEntry({
          direction: "ignored",
          origin: event.origin || "unknown",
          type: "UNKNOWN",
          summary: !isExpectedSource ? "ignored: unexpected source" : "ignored: unexpected origin",
        }),
      );
      return;
    }

    if (!isGameIframeMessage(event.data)) {
      pushRecentIframeMessage(
        createLogEntry({
          direction: "ignored",
          origin: event.origin || "unknown",
          type: "UNKNOWN",
          summary: "ignored: invalid message format",
        }),
      );
      return;
    }

    pushRecentIframeMessage(
      createLogEntry({
        direction: "from-game",
        origin: event.origin || "unknown",
        type: event.data.type,
        summary: summarizePayload(event.data.payload),
      }),
    );

    onMessage(event.data, event);
  };

  window.addEventListener("message", handler);
  return () => {
    window.removeEventListener("message", handler);
  };
}
