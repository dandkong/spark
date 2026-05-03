import { Outlet, useNavigate, useParams } from "react-router-dom";
import type {
  ModelProviderConfig,
} from "@/types";
import {
  ModelSelectorLogo,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import {
  getProviderLogo,
  getProviderNavName,
} from "@/lib/model-providers";
import { cn } from "@/lib/utils";
import {
  BotIcon,
  InfoIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";

type SettingsLayoutProps = {
  modelProviders: ModelProviderConfig[];
  onCreateProvider: () => string;
};

export default function SettingsLayout({
  modelProviders,
  onCreateProvider,
}: SettingsLayoutProps) {
  const navigate = useNavigate();
  const { section } = useParams();

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
              onClick={() => navigate("/settings/general")}
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
              onClick={() => navigate("/settings/assistants")}
            >
              <BotIcon className="size-4" />
              助手
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
              关于
            </Button>

            <div className="my-1" />

            <div className="flex items-center justify-between px-2 py-1 text-sm font-medium text-muted-foreground">
              <span>供应商</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  const id = onCreateProvider();
                  navigate(`/settings/${id}`);
                }}
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
                onClick={() => navigate(`/settings/${provider.id}`)}
              />
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
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
