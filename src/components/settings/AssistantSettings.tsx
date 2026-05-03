import type { AssistantConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit3Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { SettingsContent, SettingsHeader } from "./shared";

export default function AssistantSettings({
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
