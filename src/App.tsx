import Chat from "./components/Chat";
import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster, toast } from "sonner";
import AssistantSidebar from "@/components/AssistantSidebar";
import AssistantEditorDialog from "./components/AssistantEditorDialog";
import ModelEditorDialog from "./components/ModelEditorDialog";
import SettingsLayout from "./components/settings/SettingsLayout";
import GeneralSettings from "./components/settings/GeneralSettings";
import AssistantSettings from "./components/settings/AssistantSettings";
import ProviderSettings from "./components/settings/ProviderSettings";
import MCPSettings from "./components/settings/MCPSettings";
import AboutSettings from "./components/settings/AboutSettings";
import HeaderControls from "@/components/HeaderControls";
import {
  loadSettings,
  saveAssistants,
  saveMCPServers,
  saveModelProviders,
} from "@/lib/settings-storage";
import {
  loadPreferences,
  savePreferences,
} from "@/lib/preferences-storage";
import type { UserPreferences } from "@/lib/preferences-storage";
import {
  BUILTIN_MODEL_PROVIDERS,
  createCustomProvider,
  getEffectiveReasoningMode,
  isBuiltinProvider,
  type CustomProviderType,
} from "@/lib/model-providers";
import { fetchProviderModels } from "@/lib/models-dev";
import { getMCPStatus, initMCP, onMCPStatusChange, type MCPServerStatus } from "@/lib/mcp";
import type {
  AppChatMessage,
  AssistantConfig,
  MCPServerConfig,
  ModelConfig,
  ModelProviderConfig,
  ReasoningMode,
} from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, useLocation, useNavigate, useParams, Navigate } from "react-router-dom";
import { I18nProvider, resolveLocale, translateForLocale } from "@/i18n";
import { restoreWindowState } from "@/lib/window-state";

const initialModelProviders: ModelProviderConfig[] = BUILTIN_MODEL_PROVIDERS;

const defaultProvider = initialModelProviders[0];

const initialAssistants: AssistantConfig[] = [
  {
    id: "spark",
    name: "Spark",
    emoji: "⚡",
    providerId: defaultProvider.id,
    modelId: "",
    reasoningMode: "auto",
    systemPrompt: translateForLocale(
      resolveLocale("system"),
      "assistant.defaultSystemPrompt",
    ),
  },
];

const defaultPreferences: UserPreferences = {
  activeAssistantId: initialAssistants[0].id,
  chatMessageFontSize: 14,
  sidebarCollapsed: false,
  sidebarWidth: 256,
  language: "system",
};

const defaultSettings = {
  assistants: initialAssistants,
  modelProviders: initialModelProviders,
  mcpServers: [] as MCPServerConfig[],
};

/** 共享的空消息数组：避免 `?? []` 每次渲染新建引用破坏 Chat 的 React.memo */
const EMPTY_MESSAGES: AppChatMessage[] = [];

type AssistantDialogState =
  | { open: false; mode: "create"; assistant: null }
  | { open: true; mode: "create"; assistant: null }
  | { open: true; mode: "edit"; assistant: AssistantConfig };

