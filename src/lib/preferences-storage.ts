import { load, type Store } from "@tauri-apps/plugin-store";
import { isLanguagePreference, type LanguagePreference } from "@/i18n";

const STORE_PATH = "preferences.json";
const PREFERENCES_KEY = "preferences";

export type UserPreferences = {
  activeAssistantId: string;
  chatMessageFontSize: number;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  language: LanguagePreference;
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

    return {
      activeAssistantId:
        typeof stored.activeAssistantId === "string"
          ? stored.activeAssistantId
          : fallback.activeAssistantId,
      chatMessageFontSize: Number.isFinite(fontSize)
        ? clamp(fontSize, 12, 22)
        : fallback.chatMessageFontSize,
      sidebarCollapsed:
        typeof stored.sidebarCollapsed === "boolean"
          ? stored.sidebarCollapsed
          : fallback.sidebarCollapsed,
      sidebarWidth: Number.isFinite(sidebarWidth)
        ? clamp(sidebarWidth, 220, 420)
        : fallback.sidebarWidth,
      language: isLanguagePreference(stored.language)
        ? stored.language
        : fallback.language,
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
