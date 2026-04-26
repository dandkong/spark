import { useEffect, useState } from "react";
import type { ModelConfig } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ModelEditorDialogProps = {
  model: ModelConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (model: ModelConfig, previousModelId?: string) => void;
};

const emptyModel = (): ModelConfig => ({
  id: "",
  name: "",
});

export default function ModelEditorDialog({
  model,
  open,
  onOpenChange,
  onSave,
}: ModelEditorDialogProps) {
  const [draft, setDraft] = useState<ModelConfig>(emptyModel);

  useEffect(() => {
    if (!open) return;
    setDraft(model ?? emptyModel());
  }, [model, open]);

  const handleSave = () => {
    const id = draft.id.trim();
    if (!id) return;

    onSave(
      {
        id,
        name: draft.name.trim() || id,
      },
      model?.id,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑模型</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium">名称</span>
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

          <label className="grid gap-2">
            <span className="text-sm font-medium">ID</span>
            <Input
              value={draft.id}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  id: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
