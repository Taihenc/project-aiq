import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FeatureCards } from '@/components/features/chat/feature-cards';
import { ChatInput } from '@/components/features/chat/chat-input';
import React from 'react';
import type { ChatWelcomeProps } from '@/types';

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  onSendMessage,
  isLoading,
  attachments,
  onRemoveAttachment,
  onRemoveChunk,
  onAddAttachment,
  availableCitations,
}) => (
  <div className="flex flex-1 flex-col items-center justify-center">
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-baseline gap-3">
          <Avatar className="h-7 w-7">
            <AvatarImage
              src="/images/backgrounds/ai-profile.png"
              alt="AI Assistant"
            />
            <AvatarFallback className="bg-gradient-to-br from-[#a18fff] to-[#6f5deb] text-base font-semibold uppercase text-white">
              AI
            </AvatarFallback>
          </Avatar>
          <h2 className="text-primary-dark font-kiona text-4xl font-semibold">
            WHAT CAN I HELP WITH?
          </h2>
        </div>
        <p className="text-secondary text-base">
          Ask Anything with your personal knowledge Manager
        </p>
      </div>
      <FeatureCards />
      <div className="w-full max-w-3xl">
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={isLoading}
          attachments={attachments}
          onRemoveAttachment={onRemoveAttachment}
          onRemoveChunk={onRemoveChunk}
          onAddAttachment={onAddAttachment}
          availableCitations={availableCitations}
        />
      </div>
    </div>
  </div>
);
