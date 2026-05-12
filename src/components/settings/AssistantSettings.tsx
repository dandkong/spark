import type { AssistantConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit3Icon, GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { useI18n } from "@/i18n";
import { SettingsContent, SettingsHeader } from "./shared";

export default function AssistantSettings({
  assistants,
  onCreate,
  onEdit,
  onDelete,
  onReorder,
}: {
  assistants: AssistantConfig[];
  onCreate: () => void;
  onEdit: (assistant: AssistantConfig) => void;
  onDelete: (assistantId: string) => void;
  onReorder: (assistants: AssistantConfig[]) => void;
}) {
  const { t } = useI18n();

  return (
    <SettingsContent>
      <SettingsHeader
        title={t("settings.assistants.title")}
        action={
          <Button variant="outline" onClick={onCreate}>
            <PlusIcon className="size-4" />
            {t("settings.assistants.new")}
          </Button>
        }
      />

      <Reorder.Group
        axis="y"
        values={assistants}
        onReorder={onReorder}
        className="grid gap-2"
      >
        {assistants.map((assistant) => (
          <AssistantItem
            key={assistant.id}
            assistant={assistant}
            assistantCount={assistants.length}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </Reorder.Group>
    </SettingsContent>
  );
}

function AssistantItem({
  assistant,
  assistantCount,
  onEdit,
  onDelete,
}: {
  assistant: AssistantConfig;
  assistantCount: number;
  onEdit: (assistant: AssistantConfig) => void;
  onDelete: (assistantId: string) => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={assistant}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm"
    >
      <button
        type="button"
        onPointerDown={(event) => dragControls.start(event)}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
        {assistant.emoji ?? "✨"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium">{assistant.name}</div>
        </div>
        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {assistant.systemPrompt}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onEdit(assistant)}
      >
        <Edit3Icon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onDelete(assistant.id)}
        disabled={assistantCount <= 1}
      >
        <Trash2Icon className="size-4" />
      </Button>
    </Reorder.Item>
  );
}
