import type { AssistantConfig } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, PlusIcon } from "lucide-react";

type AssistantSidebarProps = {
  assistants: AssistantConfig[];
  activeAssistantId: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCreateAssistant: () => void;
  onSelectAssistant: (assistantId: string) => void;
};

export default function AssistantSidebar({
  assistants,
  activeAssistantId,
  collapsed,
  onToggleCollapsed,
  onCreateAssistant,
  onSelectAssistant,
}: AssistantSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r transition-[width]",
        collapsed ? "w-14" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-12 shrink-0 items-center",
          collapsed ? "justify-center" : "justify-between",
        )}
        data-tauri-drag-region
      >
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapsed}
            title="展开侧边栏"
          >
            <PanelLeftOpenIcon className="size-4" />
          </Button>
        ) : (
          <>
            <div
              className="px-3 text-sm font-semibold"
              data-tauri-drag-region
            >
              Spark
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onCreateAssistant}
                title="新建助手"
              >
                <PlusIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleCollapsed}
                title="收起侧边栏"
              >
                <PanelLeftCloseIcon className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {collapsed ? (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto p-2">
          <div className="grid gap-1">
            {assistants.map((assistant) => (
              <button
                key={assistant.id}
                type="button"
                onClick={() => onSelectAssistant(assistant.id)}
                title={assistant.name}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-sm transition-colors hover:bg-muted",
                  activeAssistantId === assistant.id && "bg-muted",
                )}
              >
                {assistant.emoji ?? "✨"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="grid gap-1">
            {assistants.map((assistant) => (
              <button
                key={assistant.id}
                type="button"
                onClick={() => onSelectAssistant(assistant.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted",
                  activeAssistantId === assistant.id && "bg-muted",
                )}
              >
                <span className="flex size-5 shrink-0 items-center justify-center text-sm">
                  {assistant.emoji ?? "✨"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {assistant.name}
                  </span>
                  {assistant.systemPrompt && (
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {assistant.systemPrompt}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
