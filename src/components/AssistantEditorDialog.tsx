import { useEffect, useState } from "react";
import type { AssistantConfig } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";

type AssistantEditorDialogProps = {
  assistant: AssistantConfig | null;
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (assistant: AssistantConfig) => void;
};

const emptyAssistant = (name: string): AssistantConfig => ({
  id: crypto.randomUUID(),
  name,
  emoji: "✨",
  modelId: undefined,
  systemPrompt: "",
});

export default function AssistantEditorDialog({
  assistant,
  open,
  onOpenChange,
  onSave,
}: Omit<AssistantEditorDialogProps, "mode">) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<AssistantConfig>(() =>
    emptyAssistant(t("assistant.defaultName")),
  );

  useEffect(() => {
    if (!open) return;
    setDraft(assistant ?? emptyAssistant(t("assistant.defaultName")));
  }, [assistant, open, t]);

  const handleSave = () => {
    onSave({
      ...draft,
      emoji: draft.emoji?.trim() || "✨",
      name: draft.name.trim() || t("assistant.untitled"),
      systemPrompt: draft.systemPrompt.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("assistantDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-[4rem_1fr] gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium">{t("assistantDialog.icon")}</span>
              <Input
                value={draft.emoji ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    emoji: event.target.value,
                  }))
                }
                className="text-center"
                maxLength={4}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">{t("common.name")}</span>
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium">{t("assistantDialog.systemPrompt")}</span>
            <Textarea
              value={draft.systemPrompt}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  systemPrompt: event.target.value,
                }))
              }
              className="min-h-48 resize-none"
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
