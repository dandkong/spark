import type { InferUITools, UIMessage } from "ai";

export type AppChatMessageMetadata = {
  generatedBy?: "primary" | "mention";
  sourceUserMessageId?: string;
  providerId?: string;
  modelId?: string;
};

export type AppChatMessage = UIMessage<
  AppChatMessageMetadata,
  never,
  InferUITools<{}>
>;

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

export type MCPTransportType = "http" | "sse";

export type MCPServerConfig = {
  id: string;
  name: string;
  enabled: boolean;
  transportType: MCPTransportType;
  url: string;
  headers: Record<string, string>;
};

export type ModelConfig = {
  id: string;
  name: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  modalities?: {
    input?: string[];
    output?: string[];
  };
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
