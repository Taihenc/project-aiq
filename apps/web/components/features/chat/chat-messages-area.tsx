import { ChatMessage } from '@/components/features/chat/chat-message';
import { ThinkingIndicator } from '@/components/features/chat/thinking-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import React from 'react';
import type { ChatMessagesAreaProps } from '@/types';

export const ChatMessagesArea: React.FC<ChatMessagesAreaProps> = ({
  messages,
  messagesEndRef,
  isLoading,
  onAddAttachment,
  onRemoveAttachment,
  attachments,
}) => {
  // Check if we already have an assistant message that is "thinking" or "streaming"
  const hasThinkingAssistantMessage = messages.some(
    (m) => m.role === 'assistant' && (m.status || !m.content),
  );

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl space-y-6 pb-28">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            citations={message.citations}
            status={message.status}
            statusHistory={message.statusHistory}
            isEmpty={message.isEmpty}
            onAddAttachment={onAddAttachment}
            onRemoveAttachment={onRemoveAttachment}
            attachments={attachments}
          />
        ))}
        {isLoading && !hasThinkingAssistantMessage && (
          <ChatMessage
            key="loading-placeholder"
            role="assistant"
            content=""
            status="Thinking..."
          />
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};
