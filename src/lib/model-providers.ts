import { createAlibaba } from "@ai-sdk/alibaba";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createMoonshotAI } from "@ai-sdk/moonshotai";
import { createOpenAI } from "@ai-sdk/openai";
import { createVercel } from "@ai-sdk/vercel";
import { createXai } from "@ai-sdk/xai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOllama } from "ollama-ai-provider-v2";
import { createZhipu } from "zhipu-ai-provider";
import { createMinimax } from "vercel-minimax-ai-provider";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { ModelSelectorLogoProps } from "@/components/ai-elements/model-selector";
import type {
  ModelProviderConfig,
  ModelProviderType,
  ReasoningMode,
} from "@/types";

type ProviderLogo = ModelSelectorLogoProps["provider"];

type ProviderDefinition = {
  id: ModelProviderType;
  name: string;
  logo: ProviderLogo;
};

export const BUILTIN_PROVIDER_DEFINITIONS = [
  {
    id: "openai",
    name: "OpenAI",
    logo: "openai",
  },
  {
    id: "google",
    name: "Gemini",
    logo: "google",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    logo: "anthropic",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    logo: "deepseek",
  },
  {
    id: "alibaba",
    name: "Qwen",
    logo: "alibaba",
  },
  {
    id: "moonshotai",
    name: "Moonshot",
    logo: "moonshotai",
  },
  {
    id: "zhipuai",
    name: "Z.AI",
    logo: "zhipuai",
  },
  {
    id: "minimax",
    name: "MiniMax",
    logo: "minimax",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    logo: "openrouter",
  },
  {
    id: "xai",
    name: "xAI",
    logo: "xai",
  },
  {
    id: "mistral",
    name: "Mistral",
    logo: "mistral",
  },
  {
    id: "groq",
    name: "Groq",
    logo: "groq",
  },
  {
    id: "ollama",
    name: "Ollama",
    logo: "ollama",
  },
  {
    id: "vercel",
    name: "Vercel",
    logo: "vercel",
  },
] as const satisfies readonly ProviderDefinition[];

export type BuiltinProviderId = (typeof BUILTIN_PROVIDER_DEFINITIONS)[number]["id"];

export const BUILTIN_MODEL_PROVIDERS: ModelProviderConfig[] =
  BUILTIN_PROVIDER_DEFINITIONS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    type: provider.id,
    builtin: true,
    apiKey: "",
    baseURL: "",
    models: [],
  }));

export const providerNames: Record<string, string> = Object.fromEntries(
  BUILTIN_PROVIDER_DEFINITIONS.map((provider) => [provider.id, provider.name]),
);

export function isBuiltinProvider(providerId: string) {
  return BUILTIN_PROVIDER_DEFINITIONS.some((provider) => provider.id === providerId);
}

export function isApiKeyOptionalProvider(provider: Pick<ModelProviderConfig, "type">) {
  return provider.type === "ollama";
}

export function getProviderNavName(provider: Pick<ModelProviderConfig, "id" | "name">) {
  return providerNames[provider.id] ?? provider.name ?? provider.id;
}

export function getProviderDisplayName(provider: Pick<ModelProviderConfig, "id" | "name">) {
  return provider.name || providerNames[provider.id] || provider.id;
}

export function getProviderLogo(provider: Pick<ModelProviderConfig, "id" | "type"> | string): ProviderLogo {
  const providerId = typeof provider === "string" ? provider : provider.id;
  const providerType = typeof provider === "string" ? provider : provider.type;

  return (
    BUILTIN_PROVIDER_DEFINITIONS.find((provider) => provider.id === providerId)
      ?.logo ??
    BUILTIN_PROVIDER_DEFINITIONS.find((provider) => provider.id === providerType)
      ?.logo ??
    CUSTOM_PROVIDER_LOGOS[providerType as CustomProviderType] ??
    "openai"
  );
}

/** 自定义供应商可选类型：新增类型只需在这里加一项。 */
export const CUSTOM_PROVIDER_TYPES = [
  "openai-compatible",
  "openai-responses",
  "anthropic",
  "gemini",
] as const;

export type CustomProviderType = (typeof CUSTOM_PROVIDER_TYPES)[number];

const CUSTOM_PROVIDER_LOGOS: Record<CustomProviderType, ProviderLogo> = {
  "openai-compatible": "openai",
  "openai-responses": "openai",
  anthropic: "anthropic",
  gemini: "google",
};

export function createCustomProvider(
  name = "Custom Provider",
  type: CustomProviderType = "openai-compatible",
): ModelProviderConfig {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    builtin: false,
    apiKey: "",
    baseURL: "",
    models: [],
  };
}

/** 思考档位（通用意图层，按强度升序）。 */
export type EffortLevel = "low" | "medium" | "high" | "xhigh";

const EFFORT_ORDER: EffortLevel[] = ["low", "medium", "high", "xhigh"];

