import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  Attachment,
  AttachmentHoverCard,
  AttachmentHoverCardContent,
  AttachmentHoverCardTrigger,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  getAttachmentLabel,
  getMediaCategory,
} from "@/components/ai-elements/attachments";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { useChat } from "@ai-sdk/react";
import {
  DirectChatTransport,
  ToolLoopAgent,
  getToolName,
  isToolUIPart,
  readUIMessageStream,
  type ChatTransport,
  type DynamicToolUIPart,
  type FileUIPart,
  type ToolUIPart,
} from "ai";
import {
  AtSignIcon,
  CheckIcon,
  ClipboardCheckIcon,
  BrainIcon,
  CopyIcon,
  EraserIcon,
  PaperclipIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  AppChatMessage,
  AssistantConfig,
  MCPServerConfig,
  ModelConfig,
  ModelProviderConfig,
  ReasoningMode,
} from "@/types";
import {
  createProviderLanguageModel,
  createReasoningProviderOptions,
  getProviderDisplayName,
  getProviderLogo,
} from "@/lib/model-providers";
import { getEnabledMCPTools } from "@/lib/mcp";

const reasoningModeLabels: Record<ReasoningMode, string> = {
  auto: "自动",
  off: "关闭",
  on: "开启",
};

function buildAssistantInstructions(systemPrompt: string) {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  const currentDate = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return `${systemPrompt.trimEnd()}\n\n---\nRuntime context:\n- Current date: ${currentDate}, ${formatUtcOffset(now)}`;
}

function formatUtcOffset(date: Date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60).toString().padStart(2, "0");
  const minutes = (absoluteMinutes % 60).toString().padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}

class ContextLimitedChatTransport implements ChatTransport<AppChatMessage> {
  constructor(
    private readonly transport: ChatTransport<AppChatMessage>,
    private readonly contextMessageLimit: number | null,
  ) {}

  sendMessages(options: Parameters<ChatTransport<AppChatMessage>["sendMessages"]>[0]) {
    return this.transport.sendMessages({
      ...options,
      messages: limitContextMessages(
        options.messages.filter(
          (message) => message.metadata?.generatedBy !== "mention",
        ),
        this.contextMessageLimit,
      ),
    });
  }

  reconnectToStream(
    options: Parameters<ChatTransport<AppChatMessage>["reconnectToStream"]>[0],
  ) {
    return this.transport.reconnectToStream(options);
  }
}

function limitContextMessages(
  messages: AppChatMessage[],
  contextMessageLimit: number | null,
) {
  if (contextMessageLimit === null || messages.length <= contextMessageLimit) {
    return messages;
  }
  if (contextMessageLimit === 0) {
    return messages.at(-1) ? [messages.at(-1)!] : [];
  }

  return messages.slice(-contextMessageLimit);
}

type ChatProps = {
  assistant: AssistantConfig;
  providers: ModelProviderConfig[];
  provider?: ModelProviderConfig;
  models: ModelConfig[];
  model: string;
  messages: AppChatMessage[];
  messageFontSize: number;
  reasoningMode: ReasoningMode;
  contextMessageLimit: number | null;
  mcpServers: MCPServerConfig[];
  isActive: boolean;
  onReasoningModeChange: (reasoningMode: ReasoningMode) => void;
  onMessagesChange: (assistantId: string, messages: AppChatMessage[]) => void;
  onModelChange: (providerId: string, modelId: string) => void;
};

