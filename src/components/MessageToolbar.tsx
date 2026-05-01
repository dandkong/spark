import { ModelSelectorLogo } from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AtSignIcon,
  ClipboardCheckIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { getProviderLogo } from "@/lib/model-providers";
import type { ModelProviderConfig } from "@/types";

export function MessageToolbar({
  align,
  canEdit,
  canMention = false,
  canRegenerate,
  copied,
  disabled,
  providers = [],
  onCopy,
  onEdit,
  onDelete,
  onMention,
  onRegenerate,
}: {
  align: "start" | "end";
  canEdit: boolean;
  canMention?: boolean;
  canRegenerate: boolean;
  copied: boolean;
  disabled: boolean;
  providers?: ModelProviderConfig[];
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMention?: (provider: ModelProviderConfig, modelId: string) => void;
  onRegenerate: () => void;
}) {
  return (
    <div
      className={
        align === "end"
          ? "flex justify-end gap-1 text-muted-foreground"
          : "flex justify-start gap-1 text-muted-foreground"
      }
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onCopy}
        title={copied ? "已复制" : "复制"}
      >
        {copied ? (
          <ClipboardCheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </Button>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          disabled={disabled}
          title="编辑"
        >
          <PencilIcon className="size-3.5" />
        </Button>
      )}
      {canMention && onMention && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                title="让其他模型回答"
              />
            }
          >
            <AtSignIcon className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-72 w-52 overflow-y-auto"
          >
            {providers.map((provider) =>
              provider.models.map((model) => (
                <DropdownMenuItem
                  key={`${provider.id}:${model.id}`}
                  onClick={() => onMention(provider, model.id)}
                >
                  <ModelSelectorLogo
                    provider={getProviderLogo(provider)}
                    className="size-4"
                  />
                  <span className="min-w-0 truncate">
                    {model.name || model.id}
                  </span>
                </DropdownMenuItem>
              )),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button variant="ghost" size="icon-sm" onClick={onDelete} title="删除">
        <Trash2Icon className="size-3.5" />
      </Button>
      {canRegenerate && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRegenerate}
          disabled={disabled}
          title="重新生成"
        >
          <RefreshCwIcon className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