/** 各 provider 真实支持的思考档位（不含塌缩档），不注册 = 无思考能力。 */
const REASONING_LEVELS: Partial<Record<string, readonly EffortLevel[]>> = {
  openai: ["low", "medium", "high", "xhigh"],
  "openai-compatible": ["low", "medium", "high", "xhigh"],
  "openai-responses": ["low", "medium", "high", "xhigh"],
  deepseek: ["low", "medium", "high", "xhigh"],
  anthropic: ["low", "medium", "high", "xhigh"],
  xai: ["low", "medium", "high"],
  groq: ["low", "medium", "high"],
  google: ["low", "medium", "high"],
  gemini: ["low", "medium", "high"],
  mistral: ["high"],
  moonshotai: ["low", "medium", "high", "xhigh"],
  alibaba: ["low", "medium", "high", "xhigh"],
  zhipuai: ["medium"], // 开关型：SDK 只有 enabled/disabled，注册单档代表“开启”
  ollama: ["medium"], // 开关型：think: boolean（仅思考类模型如 deepseek-r1/qwen3 生效）
  openrouter: ["low", "medium", "high", "xhigh"], // reasoning.effort 支持 xhigh
};

/** 各 provider 关闭思考的表达（off 不走档位塌缩）。 */
const REASONING_OFF_MAPS: Partial<Record<string, ProviderOptions>> = {
  openai: { openai: { reasoningEffort: "none" } },
  "openai-compatible": { openai: { reasoningEffort: "none" } },
  "openai-responses": { openai: { reasoningEffort: "none" } },
  deepseek: { deepseek: { thinking: { type: "disabled" } } },
  moonshotai: { moonshotai: { thinking: { type: "disabled" } } },
  alibaba: { alibaba: { enableThinking: false } },
  google: { google: { thinkingConfig: { thinkingBudget: 0 } } },
  gemini: { google: { thinkingConfig: { thinkingBudget: 0 } } },
  anthropic: { anthropic: { thinking: { type: "disabled" } } },
  xai: { xai: { reasoningEffort: "none" } },
  mistral: { mistral: { reasoningEffort: "none" } },
  groq: { groq: { reasoningEffort: "none" } },
  zhipuai: { zhipuai: { thinking: { type: "disabled" } } },
  ollama: { ollama: { think: false } },
  openrouter: { openrouter: { reasoning: { effort: "none" } } },
};

/**
 * 思考档位 → 供应商参数。只写真实支持的档位（塌缩后一定命中）；
 * 值为函数的形式用于需要按 modelId 分支的 provider（如 google）。
 */
type EffortOptions = ProviderOptions | ((modelId: string) => ProviderOptions);

const REASONING_EFFORT_MAPS: Partial<
  Record<string, Partial<Record<EffortLevel, EffortOptions>>>
> = {
  openai: {
    low: { openai: { reasoningEffort: "low" } },
    medium: { openai: { reasoningEffort: "medium" } },
    high: { openai: { reasoningEffort: "high" } },
    xhigh: { openai: { reasoningEffort: "xhigh" } },
  },
  "openai-compatible": {
    low: { openai: { reasoningEffort: "low" } },
    medium: { openai: { reasoningEffort: "medium" } },
    high: { openai: { reasoningEffort: "high" } },
    xhigh: { openai: { reasoningEffort: "xhigh" } },
  },
  "openai-responses": {
    low: { openai: { reasoningEffort: "low" } },
    medium: { openai: { reasoningEffort: "medium" } },
    high: { openai: { reasoningEffort: "high" } },
    xhigh: { openai: { reasoningEffort: "xhigh" } },
  },
  deepseek: {
    low: { deepseek: { reasoningEffort: "low" } },
    medium: { deepseek: { reasoningEffort: "medium" } },
    high: { deepseek: { reasoningEffort: "high" } },
    xhigh: { deepseek: { reasoningEffort: "xhigh" } },
  },
  anthropic: {
    low: { anthropic: { effort: "low" } },
    medium: { anthropic: { effort: "medium" } },
    high: { anthropic: { effort: "high" } },
    xhigh: { anthropic: { effort: "xhigh" } },
  },
  xai: {
    low: { xai: { reasoningEffort: "low" } },
    medium: { xai: { reasoningEffort: "medium" } },
    high: { xai: { reasoningEffort: "high" } },
  },
  groq: {
    low: { groq: { reasoningEffort: "low" } },
    medium: { groq: { reasoningEffort: "medium" } },
    high: { groq: { reasoningEffort: "high" } },
  },
  mistral: {
    high: { mistral: { reasoningEffort: "high" } },
  },
  zhipuai: {
    medium: { zhipuai: { thinking: { type: "enabled" } } },
  },
  ollama: {
    medium: { ollama: { think: true } },
  },
  openrouter: {
    low: { openrouter: { reasoning: { effort: "low" } } },
    medium: { openrouter: { reasoning: { effort: "medium" } } },
    high: { openrouter: { reasoning: { effort: "high" } } },
    xhigh: { openrouter: { reasoning: { effort: "xhigh" } } },
  },
  moonshotai: {
    low: { moonshotai: { thinking: { type: "enabled", budgetTokens: 4096 } } },
    medium: { moonshotai: { thinking: { type: "enabled", budgetTokens: 8192 } } },
    high: { moonshotai: { thinking: { type: "enabled", budgetTokens: 16384 } } },
    xhigh: { moonshotai: { thinking: { type: "enabled", budgetTokens: 32768 } } },
  },
  alibaba: {
    low: { alibaba: { enableThinking: true, thinkingBudget: 4096 } },
    medium: { alibaba: { enableThinking: true, thinkingBudget: 8192 } },
    high: { alibaba: { enableThinking: true, thinkingBudget: 16384 } },
    xhigh: { alibaba: { enableThinking: true, thinkingBudget: 32768 } },
  },
  google: {
    low: (modelId) => ({
      google: { thinkingConfig: createGoogleThinkingConfig(modelId, "low") },
    }),
    medium: (modelId) => ({
      google: { thinkingConfig: createGoogleThinkingConfig(modelId, "medium") },
    }),
    high: (modelId) => ({
      google: { thinkingConfig: createGoogleThinkingConfig(modelId, "high") },
    }),
  },
  gemini: {
    low: (modelId) => ({
      google: { thinkingConfig: createGoogleThinkingConfig(modelId, "low") },
    }),
    medium: (modelId) => ({
      google: { thinkingConfig: createGoogleThinkingConfig(modelId, "medium") },
    }),
    high: (modelId) => ({
      google: { thinkingConfig: createGoogleThinkingConfig(modelId, "high") },
    }),
  },
};

