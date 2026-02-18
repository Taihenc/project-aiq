'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/custom/sidebar';
import { ChatHeader } from '@/components/features/chat/chat-header';
import { ChatWelcome } from '@/components/features/chat/chat-welcome';
import { ChatMessagesArea } from '@/components/features/chat/chat-messages-area';
import { ChatInputArea } from '@/components/features/chat/chat-input-area';
import { CitationsPanel } from '@/components/features/chat/citations-panel';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { extractCitations } from '@/lib/utils/citations';
import { useHistory } from '@/hooks/useHistory';
import { useChatStore } from '@/lib/store/chat-store';
import type { FileRef } from '@/types';

interface ChatLayoutProps {
  initialChatId?: string;
}

export function ChatLayout({ initialChatId }: ChatLayoutProps) {
  const router = useRouter();
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const [citationsPanelOpen, setCitationsPanelOpen] = useState(false);
  const [attachments, setAttachments] = useState<FileRef[]>([]);

  const [currentChatId, setCurrentChatId] = useState<string | undefined>(
    initialChatId,
  );

  useEffect(() => {
    setCurrentChatId(initialChatId);
    useChatStore.getState().setCurrentChatId(initialChatId);
  }, [initialChatId]);

  const { history } = useHistory();

  const { messages, isLoading, sendMessage, sessionId } = useChatMessages({
    isDemoMode,
    initialMessages: [],
    chatId: currentChatId,
  });

  const shouldAutoScroll = !!currentChatId || !!sessionId;
  const messagesEndRef = useAutoScroll([messages, isLoading], shouldAutoScroll);
  const showWelcomeScreen = !currentChatId && messages.length === 0;

  // Find the current chat title from history
  const currentChat = history.find((h) => h.id === currentChatId);
  const currentTitle = currentChat?.title;

  const handleAddAttachment = useCallback((attachment: FileRef) => {
    setAttachments((prev) => {
      // Avoid duplicates by chunk_id
      const newChunkId = attachment.chunks[0]?.chunk_id;
      if (newChunkId && prev.some((a) => a.chunks[0]?.chunk_id === newChunkId)) return prev;
      return [...prev, attachment];
    });
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSendMessage = useCallback((message: string) => {
    sendMessage(message, attachments);
    setAttachments([]);
  }, [sendMessage, attachments]);

  const handleNewChat = () => {
    router.push('/');
  };

  const handleChatSelect = (id: string) => {
    router.push(`/c/${id}`);
  };

  return (
    <SidebarProvider className="bg-surface-purple">
      <Sidebar
        chatHistory={history}
        currentChatId={currentChatId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
      />

      <SidebarInset className="relative flex h-screen flex-1 flex-col overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,104,255,0.08)_0%,transparent_55%)]" />

        <ChatHeader onViewSources={() => setCitationsPanelOpen(true)} title={currentTitle} />

        <div className="relative z-0 flex flex-1 min-h-0 flex-col px-6 pt-2 sm:px-10 lg:px-12">
          {showWelcomeScreen ? (
            <ChatWelcome onSendMessage={sendMessage} isLoading={isLoading} />
          ) : (
            <ChatMessagesArea
              messages={messages}
              messagesEndRef={messagesEndRef}
              isLoading={isLoading}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              attachments={attachments}
            />
          )}
          {!showWelcomeScreen && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white/70 via-white/40 to-transparent" />
          )}
        </div>

        {!showWelcomeScreen && (
          <ChatInputArea
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            attachments={attachments}
            onRemoveAttachment={handleRemoveAttachment}
          />
        )}

        <CitationsPanel
          open={citationsPanelOpen}
          onOpenChange={setCitationsPanelOpen}
          citations={extractCitations(messages)}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
