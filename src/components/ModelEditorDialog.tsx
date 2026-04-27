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
import {
  BrainIcon,
  CheckIcon,
  ImageIcon,
  PaperclipIcon,
  WrenchIcon,
} from "lucide-react";

type ModelEditorDialogProps = {
  model: ModelConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (model: ModelConfig, previousModelId?: string) => void;
};

const emptyModel = (): ModelConfig => ({
  id: "",
  name: "",
  attachment: false,
  reasoning: false,
  tool_call: false,
  modalities: {
    input: ["text"],
    output: ["text"],
  },
});

const hasVision = (model: ModelConfig) =>
  model.modalities?.input?.includes("image") ?? false;

const modelCapabilities = [
  {
    key: "attachment",
    label: "附件",
    icon: PaperclipIcon,
  },
  {
    key: "vision",
    label: "图片",
    icon: ImageIcon,
  },
  {
    key: "reasoning",
    label: "推理",
    icon: BrainIcon,
  },
  {
    key: "tool_call",
    label: "工具",
    icon: WrenchIcon,
  },
] as const;

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
        ...draft,
        id,
        name: draft.name.trim() || id,
        modalities: {
          input: draft.modalities?.input?.includes("image")
            ? ["text", "image"]
            : ["text"],
          output: ["text"],
        },
      },
      model?.id,
    );
    onOpenChange(false);
  };

  const toggleCapability = (key: (typeof modelCapabilities)[number]["key"]) => {
    setDraft((current) => {
      if (key === "vision") {
        const input = current.modalities?.input ?? ["text"];
        const nextInput = input.includes("image")
          ? input.filter((item) => item !== "image")
          : Array.from(new Set([...input, "text", "image"]));

        return {
          ...current,
          modalities: {
            input: nextInput,
            output: current.modalities?.output ?? ["text"],
          },
        };
      }

      return { ...current, [key]: !current[key] };
    });
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

          <div className="grid gap-2">
            <span className="text-sm font-medium">模型能力</span>
            <div className="flex flex-wrap gap-2">
              {modelCapabilities.map((capability) => {
                const selected =
                  capability.key === "vision"
                    ? hasVision(draft)
                    : draft[capability.key] === true;
                const Icon = capability.icon;

                return (
                  <Button
                    key={capability.key}
                    type="button"
                    variant="outline"
                    onClick={() => toggleCapability(capability.key)}
                  >
                    {selected ? (
                      <CheckIcon className="size-3.5" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                    {capability.label}
                  </Button>
                );
              })}
            </div>
          </div>
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