/**
 * 塌缩：目标档不在供应商支持档里时，取「不低于目标档」的最近档
 * （向上取整，宁多勿少）；目标高于所有档时取最高档。
 */
function collapseLevel(
  target: EffortLevel,
  supported: readonly EffortLevel[],
): EffortLevel {
  const index = EFFORT_ORDER.indexOf(target);
  const higher = supported.find(
    (level) => EFFORT_ORDER.indexOf(level) >= index,
  );
  return higher ?? supported[supported.length - 1];
}

export function createReasoningProviderOptions(
  provider: ModelProviderConfig,
  modelId: string,
  reasoningMode: ReasoningMode,
): ProviderOptions | undefined {
  if (reasoningMode === "auto") return undefined;

  const providerType = provider.type ?? provider.id;

  if (reasoningMode === "off") return REASONING_OFF_MAPS[providerType];

  const levels = REASONING_LEVELS[providerType];
  if (!levels?.length) return undefined;

  const level = collapseLevel(reasoningMode, levels);
  const entry = REASONING_EFFORT_MAPS[providerType]?.[level];
  if (!entry) return undefined;

  return typeof entry === "function" ? entry(modelId) : entry;
}

/** 当前 provider 支持的思考模式（含 auto/off），UI 据此渲染档位菜单。 */
export function getSupportedReasoningModes(
  provider: Pick<ModelProviderConfig, "id" | "type">,
): ReasoningMode[] {
  const providerType = provider.type ?? provider.id;
  const levels = REASONING_LEVELS[providerType];
  // 无思考能力：不显示“关闭”（关闭也传不了参数，避免假选项）
  if (!levels?.length) return ["auto"];
  return ["auto", "off", ...levels];
}

function createGoogleThinkingConfig(modelId: string, level: EffortLevel) {
  if (modelId.startsWith("gemini-3")) {
    return { thinkingLevel: level, includeThoughts: true };
  }

  const budgets: Record<EffortLevel, number> = {
    low: 4096,
    medium: 8192,
    high: 16384,
    xhigh: 32768,
  };
  return { thinkingBudget: budgets[level], includeThoughts: true };
}

export function createProviderLanguageModel(
  provider: ModelProviderConfig,
  modelId: string,
) {
  const apiKey = provider.apiKey;
  const baseURL = provider.baseURL?.trim() || undefined;
  const providerType = provider.type ?? provider.id;

  switch (providerType) {
    case "deepseek":
      return createDeepSeek({ apiKey, baseURL })(modelId);
    case "openai":
      return createOpenAI({ apiKey, baseURL })(modelId);
    case "google":
    case "gemini":
      return createGoogleGenerativeAI({ apiKey, baseURL })(modelId);
    case "moonshotai":
      return createMoonshotAI({ apiKey, baseURL })(modelId);
    case "alibaba":
      return createAlibaba({ apiKey, baseURL })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey, baseURL })(modelId);
    case "xai":
      return createXai({ apiKey, baseURL })(modelId);
    case "mistral":
      return createMistral({ apiKey, baseURL })(modelId);
    case "groq":
      return createGroq({ apiKey, baseURL })(modelId);
    case "vercel":
      return createVercel({ apiKey, baseURL })(modelId);
    case "openrouter":
      return createOpenRouter({ apiKey, baseURL }).chat(modelId);
    case "ollama":
      return createOllama({ baseURL })(modelId);
    case "zhipuai":
      return createZhipu({ apiKey, baseURL })(modelId);
    case "minimax":
      return createMinimax({ apiKey, baseURL })(modelId);
    case "openai-compatible":
      return createOpenAI({ apiKey, baseURL }).chat(modelId);
    case "openai-responses":
      return createOpenAI({ apiKey, baseURL }).responses(modelId);
    default:
      return createOpenAI({ apiKey, baseURL }).chat(modelId);
  }
}
