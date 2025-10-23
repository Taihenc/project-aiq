import { ChatMessage } from '@/components/features/chat/chat-message';
import { ScrollArea } from '@/components/ui/scroll-area';
import React from 'react';
import type { ChatMessagesAreaProps } from '@/types';

export const ChatMessagesArea: React.FC<ChatMessagesAreaProps> = ({
  messages,
  messagesEndRef,
}) => (
  <ScrollArea className="h-full">
    <div className="mx-auto max-w-3xl space-y-6 pb-28">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          role={message.role}
          content={message.content}
          citations={message.citations}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  </ScrollArea>
);
