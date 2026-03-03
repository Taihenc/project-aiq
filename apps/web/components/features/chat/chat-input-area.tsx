import { ChatInput } from '@/components/features/chat/chat-input';
import React from 'react';
import type { ChatInputAreaProps } from '@/types';
import type { SearchMode } from '@/types/api';

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSendMessage,
  isLoading,
  attachments,
  onRemoveAttachment,
  onRemoveChunk,
  onAddAttachment,
  availableCitations,
}) => (
  <div className="relative z-10 bg-background px-6 pb-2 sm:px-10 lg:px-12">
    <div className="pointer-events-none absolute inset-x-0 -top-3 h-3 bg-gradient-to-b from-transparent via-background/20 to-background/65" />
    <div className="relative z-10 mx-auto max-w-3xl">
      <ChatInput
        onSendMessage={(message: string, mode?: SearchMode) =>
          onSendMessage(message, mode)
        }
        disabled={isLoading}
        attachments={attachments}
        onRemoveAttachment={onRemoveAttachment}
        onRemoveChunk={onRemoveChunk}
        onAddAttachment={onAddAttachment}
        availableCitations={availableCitations}
      />
    </div>
  </div>
);
