import { useState, type ReactNode } from "react";
import type {
  AssistantConfig,
  ModelConfig,
  ModelProviderConfig,
} from "@/types";
import type { UserPreferences } from "@/lib/preferences-storage";
import { ModelSelectorLogo } from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getProviderDisplayName,
  getProviderLogo,
  getProviderNavName,
} from "@/lib/model-providers";
import { cn } from "@/lib/utils";
import {
  BotIcon,
  Edit3Icon,
  SettingsIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

type SettingsProps = {
  assistants: AssistantConfig[];
  preferences: UserPreferences;
  modelProviders: ModelProviderConfig[];
  onPreferencesChange: (preferences: UserPreferences) => void;
  onCreateAssistant: () => void;
  onEditAssistant: (assistant: AssistantConfig) => void;
  onDeleteAssistant: (assistantId: string) => void;
  onCreateModel: (providerId: string) => void;
  onEditModel: (providerId: string, model: ModelConfig) => void;
  onDeleteModel: (providerId: string, modelId: string) => void;
  onCreateProvider: () => string;
  onDeleteProvider: (providerId: string) => void;
  onUpdateProvider: (
    providerId: string,
    patch: Partial<Pick<ModelProviderConfig, "name" | "apiKey" | "baseURL">>,
  ) => void;
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
  onEditModel,
  onDeleteModel,
  onCreateProvider,
  onDeleteProvider,
  onUpdateProvider,
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
                className="size-6"
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
                onEdit={(model) => onEditModel(selectedProvider.id, model)}
                onDelete={(modelId) =>
                  onDeleteModel(selectedProvider.id, modelId)
                }
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

function GeneralSettingsPanel({
  settings,
  onChange,
}: {
  settings: UserPreferences;
  onChange: (settings: UserPreferences) => void;
}) {
  return (
    <SettingsContent>
      <SettingsHeader title="通用" />

      <div className="grid gap-3 rounded-lg border p-3">
        <label className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">聊天字号</span>
            <span className="text-sm text-muted-foreground">
              {settings.chatMessageFontSize}px
            </span>
          </div>
          <input
            type="range"
            min={12}
            max={22}
            step={1}
            value={settings.chatMessageFontSize}
            onChange={(event) =>
              onChange({
                ...settings,
                chatMessageFontSize: Number(event.target.value),
              })
            }
            className="w-full accent-foreground"
          />
        </label>
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
  onEdit,
  onDelete,
  onDeleteProvider,
}: {
  provider: ModelProviderConfig;
  onUpdateProvider: (
    patch: Partial<Pick<ModelProviderConfig, "name" | "apiKey" | "baseURL">>,
  ) => void;
  onCreate: () => void;
  onEdit: (model: ModelConfig) => void;
  onDelete: (modelId: string) => void;
  onDeleteProvider: () => void;
}) {
  const { models } = provider;

  return (
    <SettingsContent>
      <SettingsHeader
        title={getProviderDisplayName(provider)}
        description={
          provider.type === "openai-compatible"
            ? "OpenAI 兼容供应商"
            : undefined
        }
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
          <Input
            type="password"
            value={provider.apiKey}
            onChange={(event) =>
              onUpdateProvider({ apiKey: event.target.value })
            }
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium">模型</h2>
        <Button onClick={onCreate} title="新建模型">
          <PlusIcon className="size-4" />
          新建
        </Button>
      </div>

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
          <Button onClick={onCreate} title="新建助手">
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