type ModelDialogState =
  | { open: false; providerId: null; model: null }
  | { open: true; providerId: string; model: ModelConfig | null };

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [assistants, setAssistants] =
    useState<AssistantConfig[]>(initialAssistants);
  const [modelProviders, setModelProviders] =
    useState<ModelProviderConfig[]>(initialModelProviders);
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences);
  const [assistantMessages, setAssistantMessages] = useState<
    Record<string, AppChatMessage[]>
  >({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const windowShownRef = useRef(false);
  const [assistantDialog, setAssistantDialog] =
    useState<AssistantDialogState>({
      open: false,
      mode: "create",
      assistant: null,
    });
  const [modelDialog, setModelDialog] = useState<ModelDialogState>({
    open: false,
    providerId: null,
    model: null,
  });

  const activeAssistant = useMemo(
    () =>
      assistants.find(
        (assistant) => assistant.id === preferences.activeAssistantId,
      ) ?? assistants[0],
    [preferences.activeAssistantId, assistants],
  );
  const configuredProviders = useMemo(
    () =>
      modelProviders.filter(
        (provider) =>
          provider.apiKey.trim() && provider.models.length > 0,
      ),
    [modelProviders],
  );
  const getAssistantChatConfig = useCallback(
    (assistant: AssistantConfig) => {
      const storedProvider = configuredProviders.find(
        (provider) => provider.id === assistant.providerId,
      );
      const provider = storedProvider ?? configuredProviders[0];
      const models = provider?.models ?? [];
      const model =
        models.find((model) => model.id === assistant.modelId)?.id ??
        models[0]?.id ??
        "";

      return { provider, models, model };
    },
    [configuredProviders],
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      loadSettings(defaultSettings),
      loadPreferences(defaultPreferences),
    ]).then(([settings, prefs]) => {
      if (cancelled) return;
      setModelProviders(settings.modelProviders);
      setMcpServers(settings.mcpServers);
      setAssistants(
        ensureAssistantModels(settings.assistants, settings.modelProviders),
      );
      setPreferences(prefs);
      setSettingsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    saveAssistants(assistants);
  }, [assistants, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    saveModelProviders(modelProviders);
  }, [modelProviders, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    saveMCPServers(mcpServers);
  }, [mcpServers, settingsLoaded]);

  // MCP 预热：应用启动/配置变化时后台建立连接（发消息不再触发连接）
  useEffect(() => {
    if (!settingsLoaded) return;
    void initMCP(mcpServers);
  }, [mcpServers, settingsLoaded]);

  // MCP 连接状态全局提示：失败每次都弹（每次连接尝试都值得被看见），恢复时提示一次
  useEffect(() => {
    const prevFailedIds = new Set<string>();
    const locale = resolveLocale("system");
    const failedMessage = translateForLocale(locale, "chat.mcp.connectFailed");
    const reconnectedMessage = translateForLocale(
      locale,
      "chat.mcp.reconnected",
    );

    const applyStatus = (status: MCPServerStatus[]) => {
      for (const server of status) {
        if (server.status === "failed") {
          prevFailedIds.add(server.id);
          toast.error(failedMessage, { description: server.name });
        } else if (
          server.status === "connected" &&
          prevFailedIds.has(server.id)
        ) {
          prevFailedIds.delete(server.id);
          toast.success(reconnectedMessage, { description: server.name });
        }
      }
    };

    applyStatus(getMCPStatus());
    return onMCPStatusChange(applyStatus);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    savePreferences(preferences);
  }, [preferences, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded || windowShownRef.current) return;
    windowShownRef.current = true;

    const frame = requestAnimationFrame(() => {
      void restoreWindowState();
    });

    return () => cancelAnimationFrame(frame);
  }, [settingsLoaded]);

  useEffect(() => {
    if (
      !assistants.some(
        (assistant) => assistant.id === preferences.activeAssistantId,
      )
    ) {
      setPreferences((current) => ({
        ...current,
        activeAssistantId: assistants[0]?.id ?? initialAssistants[0].id,
      }));
    }
  }, [assistants, preferences.activeAssistantId]);

  const handleSelectAssistant = useCallback(
    (assistantId: string) => {
      setPreferences((current) => ({
        ...current,
        activeAssistantId: assistantId,
      }));
      navigate("/");
    },
    [navigate],
  );

  // Ctrl/Cmd+1~9 快捷切换对应顺序的助手
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) return;
      if (assistantDialog.open || modelDialog.open) return;

      const hasPrimaryModifier = event.ctrlKey || event.metaKey;
      if (!hasPrimaryModifier || event.altKey || event.shiftKey) return;

      const match = /^Digit([1-9])$/.exec(event.code);
      if (!match) return;

      const assistant = assistants[Number(match[1]) - 1];
      if (!assistant) return;

      event.preventDefault();
      handleSelectAssistant(assistant.id);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [assistants, assistantDialog.open, modelDialog.open, handleSelectAssistant]);

  const handleAssistantMessagesChange = useCallback(
    (assistantId: string, messages: AppChatMessage[]) => {
      setAssistantMessages((current) => {
        if (current[assistantId] === messages) return current;
        return { ...current, [assistantId]: messages };
      });
    },
    [],
  );

  const handleReasoningModeChange = useCallback(
    (assistantId: string, reasoningMode: ReasoningMode) => {
      setAssistants((current) =>
        current.map((assistant) =>
          assistant.id === assistantId
            ? { ...assistant, reasoningMode }
            : assistant,
        ),
      );
    },
    [],
  );

  const handleModelChange = useCallback(
    (assistantId: string, providerId: string, modelId: string) => {
      setAssistants((current) =>
        current.map((item) => {
          if (item.id !== assistantId) return item;

          // 切换模型/供应商时，把思考档位塌缩到新 provider 的合法档并固化：
          // UI 显示与发送参数保持同一值，不再有隐式映射。
          const provider = modelProviders.find(
            (p) => p.id === providerId,
          );
          const reasoningMode = item.reasoningMode ?? "auto";
          const effective = provider
            ? getEffectiveReasoningMode(provider, reasoningMode)
            : reasoningMode;

          return {
            ...item,
            providerId,
            modelId,
            reasoningMode: effective,
          };
        }),
      );
    },
    [modelProviders],
  );

  const openCreateAssistant = () => {
    setAssistantDialog({ open: true, mode: "create", assistant: null });
  };

  const openEditAssistant = (assistant: AssistantConfig) => {
    setAssistantDialog({ open: true, mode: "edit", assistant });
  };

  const handleSaveAssistant = (assistant: AssistantConfig) => {
    const assistantWithModel = {
      ...assistant,
      providerId: assistant.providerId ?? defaultProvider.id,
      modelId: assistant.modelId ?? "",
    };

    if (assistantDialog.mode === "create") {
      setAssistants((current) => [...current, assistantWithModel]);
      setPreferences((current) => ({
        ...current,
        activeAssistantId: assistantWithModel.id,
      }));
      setPreferences((current) => ({ ...current, sidebarCollapsed: false }));
      return;
    }

    setAssistants((current) =>
      current.map((item) =>
        item.id === assistantWithModel.id ? assistantWithModel : item,
      ),
    );
  };

  const handleDeleteAssistant = (assistantId: string) => {
    if (assistants.length <= 1) return;

    const nextAssistants = assistants.filter(
      (assistant) => assistant.id !== assistantId,
    );

    setAssistants(nextAssistants);
    setAssistantMessages((current) => {
      const { [assistantId]: _removed, ...rest } = current;
      return rest;
    });

    if (assistantId === preferences.activeAssistantId) {
      setPreferences((current) => ({
        ...current,
        activeAssistantId: nextAssistants[0]?.id ?? "",
      }));
    }
  };

  const handleReorderAssistant = (nextAssistants: AssistantConfig[]) => {
    setAssistants(nextAssistants);
  };

  const handleSaveModel = (model: ModelConfig, previousModelId?: string) => {
    if (!modelDialog.providerId) return;
    const providerId = modelDialog.providerId;

    setModelProviders((current) =>
      current.map((provider) => {
        if (provider.id !== providerId) return provider;

        const targetId = previousModelId ?? model.id;
        const exists = provider.models.some((item) => item.id === targetId);
        return {
          ...provider,
          models: exists
            ? provider.models.map((item) =>
                item.id === targetId ? model : item,
              )
            : [...provider.models, model],
        };
      }),
    );

    if (previousModelId && previousModelId !== model.id) {
      setAssistants((current) =>
        current.map((assistant) =>
          assistant.providerId === providerId &&
          assistant.modelId === previousModelId
            ? { ...assistant, modelId: model.id }
            : assistant,
        ),
      );
    }
  };

  const handleDeleteModel = (providerId: string, modelId: string) => {
    const provider = modelProviders.find((item) => item.id === providerId);
    if (!provider) return;

    const nextModels = provider.models.filter((model) => model.id !== modelId);
    const fallbackModelId = nextModels[0]?.id ?? "";

    setModelProviders((current) =>
      current.map((provider) =>
        provider.id === providerId
          ? {
              ...provider,
              models: provider.models.filter((model) => model.id !== modelId),
            }
          : provider,
      ),
    );

    setAssistants((current) =>
      current.map((assistant) =>
        assistant.providerId === providerId && assistant.modelId === modelId
          ? { ...assistant, modelId: fallbackModelId }
          : assistant,
      ),
    );
  };

  const handleCreateProvider = (name: string, type: CustomProviderType = "openai-compatible") => {
    const provider = createCustomProvider(name, type);
    setModelProviders((current) => [...current, provider]);
    return provider.id;
  };

  const handleDeleteProvider = (providerId: string) => {
    const provider = modelProviders.find((item) => item.id === providerId);
    if (!provider || provider.builtin) return;

    const nextProviders = modelProviders.filter(
      (item) => item.id !== providerId,
    );
    const fallbackProvider = nextProviders[0];
    const fallbackModelId = fallbackProvider?.models[0]?.id ?? "";

    setModelProviders(nextProviders);
    setAssistants((current) =>
      current.map((assistant) =>
        assistant.providerId === providerId
          ? {
              ...assistant,
              providerId: fallbackProvider?.id ?? defaultProvider.id,
              modelId: fallbackModelId,
            }
          : assistant,
      ),
    );
  };

  const handleUpdateProvider = (
    providerId: string,
    patch: Partial<
      Pick<ModelProviderConfig, "name" | "apiKey" | "baseURL" | "type">
    >,
  ) => {
    setModelProviders((current) =>
      current.map((provider) =>
        provider.id === providerId ? { ...provider, ...patch } : provider,
      ),
    );
  };

  const handleAddModel = useCallback((providerId: string, model: ModelConfig) => {
    setModelProviders((current) =>
      current.map((provider) => {
        if (provider.id !== providerId) return provider;
        if (provider.models.some((item) => item.id === model.id)) return provider;
        return { ...provider, models: [...provider.models, model] };
      }),
    );
  }, []);

  const handleFetchModels = async (providerId: string) => {
    if (!isBuiltinProvider(providerId)) return [];
    return fetchProviderModels(providerId);
  };

  if (!settingsLoaded) return null;

  const isSettingsRoute = location.pathname.startsWith("/settings");

  return (
    <I18nProvider languagePreference={preferences.language}>
    <TooltipProvider>
      <div className="flex h-full">
        <AssistantSidebar
            assistants={assistants}
            activeAssistantId={preferences.activeAssistantId}
            collapsed={preferences.sidebarCollapsed}
            width={preferences.sidebarWidth}
            onWidthChange={(sidebarWidth) =>
              setPreferences((current) => ({ ...current, sidebarWidth }))
            }
            onToggleCollapsed={() =>
              setPreferences((current) => ({
                ...current,
                sidebarCollapsed: !current.sidebarCollapsed,
              }))
            }
            onCreateAssistant={openCreateAssistant}
            onSelectAssistant={handleSelectAssistant}
          />
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-12 shrink-0 items-center justify-end pr-1" data-tauri-drag-region>
              <HeaderControls />
            </div>
            <PromptInputProvider>
              <div className={isSettingsRoute ? "hidden" : "contents"}>
                {assistants.map((assistant) => {
                  const { provider, models, model } =
                    getAssistantChatConfig(assistant);
                  const isActive = assistant.id === activeAssistant.id;

                  return (
                    <div
                      key={assistant.id}
                      className={isActive ? "contents" : "hidden"}
                    >
                      <Chat
                        assistant={assistant}
                        providers={configuredProviders}
                        provider={provider}
                        models={models}
                        model={model}
                        messages={assistantMessages[assistant.id] ?? EMPTY_MESSAGES}
                        messageFontSize={preferences.chatMessageFontSize}
                        reasoningMode={assistant.reasoningMode ?? "auto"}
                        mcpServers={mcpServers}
                        isActive={isActive && !isSettingsRoute}
                        showInput={isActive && !isSettingsRoute}
                        onReasoningModeChange={handleReasoningModeChange}
                        onMessagesChange={handleAssistantMessagesChange}
                        onModelChange={handleModelChange}
                      />
                    </div>
                  );
                })}
              </div>
            </PromptInputProvider>
            <Routes>
              <Route path="/settings" element={
                <SettingsLayout
                  modelProviders={modelProviders}
                  onCreateProvider={handleCreateProvider}
                />
              }>
                <Route index element={<Navigate to="assistants" replace />} />
                <Route path="general" element={
                  <GeneralSettings
                    settings={preferences}
                    onChange={setPreferences}
                  />
                } />
                <Route path="assistants" element={
                  <AssistantSettings
                    assistants={assistants}
                    onCreate={openCreateAssistant}
                    onEdit={openEditAssistant}
                    onDelete={handleDeleteAssistant}
                    onReorder={handleReorderAssistant}
                  />
                } />
                <Route path="mcp" element={
                  <MCPSettings
                    servers={mcpServers}
                    onChange={setMcpServers}
                  />
                } />
                <Route path="about" element={<AboutSettings />} />
                <Route path=":providerId" element={
                  <ProviderRoute
                    modelProviders={modelProviders}
                    onCreateModel={(providerId) =>
                      setModelDialog({ open: true, providerId, model: null })
                    }
                    onAddModel={handleAddModel}
                    onEditModel={(providerId, model) =>
                      setModelDialog({ open: true, providerId, model })
                    }
                    onDeleteModel={handleDeleteModel}
                    onDeleteProvider={(providerId) => {
                      handleDeleteProvider(providerId);
                      navigate("/settings/assistants");
                    }}
                    onUpdateProvider={handleUpdateProvider}
                    onFetchModels={handleFetchModels}
                  />
                } />
              </Route>
              <Route path="*" element={null} />
            </Routes>
          </main>
      </div>
      <AssistantEditorDialog
        assistant={assistantDialog.assistant}
        open={assistantDialog.open}
        onOpenChange={(open) =>
          setAssistantDialog((current) =>
            open ? current : { open: false, mode: "create", assistant: null },
          )
        }
        onSave={handleSaveAssistant}
      />
      <ModelEditorDialog
        model={modelDialog.model}
        open={modelDialog.open}
        onOpenChange={(open) =>
          setModelDialog((current) =>
            open ? current : { open: false, providerId: null, model: null },
          )
        }
        onSave={handleSaveModel}
      />
      <Toaster position="top-center" />
    </TooltipProvider>
    </I18nProvider>
  );
}

