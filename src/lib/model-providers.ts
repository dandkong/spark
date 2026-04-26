import { createAlibaba } from "@ai-sdk/alibaba";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMoonshotAI } from "@ai-sdk/moonshotai";
import { createOpenAI } from "@ai-sdk/openai";
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
    id: "deepseek",
    name: "DeepSeek",
    logo: "deepseek",
  },
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
    id: "moonshotai",
    name: "Moonshot",
    logo: "moonshotai",
  },
  {
    id: "alibaba",
    name: "Qwen",
    logo: "alibaba",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    logo: "anthropic",
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
    "openai"
  );
}

export function createOpenAICompatibleProvider(): ModelProviderConfig {
  return {
    id: crypto.randomUUID(),
    name: "自定义供应商",
    type: "openai-compatible",
    builtin: false,
    apiKey: "",
    baseURL: "",
    models: [],
  };
}

export function createReasoningProviderOptions(
  provider: ModelProviderConfig,
  modelId: string,
  reasoningMode: ReasoningMode,
): ProviderOptions | undefined {
  if (reasoningMode === "auto") return undefined;

  const enabled = reasoningMode === "on";
  const providerType = provider.type ?? provider.id;

  switch (providerType) {
    case "openai":
    case "openai-compatible":
      return {
        openai: {
          reasoningEffort: enabled ? "medium" : "none",
        },
      };
    case "deepseek":
      return {
        deepseek: {
          thinking: {
            type: enabled ? "enabled" : "disabled",
          },
        },
      };
    case "moonshotai":
      return {
        moonshotai: {
          thinking: {
            type: enabled ? "enabled" : "disabled",
          },
        },
      };
    case "alibaba":
      return {
        alibaba: {
          enableThinking: enabled,
        },
      };
    case "google":
      return {
        google: {
          thinkingConfig: enabled
            ? createGoogleThinkingConfig(modelId)
            : { thinkingBudget: 0 },
        },
      };
    case "anthropic":
      return enabled
        ? {
            anthropic: {
              effort: "medium",
            },
          }
        : {
            anthropic: {
              thinking: { type: "disabled" },
            },
          };
    default:
      return undefined;
  }
}

function createGoogleThinkingConfig(modelId: string) {
  if (modelId.startsWith("gemini-3")) {
    return { thinkingLevel: "medium", includeThoughts: true };
  }

  return { thinkingBudget: 8192, includeThoughts: true };
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
      return createGoogleGenerativeAI({ apiKey, baseURL })(modelId);
    case "moonshotai":
      return createMoonshotAI({ apiKey, baseURL })(modelId);
    case "alibaba":
      return createAlibaba({ apiKey, baseURL })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey, baseURL })(modelId);
    case "openai-compatible":
      return createOpenAI({ apiKey, baseURL }).chat(modelId);
    default:
      return createOpenAI({ apiKey, baseURL }).chat(modelId);
  }
}
