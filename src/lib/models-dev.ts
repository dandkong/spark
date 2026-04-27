import type { ModelConfig } from "@/types";

const MODELS_DEV_API_URL = "https://models.dev/api.json";

type ModelsDevModel = {
  id?: unknown;
  name?: unknown;
  attachment?: unknown;
  reasoning?: unknown;
  tool_call?: unknown;
  modalities?: unknown;
};

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

type ModelsDevProvider = {
  models?: unknown;
};

type ModelsDevData = Record<string, ModelsDevProvider>;

let modelsDevCache: ModelsDevData | null = null;

export async function fetchProviderModels(providerId: string): Promise<ModelConfig[]> {
  const data = await getModelsDevData();
  const models = data[providerId]?.models;

  if (!models || typeof models !== "object") return [];

  return Object.values(models as Record<string, ModelsDevModel>)
    .filter((model) => typeof model.id === "string")
    .map((model) => {
      const modalities =
        model.modalities && typeof model.modalities === "object"
          ? (model.modalities as Record<string, unknown>)
          : {};

      return {
        id: model.id as string,
        name: typeof model.name === "string" ? model.name : (model.id as string),
        attachment: model.attachment === true,
        reasoning: model.reasoning === true,
        tool_call: model.tool_call === true,
        modalities: {
          input: toStringArray(modalities.input),
          output: toStringArray(modalities.output),
        },
      };
    });
}

async function getModelsDevData() {
  if (modelsDevCache) return modelsDevCache;

  const response = await fetch(MODELS_DEV_API_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`models.dev 请求失败：${response.status}`);
  }

  const data = await response.json();
  if (!data || typeof data !== "object") {
    throw new Error("models.dev 返回了无效数据");
  }

  modelsDevCache = data as ModelsDevData;
  return modelsDevCache;
}
