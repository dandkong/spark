import type { ModelConfig } from "@/types";

const MODELS_DEV_API_URL = "https://models.dev/api.json";

type ModelsDevModel = {
  id?: unknown;
  name?: unknown;
};

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
    .map((model) => ({
      id: model.id as string,
      name: typeof model.name === "string" ? model.name : (model.id as string),
    }));
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
