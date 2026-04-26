import { load, type Store } from "@tauri-apps/plugin-store";
import { isBuiltinProvider } from "@/lib/model-providers";
import type {
  AssistantConfig,
  ModelProviderConfig,
  ModelProviderType,
} from "@/types";

const STORE_PATH = "settings.json";
const ASSISTANTS_KEY = "assistants";
const MODEL_PROVIDERS_KEY = "modelProviders";

type SettingsSnapshot = {
  assistants: AssistantConfig[];
  modelProviders: ModelProviderConfig[];
};

let storePromise: Promise<Store> | null = null;

function getStore() {
  storePromise ??= load(STORE_PATH, { autoSave: 100, defaults: {} });
  return storePromise;
}

export async function loadSettings(fallback: SettingsSnapshot) {
  try {
    const store = await getStore();
    const storedAssistants =
      await store.get<unknown[]>(ASSISTANTS_KEY);
    const storedModelProviders =
      await store.get<unknown[]>(MODEL_PROVIDERS_KEY);

    const assistants = Array.isArray(storedAssistants)
      ? storedAssistants.filter(isAssistantConfig)
      : [];

    return {
      assistants: assistants.length > 0 ? assistants : fallback.assistants,
      modelProviders: Array.isArray(storedModelProviders)
        ? normalizeModelProviders(storedModelProviders, fallback.modelProviders)
        : fallback.modelProviders,
    };
  } catch {
    return fallback;
  }
}

export async function saveAssistants(assistants: AssistantConfig[]) {
  try {
    const store = await getStore();
    await store.set(ASSISTANTS_KEY, assistants);
    await store.save();
  } catch {
    // Store is unavailable in plain browser dev mode.
  }
}

export async function saveModelProviders(
  modelProviders: ModelProviderConfig[],
) {
  try {
    const store = await getStore();
    await store.set(MODEL_PROVIDERS_KEY, modelProviders);
    await store.save();
  } catch {
    // Store is unavailable in plain browser dev mode.
  }
}

function isAssistantConfig(value: unknown): value is AssistantConfig {
  if (!value || typeof value !== "object") return false;

  const assistant = value as Record<string, unknown>;
  return (
    typeof assistant.id === "string" &&
    typeof assistant.name === "string" &&
    typeof assistant.systemPrompt === "string" &&
    (assistant.emoji === undefined || typeof assistant.emoji === "string") &&
    (assistant.modelId === undefined || typeof assistant.modelId === "string")
  );
}

function normalizeModelProviders(
  value: unknown[],
  fallback: ModelProviderConfig[],
) {
  const providers = value.filter(isModelProviderConfig).map((provider) => ({
    ...provider,
    name: provider.name || provider.id,
    type: normalizeProviderType(provider.type, provider.id),
    builtin: isBuiltinProvider(provider.id),
    apiKey: provider.apiKey ?? "",
  }));
  if (providers.length === 0) return fallback;

  const merged = fallback.map((fallbackProvider) => {
    const storedProvider = providers.find(
      (provider) => provider.id === fallbackProvider.id,
    );

    return storedProvider
      ? {
          ...fallbackProvider,
          ...storedProvider,
          name: storedProvider.name || fallbackProvider.name,
          type: fallbackProvider.type,
          builtin: true,
        }
      : fallbackProvider;
  });

  return [
    ...merged,
    ...providers.filter(
      (provider) =>
        !fallback.some(
          (fallbackProvider) => fallbackProvider.id === provider.id,
        ),
    ),
  ];
}

function normalizeProviderType(type: unknown, providerId: string): ModelProviderType {
  if (isModelProviderType(type)) return type;
  if (isModelProviderType(providerId)) return providerId;
  return "openai-compatible";
}

function isModelProviderType(value: unknown): value is ModelProviderType {
  return (
    value === "deepseek" ||
    value === "openai" ||
    value === "google" ||
    value === "moonshotai" ||
    value === "alibaba" ||
    value === "anthropic" ||
    value === "openai-compatible"
  );
}

function isModelProviderConfig(value: unknown): value is ModelProviderConfig {
  if (!value || typeof value !== "object") return false;

  const provider = value as Record<string, unknown>;
  return (
    typeof provider.id === "string" &&
    (provider.name === undefined || typeof provider.name === "string") &&
    (provider.type === undefined || isModelProviderType(provider.type)) &&
    (provider.builtin === undefined || typeof provider.builtin === "boolean") &&
    (provider.apiKey === undefined || typeof provider.apiKey === "string") &&
    (provider.baseURL === undefined || typeof provider.baseURL === "string") &&
    Array.isArray(provider.models) &&
    provider.models.every(isModelConfig)
  );
}

function isModelConfig(value: unknown) {
  if (!value || typeof value !== "object") return false;

  const model = value as Record<string, unknown>;
  return typeof model.id === "string" && typeof model.name === "string";
}
