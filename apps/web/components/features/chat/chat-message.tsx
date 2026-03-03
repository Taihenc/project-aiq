'use client';

import type { ChatMessageProps } from '@/types';
import { UserChatBubble } from './user-chat-bubble';
import { AssistantChatBubble } from './assistant-chat-bubble';

export function ChatMessage({
  role,
  content,
  citations,
  status,
  statusHistory,
  isEmpty,
  isStreaming,
  sentAttachments,
  onAddAttachment,
  onRemoveAttachment,
  onRemoveChunk,
  attachments,
}: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <UserChatBubble content={content} sentAttachments={sentAttachments} />
      </div>
    );
  }

  return (
    <AssistantChatBubble
      content={content}
      status={status}
      statusHistory={statusHistory}
      isEmpty={isEmpty}
      isStreaming={isStreaming}
      citations={citations}
      onAddAttachment={onAddAttachment}
      onRemoveAttachment={onRemoveAttachment}
      onRemoveChunk={onRemoveChunk}
      attachments={attachments}
    />
  );
}
