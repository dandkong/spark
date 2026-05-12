import { useState, useCallback } from "react";
import type { ModelConfig, ModelProviderConfig } from "@/types";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  getProviderDisplayName,
  getProviderLogo,
} from "@/lib/model-providers";
import {
  CheckIcon,
  Edit3Icon,
  CloudDownloadIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { SettingsContent, SettingsHeader } from "./shared";

export default function ProviderSettings({
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
  const { t } = useI18n();
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
        toast.error(t("settings.providers.fetchFailed"), {
          description: error instanceof Error ? error.message : t("settings.providers.retryLater"),
        });
      })
      .finally(() => setFetching(false));
  }, [onFetchModels, t]);

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
            <Button variant="outline" onClick={onDeleteProvider}>
              <Trash2Icon className="size-4" />
              {t("settings.providers.delete")}
            </Button>
          )
        }
      />

      <div className="grid gap-3 rounded-lg border p-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium">{t("common.name")}</span>
          <Input
            value={provider.name}
            onChange={(event) =>
              onUpdateProvider({ name: event.target.value })
            }
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">
            {t("settings.providers.baseUrl", { optional: t("common.optional") })}
          </span>
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
        <h2 className="text-base font-medium">{t("settings.providers.models")}</h2>
        <div className="flex gap-2">
          {provider.builtin && (
            <Button
              variant="outline"
              onClick={handleFetch}
              disabled={fetching}
            >
              {fetching ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <CloudDownloadIcon className="size-4" />
              )}
              {t("settings.providers.fetchModels")}
            </Button>
          )}
          <Button variant="outline" onClick={onCreate}>
            <PlusIcon className="size-4" />
            {t("settings.providers.newModel")}
          </Button>
        </div>
      </div>

      <ModelSelector
        open={modelSelectorOpen}
        onOpenChange={setModelSelectorOpen}
      >
        <ModelSelectorContent title={t("settings.providers.selectModel")}>
          <ModelSelectorInput placeholder={t("common.searchModels")} />
          <ModelSelectorList>
            <ModelSelectorEmpty>{t("common.modelNotFound")}</ModelSelectorEmpty>
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
            >
              <Edit3Icon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(model.id)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </SettingsContent>
  );
}
