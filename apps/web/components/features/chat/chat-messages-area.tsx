import { ChatMessage } from '@/components/features/chat/chat-message';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { RefObject } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    id: string;
    title: string;
    platform: string;
    content?: string;
  }>;
  metadata?: {
    model_used?: string;
    processing_time_ms?: number;
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
}

interface ChatMessagesAreaProps {
  messages: Message[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

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
          sources={message.sources}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  </ScrollArea>
);
