import { useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import type {
  ModelProviderConfig,
} from "@/types";
import {
  ModelSelectorLogo,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CUSTOM_PROVIDER_TYPES,
  getProviderLogo,
  getProviderNavName,
  type CustomProviderType,
} from "@/lib/model-providers";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  BotIcon,
  CableIcon,
  InfoIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";

type SettingsLayoutProps = {
  modelProviders: ModelProviderConfig[];
  onCreateProvider: (name: string, type: CustomProviderType) => string;
};

export default function SettingsLayout({
  modelProviders,
  onCreateProvider,
}: SettingsLayoutProps) {
  const navigate = useNavigate();
  const { section } = useParams();
  const { t } = useI18n();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [providerName, setProviderName] = useState(
    t("settings.providers.custom"),
  );
  const [providerType, setProviderType] =
    useState<CustomProviderType>("openai-compatible");

  const openCreateDialog = () => {
    setProviderName(t("settings.providers.custom"));
    setProviderType("openai-compatible");
    setCreateDialogOpen(true);
  };

  const handleCreate = () => {
    const id = onCreateProvider(
      providerName.trim() || t("settings.providers.custom"),
      providerType,
    );
    setCreateDialogOpen(false);
    navigate(`/settings/${id}`);
  };

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <nav className="flex min-h-0 w-44 shrink-0 flex-col border-r p-2">
          <div className="grid shrink-0 gap-1">
            <Button
              variant="ghost"
              className={cn(
                "h-10 justify-start",
                section === "general" && "bg-muted",
              )}
              onClick={() => navigate("/settings/general")}
            >
              <SettingsIcon className="size-4" />
              {t("settings.general.title")}
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "h-10 justify-start",
                section === "assistants" && "bg-muted",
              )}
              onClick={() => navigate("/settings/assistants")}
            >
              <BotIcon className="size-4" />
              {t("settings.assistants.title")}
            </Button>

            <Button
              variant="ghost"
              className={cn(
                "h-10 justify-start",
                section === "mcp" && "bg-muted",
              )}
              onClick={() => navigate("/settings/mcp")}
            >
              <CableIcon className="size-4" />
              MCP
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "h-10 justify-start",
                section === "about" && "bg-muted",
              )}
              onClick={() => navigate("/settings/about")}
            >
              <InfoIcon className="size-4" />
              {t("settings.about.title")}
            </Button>

            <div className="my-1" />

            <div className="flex items-center justify-between px-2 py-1 text-sm font-medium text-muted-foreground">
              <span>{t("settings.providers.title")}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={openCreateDialog}
              >
                <PlusIcon className="size-3.5" />
              </Button>
            </div>

          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pt-1">
            <div className="grid gap-1">
              {modelProviders.map((provider) => (
                <ProviderNavItem
                  key={provider.id}
                  provider={provider}
                  active={section === provider.id}
                  onClick={() => navigate(`/settings/${provider.id}`)}
                />
              ))}
            </div>
          </div>
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("settings.providers.newProvider")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium">{t("common.name")}</span>
              <Input
                autoFocus
                value={providerName}
                onChange={(event) => setProviderName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleCreate();
                }}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">
                {t("settings.providers.apiType")}
              </span>
              <Select
                value={providerType}
                onValueChange={(value) =>
                  setProviderType(value as CustomProviderType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_PROVIDER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
