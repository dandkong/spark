import { useState, type ReactNode, useCallback } from "react";
import type {
  AssistantConfig,
  ModelConfig,
  ModelProviderConfig,
} from "@/types";
import type { UserPreferences } from "@/lib/preferences-storage";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  getProviderDisplayName,
  getProviderLogo,
  getProviderNavName,
} from "@/lib/model-providers";
import { cn } from "@/lib/utils";
import {
  BotIcon,
  CheckIcon,
  Edit3Icon,
  CloudDownloadIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  SettingsIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

type SettingsProps = {
  assistants: AssistantConfig[];
  preferences: UserPreferences;
  modelProviders: ModelProviderConfig[];
  onPreferencesChange: (preferences: UserPreferences) => void;
  onCreateAssistant: () => void;
  onEditAssistant: (assistant: AssistantConfig) => void;
  onDeleteAssistant: (assistantId: string) => void;
  onCreateModel: (providerId: string) => void;
  onAddModel: (providerId: string, model: ModelConfig) => void;
  onEditModel: (providerId: string, model: ModelConfig) => void;
  onDeleteModel: (providerId: string, modelId: string) => void;
  onCreateProvider: () => string;
  onDeleteProvider: (providerId: string) => void;
  onUpdateProvider: (
    providerId: string,
    patch: Partial<Pick<ModelProviderConfig, "name" | "apiKey" | "baseURL">>,
  ) => void;
  onFetchModels: (providerId: string) => Promise<ModelConfig[]>;
};

export default function Settings({
  assistants,
  preferences,
  modelProviders,
  onPreferencesChange,
  onCreateAssistant,
  onEditAssistant,
  onDeleteAssistant,
  onCreateModel,
  onAddModel,
  onEditModel,
  onDeleteModel,
  onCreateProvider,
  onDeleteProvider,
  onUpdateProvider,
  onFetchModels,
}: SettingsProps) {
  const [section, setSection] = useState("assistants");
  const selectedProvider = modelProviders.find(
    (provider) => provider.id === section,
  );

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <nav className="w-44 shrink-0 border-r p-2">
          <div className="grid gap-1">
            <Button
              variant="ghost"
              className={cn(
                "h-10 justify-start",
                section === "general" && "bg-muted",
              )}
              onClick={() => setSection("general")}
            >
              <SettingsIcon className="size-4" />
              通用
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "h-10 justify-start",
                section === "assistants" && "bg-muted",
              )}
              onClick={() => setSection("assistants")}
            >
              <BotIcon className="size-4" />
              助手
            </Button>

            <div className="my-1" />

            <div className="flex items-center justify-between px-2 py-1 text-sm font-medium text-muted-foreground">
              <span>供应商</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSection(onCreateProvider())}
                title="添加供应商"
              >
                <PlusIcon className="size-3.5" />
              </Button>
            </div>

            {modelProviders.map((provider) => (
              <ProviderNavItem
                key={provider.id}
                provider={provider}
                active={section === provider.id}
                onClick={() => setSection(provider.id)}
              />
            ))}
          </div>
        </nav>

        {section === "general" ? (
          <div className="min-w-0 flex-1 overflow-y-auto">
            <GeneralSettingsPanel
              settings={preferences}
              onChange={onPreferencesChange}
            />
          </div>
        ) : section === "assistants" ? (
          <div className="min-w-0 flex-1 overflow-y-auto">
            <AssistantList
              assistants={assistants}
              onCreate={onCreateAssistant}
              onEdit={onEditAssistant}
              onDelete={onDeleteAssistant}
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1 overflow-y-auto">
            {selectedProvider && (
              <ModelList
                provider={selectedProvider}
                onUpdateProvider={(patch) =>
                  onUpdateProvider(selectedProvider.id, patch)
                }
                onCreate={() => onCreateModel(selectedProvider.id)}
                onAdd={(model) => onAddModel(selectedProvider.id, model)}
                onEdit={(model) => onEditModel(selectedProvider.id, model)}
                onDelete={(modelId) =>
                  onDeleteModel(selectedProvider.id, modelId)
                }
                onFetchModels={() => onFetchModels(selectedProvider.id)}
                onDeleteProvider={() => {
                  onDeleteProvider(selectedProvider.id);
                  setSection("assistants");
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const contextLimitMax = 100;
const contextLimitUnlimitedValue = contextLimitMax;
const contextLimitMarks = [
  { label: "0", value: 0 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "75", value: 75 },
  { label: "不限", value: contextLimitUnlimitedValue },
] as const;

function GeneralSettingsPanel({
  settings,
  onChange,
}: {
  settings: UserPreferences;
  onChange: (settings: UserPreferences) => void;
}) {
  const contextLimitValue =
    settings.contextMessageLimit === null
      ? contextLimitUnlimitedValue
      : settings.contextMessageLimit;
  const contextLimitLabel =
    settings.contextMessageLimit === null ? "不限" : String(contextLimitValue);

  return (
    <SettingsContent>
      <SettingsHeader title="通用" />

      <div className="grid gap-3">
        <section className="grid gap-3 rounded-lg border p-3">
          <div className="text-sm font-medium">显示</div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">聊天字号</span>
              <span className="text-sm text-muted-foreground">
                {settings.chatMessageFontSize}px
              </span>
            </div>
            <Slider
              min={12}
              max={22}
              step={1}
              value={[settings.chatMessageFontSize]}
              onValueChange={([chatMessageFontSize]) =>
                onChange({ ...settings, chatMessageFontSize })
              }
            />
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border p-3">
          <div className="text-sm font-medium">对话</div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                上下文消息数
              </span>
              <span className="text-sm text-muted-foreground">
                {contextLimitLabel}
              </span>
            </div>
            <div className="grid gap-2">
              <Slider
                min={0}
                max={contextLimitMax}
                step={1}
                value={[contextLimitValue]}
                onValueChange={([value]) => {
                  const contextMessageLimit =
                    value >= contextLimitUnlimitedValue
                      ? null
                      : Math.round(value);
                  onChange({ ...settings, contextMessageLimit });
                }}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                {contextLimitMarks.map((option) => (
                  <span key={option.label}>{option.label}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </SettingsContent>
  );
}

function SettingsContent({ children }: { children: ReactNode }) {
  return <div className="mx-auto grid max-w-4xl gap-4 px-4 pt-2 pb-2">{children}</div>;
}

function SettingsHeader({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function ProviderNavItem({
  provider,
  active,
  onClick,
}: {
  provider: ModelProviderConfig;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "h-10 justify-start",
        active && "bg-muted",
      )}
      onClick={onClick}
    >
      <ModelSelectorLogo
        provider={getProviderLogo(provider)}
        className="size-4 shrink-0"
      />
      <span className="truncate">{getProviderNavName(provider)}</span>
    </Button>
  );
}

function ModelList({
  provider,
  onUpdateProvider,
  onCreate,
  onAdd,
  onEdit,
  onDelete,
  onFetchModels,
  onDeleteProvider,
}: {
  provider: ModelProviderConfig;
  onUpdateProvider: (
    patch: Partial<Pick<ModelProviderConfig, "name" | "apiKey" | "baseURL">>,
  ) => void;
  onCreate: () => void;
  onAdd: (model: ModelConfig) => void;
  onEdit: (model: ModelConfig) => void;
  onDelete: (modelId: string) => void;
  onFetchModels: () => Promise<ModelConfig[]>;
  onDeleteProvider: () => void;
}) {
  const { models } = provider;
  const [fetching, setFetching] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleFetch = useCallback(() => {
    setFetching(true);
    onFetchModels()
      .then((fetchedModels) => {
        setAvailableModels(fetchedModels);
        setModelSelectorOpen(true);
      })
      .catch((error) => {
        toast.error("获取模型失败", {
          description: error instanceof Error ? error.message : "请稍后重试。",
        });
      })
      .finally(() => setFetching(false));
  }, [onFetchModels]);

  return (
    <SettingsContent>
      <SettingsHeader
        title={getProviderDisplayName(provider)}
        icon={
          <ModelSelectorLogo
            provider={getProviderLogo(provider)}
            className="size-5 shrink-0"
          />
        }
        action={
          !provider.builtin && (
            <Button variant="outline" onClick={onDeleteProvider} title="删除供应商">
              <Trash2Icon className="size-4" />
              删除供应商
            </Button>
          )
        }
      />

      <div className="grid gap-3 rounded-lg border p-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium">名称</span>
          <Input
            value={provider.name}
            onChange={(event) =>
              onUpdateProvider({ name: event.target.value })
            }
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Base URL（可选）</span>
          <Input
            placeholder="https://api.example.com/v1"
            value={provider.baseURL ?? ""}
            onChange={(event) =>
              onUpdateProvider({ baseURL: event.target.value })
            }
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">API Key</span>
          <InputGroup>
            <InputGroupInput
              type={showApiKey ? "text" : "password"}
              value={provider.apiKey}
              onChange={(event) =>
                onUpdateProvider({ apiKey: event.target.value })
              }
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setShowApiKey((visible) => !visible)}
                title={showApiKey ? "隐藏 API Key" : "显示 API Key"}
              >
                {showApiKey ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium">模型</h2>
        <div className="flex gap-2">
          {provider.builtin && (
            <Button
              variant="outline"
              onClick={handleFetch}
              disabled={fetching}
              title="从 models.dev 获取模型列表"
            >
              {fetching ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <CloudDownloadIcon className="size-4" />
              )}
              获取模型
            </Button>
          )}
          <Button variant="outline" onClick={onCreate} title="新建模型">
            <PlusIcon className="size-4" />
            新建
          </Button>
        </div>
      </div>

      <ModelSelector
        open={modelSelectorOpen}
        onOpenChange={setModelSelectorOpen}
      >
        <ModelSelectorContent title="选择模型">
          <ModelSelectorInput placeholder="搜索模型..." />
          <ModelSelectorList>
            <ModelSelectorEmpty>未找到模型。</ModelSelectorEmpty>
            <ModelSelectorGroup heading={getProviderDisplayName(provider)}>
              {availableModels.map((model) => {
                const exists = models.some((item) => item.id === model.id);

                return (
                  <ModelSelectorItem
                    key={model.id}
                    value={`${model.name} ${model.id}`}
                    onSelect={() => {
                      if (exists) {
                        onDelete(model.id);
                        return;
                      }
                      onAdd(model);
                    }}
                  >
                    <ModelSelectorLogo provider={getProviderLogo(provider)} />
                    <ModelSelectorName>{model.name}</ModelSelectorName>
                    {exists ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : (
                      <div className="ml-auto size-4" />
                    )}
                  </ModelSelectorItem>
                );
              })}
            </ModelSelectorGroup>
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelector>

      <div className="grid gap-2">
        {models.map((model) => (
          <div
            key={model.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{model.name}</div>
              <div className="mt-1 truncate text-sm text-muted-foreground">
                {model.id}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(model)}
              title="编辑"
            >
              <Edit3Icon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(model.id)}
              title="删除"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </SettingsContent>
  );
}

function AssistantList({
  assistants,
  onCreate,
  onEdit,
  onDelete,
}: {
  assistants: AssistantConfig[];
  onCreate: () => void;
  onEdit: (assistant: AssistantConfig) => void;
  onDelete: (assistantId: string) => void;
}) {
  return (
    <SettingsContent>
      <SettingsHeader
        title="助手"
        action={
          <Button variant="outline" onClick={onCreate} title="新建助手">
            <PlusIcon className="size-4" />
            新建
          </Button>
        }
      />

      <div className="grid gap-2">
        {assistants.map((assistant) => (
          <div
            key={assistant.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
              {assistant.emoji ?? "✨"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-medium">
                  {assistant.name}
                </div>
              </div>
              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {assistant.systemPrompt}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(assistant)}
              title="编辑"
            >
              <Edit3Icon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(assistant.id)}
              disabled={assistants.length <= 1}
              title="删除"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </SettingsContent>
  );
}
