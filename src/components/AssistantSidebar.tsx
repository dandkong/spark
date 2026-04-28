import type { AssistantConfig } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, PlusIcon } from "lucide-react";
import { useRef, useState } from "react";

const collapsedWidth = 56;
const minSidebarWidth = 150;
const maxSidebarWidth = 420;

type AssistantSidebarProps = {
  assistants: AssistantConfig[];
  activeAssistantId: string;
  collapsed: boolean;
  width: number;
  onWidthChange: (width: number) => void;
  onToggleCollapsed: () => void;
  onCreateAssistant: () => void;
  onSelectAssistant: (assistantId: string) => void;
};

export default function AssistantSidebar({
  assistants,
  activeAssistantId,
  collapsed,
  width,
  onWidthChange,
  onToggleCollapsed,
  onCreateAssistant,
  onSelectAssistant,
}: AssistantSidebarProps) {
  const asideRef = useRef<HTMLElement>(null);
  const [resizing, setResizing] = useState(false);

  const handleResizePointerDown = (event: React.PointerEvent) => {
    if (collapsed) return;

    event.preventDefault();
    setResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizePointerMove = (event: React.PointerEvent) => {
    if (!resizing || collapsed) return;

    const left = asideRef.current?.getBoundingClientRect().left ?? 0;
    onWidthChange(clamp(event.clientX - left, minSidebarWidth, maxSidebarWidth));
  };

  const handleResizePointerEnd = (event: React.PointerEvent) => {
    if (!resizing) return;

    setResizing(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <aside
      ref={asideRef}
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r",
        resizing ? "select-none" : "transition-[width]",
      )}
      style={{ width: collapsed ? collapsedWidth : width }}
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

      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="调整侧边栏宽度"
          className={cn(
            "absolute top-0 right-[-3px] z-10 h-full w-1.5 cursor-col-resize touch-none",
            "after:absolute after:top-0 after:left-1/2 after:h-full after:w-px after:-translate-x-1/2 after:bg-border after:opacity-0 after:transition-opacity hover:after:opacity-100",
            resizing && "after:opacity-100",
          )}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerEnd}
          onPointerCancel={handleResizePointerEnd}
        />
      )}
    </aside>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
