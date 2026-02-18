import { ChatInput } from '@/components/features/chat/chat-input';
import React from 'react';
import type { ChatInputAreaProps } from '@/types';

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  onSendMessage,
  isLoading,
  attachments,
  onRemoveAttachment,
}) => (
  <div className="relative z-10 bg-white px-6 pb-2 sm:px-10 lg:px-12">
    <div className="pointer-events-none absolute inset-x-0 -top-3 h-3 bg-gradient-to-b from-transparent via-white/20 to-white/65" />
    <div className="relative z-10 mx-auto max-w-3xl">
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={isLoading}
        attachments={attachments}
        onRemoveAttachment={onRemoveAttachment}
      />
    </div>
  </div>
);