export default function Chat({
  assistant,
  providers,
  provider,
  models,
  model,
  messages: initialMessages,
  messageFontSize,
  reasoningMode,
  contextMessageLimit,
  mcpServers,
  isActive,
  onReasoningModeChange,
  onMessagesChange,
  onModelChange,
}: ChatProps) {
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{
    id: string;
    role: AppChatMessage["role"];
    text: string;
  } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [activeReplyByUserId, setActiveReplyByUserId] = useState<Record<string, string>>({});
  const [mentionGeneratingMessageId, setMentionGeneratingMessageId] = useState<string | null>(null);
  const hasConfiguredModel = Boolean(provider && model);
  const effectiveProvider: ModelProviderConfig =
    provider ?? {
      id: "openai",
      name: "OpenAI",
      type: "openai",
      builtin: true,
      apiKey: "",
      baseURL: "",
      models: [],
    };
  const effectiveModel = model || "placeholder";
  const assistantInstructions = buildAssistantInstructions(assistant.systemPrompt);
  const reasoningProviderOptions = useMemo(
    () =>
      createReasoningProviderOptions(
        effectiveProvider,
        effectiveModel,
        reasoningMode,
      ),
    [effectiveModel, effectiveProvider, reasoningMode],
  );

  const agent = useMemo(
    () =>
      new ToolLoopAgent({
        model: createProviderLanguageModel(effectiveProvider, effectiveModel),
        instructions: assistantInstructions,
        providerOptions: reasoningProviderOptions,
        prepareCall: async (options) => {
          const tools = await getEnabledMCPTools(mcpServers);
          return {
            ...options,
            tools,
          };
        },
      }),
    [
      assistantInstructions,
      effectiveModel,
      effectiveProvider,
      mcpServers,
      reasoningProviderOptions,
    ],
  );

  const transport = useMemo(
    () =>
      new ContextLimitedChatTransport(
        new DirectChatTransport({ agent, sendReasoning: true }),
        contextMessageLimit,
      ),
    [agent, contextMessageLimit],
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    regenerate,
    error,
    clearError,
  } = useChat<AppChatMessage>({
    id: `${assistant.id}:${effectiveProvider.id}:${effectiveModel}:${reasoningMode}`,
    messages: initialMessages,
    transport,
  });
  const [input, setInput] = useState("");

  useEffect(() => {
    onMessagesChange(assistant.id, messages);
  }, [assistant.id, messages, onMessagesChange]);

  useEffect(() => {
    if (!error) return;

    toast.error("请求失败", {
      description: getChatErrorMessage(error),
    });
    clearError();
  }, [clearError, error]);

  const selectedModelData = useMemo(
    () => models.find((m) => m.id === model),
    [model, models],
  );
  const conversationTurns = useMemo(
    () => buildConversationTurns(messages),
    [messages],
  );

  const isWaitingForAssistant =
    status === "submitted" ||
    (status === "streaming" && messages.at(-1)?.role === "user");

  const handleClear = useCallback(() => {
    setMessages([]);
    setInput("");
  }, [setMessages]);

  const handleCopyMessage = useCallback(async (message: AppChatMessage) => {
    const text = getMessageText(message);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(message.id);
      window.setTimeout(() => {
        setCopiedMessageId((current) =>
          current === message.id ? null : current,
        );
      }, 1000);
    } catch {
      toast.error("复制失败");
    }
  }, []);

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      setMessages((current) => {
        const target = current.find((message) => message.id === messageId);
        return current.filter((message) => {
          if (message.id === messageId) return false;
          return !(
            target?.role === "user" &&
            message.metadata?.sourceUserMessageId === messageId
          );
        });
      });
    },
    [setMessages],
  );

  const handleSaveEditedMessage = useCallback(() => {
    if (!editingMessage) return;

    const editedText = editingMessage.text.trim();
    if (!editedText) {
      toast.error("消息不能为空");
      return;
    }

    let shouldRegenerate = false;

    setMessages((current) => {
      const messageIndex = current.findIndex(
        (message) => message.id === editingMessage.id,
      );
      if (messageIndex === -1) return current;

      const updatedMessage = updateMessageText(
        current[messageIndex],
        editedText,
      );
      const nextMessages = [
        ...current.slice(0, messageIndex),
        updatedMessage,
      ];

      shouldRegenerate = editingMessage.role === "user";
      return shouldRegenerate ? nextMessages : [...nextMessages, ...current.slice(messageIndex + 1)];
    });
    setEditingMessage(null);

    if (shouldRegenerate) {
      regenerate({ messageId: editingMessage.id });
    }
  }, [editingMessage, regenerate, setMessages]);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      const messageIndex = messages.findIndex(
        (message) => message.id === messageId,
      );
      if (messageIndex === -1) return;

      const message = messages[messageIndex];
      const targetUserIndex =
        message.role === "user"
          ? messageIndex
          : findPreviousUserMessageIndex(messages, messageIndex);

      if (targetUserIndex === -1) {
        toast.error("无法重新生成", {
          description: "没有找到可用于重新生成的用户消息。",
        });
        return;
      }

      const targetMessage = messages[targetUserIndex];
      setMessages(messages.slice(0, targetUserIndex + 1));
      regenerate({ messageId: targetMessage.id });
    },
    [messages, regenerate, setMessages],
  );

  const handleMentionReply = useCallback(
    async (
      targetMessageId: string,
      mentionProvider: ModelProviderConfig,
      mentionModelId: string,
    ) => {
      const targetIndex = messages.findIndex(
        (message) => message.id === targetMessageId,
      );
      if (targetIndex === -1 || messages[targetIndex].role !== "assistant") {
        return;
      }

      const sourceUserIndex = getSourceUserIndexForAssistant(
        messages,
        targetIndex,
      );
      if (sourceUserIndex === -1) {
        toast.error("无法 @ 模型", {
          description: "没有找到这条回答对应的用户消息。",
        });
        return;
      }

      const sourceUserMessage = messages[sourceUserIndex];
      const contextMessages = limitContextMessages(
        messages
          .slice(0, sourceUserIndex + 1)
          .filter((message) => message.metadata?.generatedBy !== "mention"),
        contextMessageLimit,
      );
      const mentionMessage: AppChatMessage = {
        id: createMessageId(),
        role: "assistant",
        metadata: {
          generatedBy: "mention",
          sourceUserMessageId: sourceUserMessage.id,
          providerId: mentionProvider.id,
          modelId: mentionModelId,
        },
        parts: [],
      };

      setMentionGeneratingMessageId(mentionMessage.id);
      setActiveReplyByUserId((current) => ({
        ...current,
        [sourceUserMessage.id]: mentionMessage.id,
      }));
      setMessages((current) =>
        insertReplyForUser(current, sourceUserMessage.id, mentionMessage),
      );

      try {
        const mentionAgent = new ToolLoopAgent({
          model: createProviderLanguageModel(mentionProvider, mentionModelId),
          instructions: assistantInstructions,
          providerOptions: createReasoningProviderOptions(
            mentionProvider,
            mentionModelId,
            reasoningMode,
          ),
        });
        const mentionTransport = new DirectChatTransport({
          agent: mentionAgent,
          sendReasoning: true,
        });
        const stream = await mentionTransport.sendMessages({
          trigger: "submit-message",
          chatId: `${assistant.id}:mention:${mentionMessage.id}`,
          messageId: undefined,
          messages: contextMessages,
          abortSignal: undefined,
        });

        for await (const partialMessage of readUIMessageStream<AppChatMessage>({
          message: mentionMessage,
          stream,
        })) {
          setMessages((current) =>
            current.map((message) =>
              message.id === mentionMessage.id
                ? {
                    ...partialMessage,
                    metadata: mentionMessage.metadata,
                  }
                : message,
            ),
          );
        }
      } catch (error) {
        toast.error("@ 模型失败", {
          description: getChatErrorMessage(error),
        });
        setMessages((current) =>
          current.filter((message) => message.id !== mentionMessage.id),
        );
      } finally {
        setMentionGeneratingMessageId(null);
      }
    },
    [
      assistant.id,
      assistantInstructions,
      contextMessageLimit,
      messages,
      reasoningMode,
      setMessages,
    ],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClear]);

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const text = message.text.trim();
      const hasFiles = message.files.length > 0;
      if (!text && !hasFiles) return;
      if (!hasConfiguredModel) {
        toast.error("请在设置中配置模型");
        return;
      }
      sendMessage({
        text,
        files: message.files,
      });
      setInput("");
    },
    [hasConfiguredModel, sendMessage],
  );

  return (
    <div className="relative flex size-full flex-col overflow-hidden px-8">

      {/* Conversation */}
      {messages.length > 0 && (
      <Conversation>
        <ConversationContent>
          {conversationTurns.map((turn) => {
            const activeReplyId =
              activeReplyByUserId[turn.user.id] ?? turn.replies[0]?.id;
            const activeReply =
              turn.replies.find((reply) => reply.id === activeReplyId) ??
              turn.replies[0];
            const userIndex = messages.findIndex(
              (message) => message.id === turn.user.id,
            );

            return (
              <div key={turn.user.id} className="grid gap-2">
                <Message from="user">
                  <MessageBody
                    isStreaming={false}
                    message={turn.user}
                    messageFontSize={messageFontSize}
                  />
                  <MessageToolbar
                    align="end"
                    canRegenerate={canRegenerateFromMessage(messages, userIndex)}
                    disabled={status === "submitted" || status === "streaming"}
                    canEdit
                    copied={copiedMessageId === turn.user.id}
                    onCopy={() => handleCopyMessage(turn.user)}
                    onDelete={() => handleDeleteMessage(turn.user.id)}
                    onEdit={() =>
                      setEditingMessage({
                        id: turn.user.id,
                        role: turn.user.role,
                        text: getMessageText(turn.user),
                      })
                    }
                    onRegenerate={() => handleRegenerate(turn.user.id)}
                  />
                </Message>

                {activeReply && (
                  <Message from="assistant">
                    <MessageBody
                      isStreaming={
                        (activeReply.id === messages.at(-1)?.id &&
                          status === "streaming") ||
                        mentionGeneratingMessageId === activeReply.id
                      }
                      message={activeReply}
                      messageFontSize={messageFontSize}
                    />
                    <div className="flex items-center gap-1">
                      {turn.replies.length > 1 && (
                        <ReplyTabs
                          activeReplyId={activeReply.id}
                          fallbackPrimaryLabel={selectedModelData?.name ?? model}
                          fallbackPrimaryProvider={provider}
                          providers={providers}
                          replies={turn.replies}
                          onValueChange={(replyId) =>
                            setActiveReplyByUserId((current) => ({
                              ...current,
                              [turn.user.id]: replyId,
                            }))
                          }
                        />
                      )}
                      <MessageToolbar
                        align="start"
                        canMention={providers.some((item) => item.models.length > 0)}
                        canRegenerate={canRegenerateFromMessage(
                          messages,
                          messages.findIndex(
                            (message) => message.id === activeReply.id,
                          ),
                        )}
                        disabled={
                          status === "submitted" ||
                          status === "streaming" ||
                          Boolean(mentionGeneratingMessageId)
                        }
                        canEdit={false}
                        copied={copiedMessageId === activeReply.id}
                        providers={providers}
                        onCopy={() => handleCopyMessage(activeReply)}
                        onDelete={() => handleDeleteMessage(activeReply.id)}
                        onEdit={() => undefined}
                        onMention={(mentionProvider, mentionModelId) =>
                          handleMentionReply(
                            activeReply.id,
                            mentionProvider,
                            mentionModelId,
                          )
                        }
                        onRegenerate={() => handleRegenerate(activeReply.id)}
                      />
                    </div>
                  </Message>
                )}
              </div>
            );
          })}
          {isWaitingForAssistant && <AssistantLoadingMessage />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      )}

      {/* Welcome + Input area */}
      {messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-xl text-foreground">
          <TypewriterText
            key={`${assistant.id}:${isActive ? "active" : "inactive"}`}
            text="⚡ Let's spark something new !"
          />
        </div>
      )}

      {/* Input area */}
      <div className="grid shrink-0 gap-4 pt-4">
        <div className="w-full pb-4">
          <PromptInput
            onSubmit={handleSubmit}
            globalDrop
            multiple
          >
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder="输入消息..."
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                {providers.some((p) => p.models.length > 0) ? (
                <ModelSelector
                  open={modelSelectorOpen}
                  onOpenChange={setModelSelectorOpen}
                >
                  <ModelSelectorTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        title="选择模型"
                      />
                    }
                  >
                    {provider && (
                      <ModelSelectorLogo provider={getProviderLogo(provider)} className="size-4" />
                    )}
                    <ModelSelectorName>
                      {selectedModelData?.name ?? "选择模型"}
                    </ModelSelectorName>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="搜索模型..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>未找到模型。</ModelSelectorEmpty>
                      {providers.map((modelProvider) => (
                        <ModelSelectorGroup
                          key={modelProvider.id}
                          heading={getProviderDisplayName(modelProvider)}
                        >
                          {modelProvider.models.map((m) => (
                            <ModelSelectorItem
                              key={`${modelProvider.id}:${m.id}`}
                              value={`${modelProvider.id}:${m.id}`}
                              onSelect={() => {
                                onModelChange(modelProvider.id, m.id);
                                setModelSelectorOpen(false);
                              }}
                            >
                              <ModelSelectorLogo
                                provider={getProviderLogo(modelProvider)}
                              />
                              <ModelSelectorName>{m.name}</ModelSelectorName>
                              {provider?.id === modelProvider.id && model === m.id ? (
                                <CheckIcon className="ml-auto size-4" />
                              ) : (
                                <div className="ml-auto size-4" />
                              )}
                            </ModelSelectorItem>
                          ))}
                        </ModelSelectorGroup>
                      ))}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.error("请在设置中配置模型");
                    }}
                  >
                    暂无模型
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        title={`思考模式:${reasoningModeLabels[reasoningMode]}`}
                      />
                    }
                  >
                    <BrainIcon className="size-4" />
                    <span>{reasoningModeLabels[reasoningMode]}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-28">
                    {(Object.keys(reasoningModeLabels) as ReasoningMode[]).map(
                      (mode) => (
                        <DropdownMenuItem
                          key={mode}
                          onClick={() => onReasoningModeChange(mode)}
                        >
                          <CheckIcon
                            className={cn(
                              "size-4",
                              reasoningMode === mode
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {reasoningModeLabels[mode]}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <PromptInputAttachmentButton />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  title="清理对话 (Ctrl+L)"
                >
                  <EraserIcon className="size-4" />
                </Button>
              </PromptInputTools>
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
      <Dialog
        open={Boolean(editingMessage)}
        onOpenChange={(open) => {
          if (!open) setEditingMessage(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>编辑消息</DialogTitle>
          </DialogHeader>
          <Textarea
            className="min-h-40 resize-none"
            value={editingMessage?.text ?? ""}
            onChange={(event) =>
              setEditingMessage((current) =>
                current ? { ...current, text: event.target.value } : current,
              )
            }
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEditedMessage}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageAttachments({ message }: { message: AppChatMessage }) {
  const files = message.parts.filter(
    (part): part is FileUIPart => part.type === "file",
  );

  if (files.length === 0) return null;

  return (
    <Attachments
      variant="inline"
      className={message.role === "user" ? "justify-end" : undefined}
    >
      {files.map((file, index) => {
        const attachment = { ...file, id: `${message.id}:file:${index}` };
        const mediaCategory = getMediaCategory(attachment);
        const label = getAttachmentLabel(attachment);

        return (
          <AttachmentHoverCard key={attachment.id}>
            <AttachmentHoverCardTrigger render={<Attachment data={attachment} />}>
              <AttachmentPreview />
              <AttachmentInfo />
            </AttachmentHoverCardTrigger>
            <AttachmentHoverCardContent>
              <div className="space-y-3">
                {mediaCategory === "image" && attachment.url && (
                  <div className="flex max-h-96 w-80 items-center justify-center overflow-hidden rounded-md border">
                    <img
                      alt={label}
                      className="max-h-full max-w-full object-contain"
                      height={384}
                      src={attachment.url}
                      width={320}
                    />
                  </div>
                )}
                <div className="space-y-1 px-0.5">
                  <h4 className="font-semibold text-sm leading-none">
                    {label}
                  </h4>
                  {attachment.mediaType && (
                    <p className="font-mono text-muted-foreground text-xs">
                      {attachment.mediaType}
                    </p>
                  )}
                </div>
              </div>
            </AttachmentHoverCardContent>
          </AttachmentHoverCard>
        );
      })}
    </Attachments>
  );
}

function PromptInputAttachmentButton() {
  const attachments = usePromptInputAttachments();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={attachments.openFileDialog}
      title="添加附件"
    >
      <PaperclipIcon className="size-4" />
    </Button>
  );
}

function PromptInputAttachmentsDisplay() {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) return null;

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => {
        const mediaCategory = getMediaCategory(attachment);
        const label = getAttachmentLabel(attachment);

        return (
          <AttachmentHoverCard key={attachment.id}>
            <AttachmentHoverCardTrigger
              render={
                <Attachment
                  data={attachment}
                  onRemove={() => attachments.remove(attachment.id)}
                />
              }
            >
              <AttachmentPreview />
              <AttachmentInfo />
              <AttachmentRemove label="移除附件" />
            </AttachmentHoverCardTrigger>
            <AttachmentHoverCardContent>
              <div className="space-y-3">
                {mediaCategory === "image" && attachment.url && (
                  <div className="flex max-h-96 w-80 items-center justify-center overflow-hidden rounded-md border">
                    <img
                      alt={label}
                      className="max-h-full max-w-full object-contain"
                      height={384}
                      src={attachment.url}
                      width={320}
                    />
                  </div>
                )}
                <div className="space-y-1 px-0.5">
                  <h4 className="font-semibold text-sm leading-none">
                    {label}
                  </h4>
                  {attachment.mediaType && (
                    <p className="font-mono text-muted-foreground text-xs">
                      {attachment.mediaType}
                    </p>
                  )}
                </div>
              </div>
            </AttachmentHoverCardContent>
          </AttachmentHoverCard>
        );
      })}
    </Attachments>
  );
}

function MessageBody({
  isStreaming,
  message,
  messageFontSize,
}: {
  isStreaming: boolean;
  message: AppChatMessage;
  messageFontSize: number;
}) {
  const isEmptyAssistantMessage =
    message.role === "assistant" && message.parts.length === 0;

  return (
    <MessageContent
      className="text-[length:var(--chat-message-font-size)]"
      style={
        {
          "--chat-message-font-size": `${messageFontSize}px`,
        } as CSSProperties
      }
    >
      <MessageAttachments message={message} />
      {isEmptyAssistantMessage && <LoadingDots />}
      {message.parts.map((part, index) => {
        if (part.type === "reasoning") {
          return (
            <Reasoning key={index} isStreaming={isStreaming}>
              <ReasoningTrigger />
              <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
          );
        }
        if (part.type === "text") {
          if (message.role === "user") {
            return (
              <div key={index} className="whitespace-pre-wrap break-words">
                {part.text}
              </div>
            );
          }
          return <MessageResponse key={index}>{part.text}</MessageResponse>;
        }
        if (isToolUIPart(part)) {
          return <ToolCallView key={index} part={part} />;
        }
        return null;
      })}
    </MessageContent>
  );
}

function ToolCallView({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  return (
    <Tool>
      {part.type === "dynamic-tool" ? (
        <ToolHeader
          type="dynamic-tool"
          state={part.state}
          toolName={part.toolName}
          title={part.title}
        />
      ) : (
        <ToolHeader type={part.type} state={part.state} title={getToolName(part)} />
      )}
      <ToolContent>
        {part.input !== undefined && <ToolInput input={part.input} />}
        <ToolOutput
          output={"output" in part ? part.output : undefined}
          errorText={"errorText" in part ? part.errorText : undefined}
        />
      </ToolContent>
    </Tool>
  );
}

function ReplyTabs({
  activeReplyId,
  fallbackPrimaryLabel,
  fallbackPrimaryProvider,
  providers,
  replies,
  onValueChange,
}: {
  activeReplyId: string;
  fallbackPrimaryLabel: string;
  fallbackPrimaryProvider?: ModelProviderConfig;
  providers: ModelProviderConfig[];
  replies: AppChatMessage[];
  onValueChange: (replyId: string) => void;
}) {
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

function MessageToolbar({
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
      <Button variant="ghost" size="icon-sm" onClick={onCopy} title={copied ? "已复制" : "复制"}>
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
          <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
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
                    {getProviderDisplayName(provider)} / {model.name || model.id}
                  </span>
                </DropdownMenuItem>
              )),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        title="删除"
      >
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

type ConversationTurn = {
  user: AppChatMessage;
  replies: AppChatMessage[];
};

function buildConversationTurns(messages: AppChatMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  const turnByUserId = new Map<string, ConversationTurn>();

  messages.forEach((message, index) => {
    if (message.role === "user") {
      const turn = { user: message, replies: [] };
      turns.push(turn);
      turnByUserId.set(message.id, turn);
      return;
    }

    if (message.role !== "assistant") return;

    const sourceUserMessageId =
      message.metadata?.sourceUserMessageId ??
      messages[findPreviousUserMessageIndex(messages, index)]?.id;
    if (!sourceUserMessageId) return;

    const turn = turnByUserId.get(sourceUserMessageId);
    if (turn) {
      turn.replies.push(message);
    }
  });

  return turns;
}

function getSourceUserIndexForAssistant(
  messages: AppChatMessage[],
  assistantIndex: number,
) {
  const sourceUserMessageId = messages[assistantIndex]?.metadata?.sourceUserMessageId;
  if (sourceUserMessageId) {
    return messages.findIndex((message) => message.id === sourceUserMessageId);
  }

  return findPreviousUserMessageIndex(messages, assistantIndex);
}

function insertReplyForUser(
  messages: AppChatMessage[],
  sourceUserMessageId: string,
  reply: AppChatMessage,
) {
  const sourceUserIndex = messages.findIndex(
    (message) => message.id === sourceUserMessageId,
  );
  if (sourceUserIndex === -1) return [...messages, reply];

  let insertIndex = sourceUserIndex + 1;
  while (insertIndex < messages.length) {
    const message = messages[insertIndex];
    if (message.role === "user") break;
    if (
      message.role === "assistant" &&
      (message.metadata?.sourceUserMessageId === sourceUserMessageId ||
        !message.metadata?.sourceUserMessageId)
    ) {
      insertIndex++;
      continue;
    }
    break;
  }

  return [
    ...messages.slice(0, insertIndex),
    reply,
    ...messages.slice(insertIndex),
  ];
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
    (reply.metadata?.generatedBy === "mention" ? undefined : fallbackPrimaryProvider);

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

function createMessageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function canRegenerateFromMessage(
  messages: AppChatMessage[],
  messageIndex: number,
) {
  const message = messages[messageIndex];
  if (!message) return false;
  if (message.role === "user") return true;
  return findPreviousUserMessageIndex(messages, messageIndex) !== -1;
}

function findPreviousUserMessageIndex(
  messages: AppChatMessage[],
  beforeIndex: number,
) {
  for (let index = beforeIndex - 1; index >= 0; index--) {
    if (messages[index].role === "user") return index;
  }

  return -1;
}

function getMessageText(message: AppChatMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");
}

function updateMessageText(message: AppChatMessage, text: string): AppChatMessage {
  let updatedFirstTextPart = false;

  const parts = message.parts.map((part) => {
    if (part.type !== "text") return part;
    if (updatedFirstTextPart) return { ...part, text: "" };

    updatedFirstTextPart = true;
    return { ...part, text };
  });

  return { ...message, parts } as AppChatMessage;
}

function getChatErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "请检查 API Key、Base URL 和模型配置。";
}

function AssistantLoadingMessage() {
  return (
    <Message from="assistant">
      <MessageContent className="py-2">
        <LoadingDots />
      </MessageContent>
    </Message>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1 text-muted-foreground">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="size-2 rounded-full bg-current"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function TypewriterText({ text }: { text: string }) {
  return (
    <span className="inline-flex overflow-hidden text-xl text-foreground">
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.3,
            delay: i * 0.03,
            ease: "easeOut",
          }}
          className="inline-block whitespace-pre"
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}
