import { ModelSelectorLogo } from "@/components/ai-elements/model-selector";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getProviderLogo } from "@/lib/model-providers";
import type { AppChatMessage, ModelProviderConfig } from "@/types";

type ReplySwitcherProps = {
  activeReplyId: string;
  fallbackPrimaryLabel: string;
  fallbackPrimaryProvider?: ModelProviderConfig;
  providers: ModelProviderConfig[];
  replies: AppChatMessage[];
  onValueChange: (replyId: string) => void;
};

export function ReplySwitcher({
  activeReplyId,
  fallbackPrimaryLabel,
  fallbackPrimaryProvider,
  providers,
  replies,
  onValueChange,
}: ReplySwitcherProps) {
  return (
    <ToggleGroup
      value={[activeReplyId]}
      onValueChange={(value) => {
        const nextValue = value[0];
        if (nextValue) onValueChange(nextValue);
      }}
      className="ml-1"
    >
      {replies.map((reply, index) => (
        <ToggleGroupItem
          key={reply.id}
          value={reply.id}
          title={getReplyLabel(reply, providers, index, fallbackPrimaryLabel)}
        >
          <ReplyTabIcon
            fallbackPrimaryProvider={fallbackPrimaryProvider}
            reply={reply}
            providers={providers}
          />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function ReplyTabIcon({
  fallbackPrimaryProvider,
  reply,
  providers,
}: {
  fallbackPrimaryProvider?: ModelProviderConfig;
  reply: AppChatMessage;
  providers: ModelProviderConfig[];
}) {
  const provider =
    providers.find((provider) => provider.id === reply.metadata?.providerId) ??
    (reply.metadata?.generatedBy === "mention"
      ? undefined
      : fallbackPrimaryProvider);

  return provider ? (
    <ModelSelectorLogo provider={getProviderLogo(provider)} className="size-3.5" />
  ) : (
    <span className="size-3.5 rounded-sm bg-muted-foreground/30" />
  );
}

function getReplyLabel(
  reply: AppChatMessage,
  providers: ModelProviderConfig[],
  index: number,
  fallbackPrimaryLabel: string,
) {
  const provider = providers.find(
    (provider) => provider.id === reply.metadata?.providerId,
  );
  const model = provider?.models.find(
    (model) => model.id === reply.metadata?.modelId,
  );

  if (reply.metadata?.generatedBy !== "mention" && !reply.metadata?.modelId) {
    return fallbackPrimaryLabel;
  }

  return model?.name ?? reply.metadata?.modelId ?? `回答 ${index + 1}`;
}
