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
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
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
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { useChat } from "@ai-sdk/react";
import { DirectChatTransport, ToolLoopAgent } from "ai";
import {
  CheckIcon,
  ClipboardCheckIcon,
  LightbulbIcon,
  CopyIcon,
  EraserIcon,
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

const reasoningModeLabels: Record<ReasoningMode, string> = {
  auto: "自动",
  off: "关闭",
  on: "开启",
};

type ChatProps = {
  assistant: AssistantConfig;
  providers: ModelProviderConfig[];
  provider?: ModelProviderConfig;
  models: ModelConfig[];
  model: string;
  messages: AppChatMessage[];
  messageFontSize: number;
  reasoningMode: ReasoningMode;
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
        instructions: assistant.systemPrompt,
        providerOptions: reasoningProviderOptions,
      }),
    [
      assistant.systemPrompt,
      effectiveModel,
      effectiveProvider,
      reasoningProviderOptions,
    ],
  );

  const transport = useMemo(
    () => new DirectChatTransport({ agent, sendReasoning: true }),
    [agent],
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
      setMessages((current) =>
        current.filter((message) => message.id !== messageId),
      );
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
      if (!message.text?.trim()) return;
      if (!hasConfiguredModel) {
        toast.error("请在设置中配置模型");
        return;
      }
      sendMessage({ text: message.text });
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
          {messages.map((message, messageIndex) => (
            <Message from={message.role} key={message.id}>
              <MessageContent
                className="text-[length:var(--chat-message-font-size)]"
                style={
                  {
                    "--chat-message-font-size": `${messageFontSize}px`,
                  } as CSSProperties
                }
              >
                {message.parts.map((part, index) => {
                  if (part.type === "reasoning") {
                    const isLastMessage =
                      messageIndex === messages.length - 1;
                    return (
                      <Reasoning
                        key={index}
                        isStreaming={
                          isLastMessage && status === "streaming"
                        }
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  }
                  if (part.type === "text") {
                    return (
                      <MessageResponse key={index}>{part.text}</MessageResponse>
                    );
                  }
                  return null;
                })}
              </MessageContent>
              <MessageToolbar
                align={message.role === "user" ? "end" : "start"}
                canRegenerate={canRegenerateFromMessage(messages, messageIndex)}
                disabled={status === "submitted" || status === "streaming"}
                canEdit={message.role === "user"}
                copied={copiedMessageId === message.id}
                onCopy={() => handleCopyMessage(message)}
                onDelete={() => handleDeleteMessage(message.id)}
                onEdit={() =>
                  setEditingMessage({
                    id: message.id,
                    role: message.role,
                    text: getMessageText(message),
                  })
                }
                onRegenerate={() => handleRegenerate(message.id)}
              />
            </Message>
          ))}
          {isWaitingForAssistant && <AssistantLoadingMessage />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      )}

      {/* Welcome + Input area */}
      {messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-xl text-foreground">
          <TypewriterText key={assistant.id} text="⚡ Let's spark something new !" />
        </div>
      )}

      {/* Input area */}
      <div className="grid shrink-0 gap-4 pt-4">
        <div className="w-full pb-4">
          <PromptInput onSubmit={handleSubmit}>
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
                    <LightbulbIcon className="size-4" />
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

function MessageToolbar({
  align,
  canEdit,
  canRegenerate,
  copied,
  disabled,
  onCopy,
  onEdit,
  onDelete,
  onRegenerate,
}: {
  align: "start" | "end";
  canEdit: boolean;
  canRegenerate: boolean;
  copied: boolean;
  disabled: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        disabled={disabled}
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
        <div className="flex items-center gap-1.5 text-muted-foreground">
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
      </MessageContent>
    </Message>
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
