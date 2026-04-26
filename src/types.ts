import type { InferUITools, UIMessage } from "ai";

export type AppChatMessage = UIMessage<unknown, never, InferUITools<{}>>;

export type ReasoningMode = "auto" | "off" | "on";

export type UserPreferences = {
  activeAssistantId: string;
  chatMessageFontSize: number;
  reasoningMode: ReasoningMode;
};

export type AssistantConfig = {
  id: string;
  name: string;
  systemPrompt: string;
  emoji?: string;
  providerId?: string;
  modelId?: string;
};

export type ModelConfig = {
  id: string;
  name: string;
};

export type ModelProviderType =
  | "deepseek"
  | "openai"
  | "google"
  | "moonshotai"
  | "alibaba"
  | "anthropic"
  | "openai-compatible";

export type ModelProviderConfig = {
  id: string;
  name: string;
  type: ModelProviderType;
  builtin?: boolean;
  apiKey: string;
  baseURL?: string;
  models: ModelConfig[];
};
