import { ChatMessage } from '@/components/features/chat/chat-message';
import { ScrollArea } from '@/components/ui/scroll-area';
import React, { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { ChatMessagesAreaProps } from '@/types';
import { Loader2 } from 'lucide-react';

export const ChatMessagesArea: React.FC<ChatMessagesAreaProps> = ({
  messages,
  messagesEndRef,
  isLoading,
  onAddAttachment,
  onRemoveAttachment,
  onRemoveChunk,
  attachments,
  hasOlderMessages,
  isLoadingOlder,
  onLoadOlder,
  onNavigateBranch,
  onEditMessage,
  onRegenerate,
  availableCitations,
}) => {
  // Check if we already have an assistant message that is "thinking" or "streaming"
  const hasThinkingAssistantMessage = messages.some(
    (m) => m.role === 'assistant' && (m.status || !m.content),
  );

  // Refs for scroll position preservation on prepend
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isPrependingRef = useRef(false);
  const prevFirstMsgIdRef = useRef<string | undefined>(undefined);

  // Detect when messages are prepended (first message ID changes)
  useEffect(() => {
    const firstId = messages[0]?.id;
    if (
      prevFirstMsgIdRef.current &&
      firstId &&
      prevFirstMsgIdRef.current !== firstId
    ) {
      // A prepend happened — capture scroll height before render paints
      isPrependingRef.current = true;
    }
    prevFirstMsgIdRef.current = firstId;
  }, [messages]);

  // Preserve scroll position after prepend using useLayoutEffect
  useLayoutEffect(() => {
    if (!isPrependingRef.current) return;
    isPrependingRef.current = false;

    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    ) as HTMLElement | null;
    if (!viewport) return;

    const newScrollHeight = viewport.scrollHeight;
    const addedHeight = newScrollHeight - prevScrollHeightRef.current;
    if (addedHeight > 0) {
      viewport.scrollTop += addedHeight;
    }
  }, [messages]);

  // Track scrollHeight before any potential prepend
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    ) as HTMLElement | null;
    if (viewport) {
      prevScrollHeightRef.current = viewport.scrollHeight;
    }
  });

  // IntersectionObserver sentinel for loading older messages
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadOlder = useCallback(() => {
    if (hasOlderMessages && !isLoadingOlder && onLoadOlder) {
      onLoadOlder();
    }
  }, [hasOlderMessages, isLoadingOlder, onLoadOlder]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadOlder();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadOlder]);

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className="mx-auto max-w-3xl flex flex-col gap-6 pb-28">
        {/* Older messages sentinel */}
        {hasOlderMessages && (
          <div ref={sentinelRef} className="flex justify-center py-3">
            {isLoadingOlder && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading older messages…</span>
              </div>
            )}
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            citations={message.citations}
            status={message.status}
            statusHistory={message.statusHistory}
            isEmpty={message.isEmpty}
            isStreaming={message.isStreaming}
            isError={message.isError}
            sentAttachments={message.sentAttachments}
            searchFilter={message.searchFilter}
            onAddAttachment={onAddAttachment}
            onRemoveAttachment={onRemoveAttachment}
            onRemoveChunk={onRemoveChunk}
            attachments={attachments}
            messageId={message.id}
            branchIndex={message.branchIndex}
            siblingCount={message.siblingCount}
            onNavigateBranch={onNavigateBranch}
            onEditMessage={onEditMessage}
            onRegenerate={onRegenerate}
            availableCitations={availableCitations}
            isLoading={isLoading}
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