function ProviderRoute({
  modelProviders,
  onCreateModel,
  onAddModel,
  onEditModel,
  onDeleteModel,
  onDeleteProvider,
  onUpdateProvider,
  onFetchModels,
}: {
  modelProviders: ModelProviderConfig[];
  onCreateModel: (providerId: string) => void;
  onAddModel: (providerId: string, model: ModelConfig) => void;
  onEditModel: (providerId: string, model: ModelConfig) => void;
  onDeleteModel: (providerId: string, modelId: string) => void;
  onDeleteProvider: (providerId: string) => void;
  onUpdateProvider: (
    providerId: string,
    patch: Partial<
      Pick<ModelProviderConfig, "name" | "apiKey" | "baseURL" | "type">
    >,
  ) => void;
  onFetchModels: (providerId: string) => Promise<ModelConfig[]>;
}) {
  const { providerId } = useParams<{ providerId: string }>();
  const provider = modelProviders.find((p) => p.id === providerId);

  if (!provider) return <Navigate to="/settings/assistants" replace />;

  return (
    <ProviderSettings
      provider={provider}
      onUpdateProvider={(patch) => onUpdateProvider(provider.id, patch)}
      onCreate={() => onCreateModel(provider.id)}
      onAdd={(model) => onAddModel(provider.id, model)}
      onEdit={(model) => onEditModel(provider.id, model)}
      onDelete={(modelId) => onDeleteModel(provider.id, modelId)}
      onFetchModels={() => onFetchModels(provider.id)}
      onDeleteProvider={() => onDeleteProvider(provider.id)}
    />
  );
}

function ensureAssistantModels(
  assistants: AssistantConfig[],
  modelProviders: ModelProviderConfig[],
) {
  const fallbackProviderId = modelProviders[0]?.id ?? defaultProvider.id;

  return assistants.map((assistant) => ({
    ...assistant,
    providerId: assistant.providerId ?? fallbackProviderId,
    modelId: assistant.modelId ?? "",
  }));
}

export default App;
