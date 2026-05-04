import Chat from "./components/Chat";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
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
  createOpenAICompatibleProvider,
  isBuiltinProvider,
} from "@/lib/model-providers";
import { fetchProviderModels } from "@/lib/models-dev";
import type {
  AppChatMessage,
  AssistantConfig,
  MCPServerConfig,
  ModelConfig,
  ModelProviderConfig,
} from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Routes, Route, useNavigate, useParams, Navigate } from "react-router-dom";

const initialModelProviders: ModelProviderConfig[] = BUILTIN_MODEL_PROVIDERS;

const defaultProvider = initialModelProviders[0];

const initialAssistants: AssistantConfig[] = [
  {
    id: "spark",
    name: "Spark",
    emoji: "⚡",
    providerId: defaultProvider.id,
    modelId: "",
    systemPrompt: "你是Spark，一个有用的个人助手。",
  },
];

const defaultPreferences: UserPreferences = {
  activeAssistantId: initialAssistants[0].id,
  chatMessageFontSize: 14,
  reasoningMode: "auto",
  sidebarCollapsed: false,
  sidebarWidth: 256,
  contextMessageLimit: null,
};

const defaultSettings = {
  assistants: initialAssistants,
  modelProviders: initialModelProviders,
  mcpServers: [] as MCPServerConfig[],
};

type AssistantDialogState =
  | { open: false; mode: "create"; assistant: null }
  | { open: true; mode: "create"; assistant: null }
  | { open: true; mode: "edit"; assistant: AssistantConfig };

type ModelDialogState =
  | { open: false; providerId: null; model: null }
  | { open: true; providerId: string; model: ModelConfig | null };

function App() {
  const navigate = useNavigate();
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
  const configuredProviders = modelProviders.filter(
    (provider) => provider.apiKey.trim() && provider.models.length > 0,
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

  useEffect(() => {
    if (!settingsLoaded) return;
    savePreferences(preferences);
  }, [preferences, settingsLoaded]);


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

  const handleSelectAssistant = (assistantId: string) => {
    setPreferences((current) => ({
      ...current,
      activeAssistantId: assistantId,
    }));
    navigate("/");
  };

  const handleAssistantMessagesChange = useCallback(
    (assistantId: string, messages: AppChatMessage[]) => {
      setAssistantMessages((current) => {
        if (current[assistantId] === messages) return current;
        return { ...current, [assistantId]: messages };
      });
    },
    [],
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

  const handleCreateProvider = () => {
    const provider = createOpenAICompatibleProvider();
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
    patch: Partial<Pick<ModelProviderConfig, "name" | "apiKey" | "baseURL">>,
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

  return (
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
            <Routes>
              <Route path="/settings" element={
                <SettingsLayout
                  modelProviders={modelProviders}
                  onCreateProvider={handleCreateProvider}
                />
              }>
                <Route index element={<Navigate to="general" replace />} />
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
              <Route path="*" element={
                <>
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
                          messages={assistantMessages[assistant.id] ?? []}
                          messageFontSize={preferences.chatMessageFontSize}
                          reasoningMode={preferences.reasoningMode}
                          contextMessageLimit={preferences.contextMessageLimit}
                          mcpServers={mcpServers}
                          isActive={isActive}
                          onReasoningModeChange={(reasoningMode) =>
                            setPreferences((current) => ({
                              ...current,
                              reasoningMode,
                            }))
                          }
                          onMessagesChange={handleAssistantMessagesChange}
                          onModelChange={(providerId, modelId) =>
                            setAssistants((current) =>
                              current.map((item) =>
                                item.id === assistant.id
                                  ? { ...item, providerId, modelId }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </>
              } />
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
    patch: Partial<Pick<ModelProviderConfig, "name" | "apiKey" | "baseURL">>,
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
