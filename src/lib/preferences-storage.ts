import { load, type Store } from "@tauri-apps/plugin-store";
import type { ReasoningMode } from "@/types";

const STORE_PATH = "preferences.json";
const PREFERENCES_KEY = "preferences";

export type UserPreferences = {
  activeAssistantId: string;
  chatMessageFontSize: number;
  reasoningMode: ReasoningMode;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  contextMessageLimit: number | null;
};

let storePromise: Promise<Store> | null = null;

function getStore() {
  storePromise ??= load(STORE_PATH, { autoSave: 100, defaults: {} });
  return storePromise;
}

export async function loadPreferences(
  fallback: UserPreferences,
): Promise<UserPreferences> {
  try {
    const store = await getStore();
    const stored = await store.get<Record<string, unknown>>(PREFERENCES_KEY);

    if (!stored || typeof stored !== "object") return fallback;

    const fontSize = Number(stored.chatMessageFontSize);
    const sidebarWidth = Number(stored.sidebarWidth);
    const contextMessageLimit = parseContextMessageLimit(
      stored.contextMessageLimit,
      fallback.contextMessageLimit,
    );

    return {
      activeAssistantId:
        typeof stored.activeAssistantId === "string"
          ? stored.activeAssistantId
          : fallback.activeAssistantId,
      chatMessageFontSize: Number.isFinite(fontSize)
        ? clamp(fontSize, 12, 22)
        : fallback.chatMessageFontSize,
      reasoningMode: isReasoningMode(stored.reasoningMode)
        ? stored.reasoningMode
        : fallback.reasoningMode,
      sidebarCollapsed:
        typeof stored.sidebarCollapsed === "boolean"
          ? stored.sidebarCollapsed
          : fallback.sidebarCollapsed,
      sidebarWidth: Number.isFinite(sidebarWidth)
        ? clamp(sidebarWidth, 220, 420)
        : fallback.sidebarWidth,
      contextMessageLimit,
    };
  } catch {
    return fallback;
  }
}

export async function savePreferences(preferences: UserPreferences) {
  try {
    const store = await getStore();
    await store.set(PREFERENCES_KEY, preferences);
    await store.save();
  } catch {
    // Store is unavailable in plain browser dev mode.
  }
}

function isReasoningMode(value: unknown): value is ReasoningMode {
  return value === "auto" || value === "off" || value === "on";
}

function parseContextMessageLimit(
  value: unknown,
  fallback: number | null,
): number | null {
  if (value === null) return null;
  const limit = Number(value);
  return Number.isFinite(limit) ? clamp(Math.round(limit), 0, 100) : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
