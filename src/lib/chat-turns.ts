import type { AppChatMessage } from "@/types";

export type ConversationTurn = {
  user: AppChatMessage;
  replies: AppChatMessage[];
};

export function buildConversationTurns(
  messages: AppChatMessage[],
): ConversationTurn[] {
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

export function getSourceUserIndexForAssistant(
  messages: AppChatMessage[],
  assistantIndex: number,
) {
  const sourceUserMessageId =
    messages[assistantIndex]?.metadata?.sourceUserMessageId;
  if (sourceUserMessageId) {
    return messages.findIndex((message) => message.id === sourceUserMessageId);
  }

  return findPreviousUserMessageIndex(messages, assistantIndex);
}

export function insertReplyForUser(
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

export function canRegenerateFromMessage(
  messages: AppChatMessage[],
  messageIndex: number,
) {
  const message = messages[messageIndex];
  if (!message) return false;
  if (message.role === "user") return true;
  return findPreviousUserMessageIndex(messages, messageIndex) !== -1;
}

export function findPreviousUserMessageIndex(
  messages: AppChatMessage[],
  beforeIndex: number,
) {
  for (let index = beforeIndex - 1; index >= 0; index--) {
    if (messages[index].role === "user") return index;
  }

  return -1;
}

export function createMessageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
