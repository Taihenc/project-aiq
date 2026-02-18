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
import { useAuth } from '@/lib/auth/auth-context';
import { Cookies } from '@/lib/utils/cookies';
import { NotFoundScreen } from '@/components/features/chat/not-found-screen';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import type { FileRef, ChatHistoryItem } from '@/types';

interface ChatLayoutProps {
  initialChatId?: string;
}

export function ChatLayout({ initialChatId }: ChatLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
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

  const { history, isLoading: isLoadingHistory } = useHistory();

  const { messages, isLoading, sendMessage, sessionId } = useChatMessages({
    isDemoMode,
    initialMessages: [],
    chatId: currentChatId,
  });

  // Authentication & Session Guard logic
  // ---------------------------------------------------------

  // Decide what screen to show
  const isHistoryEmpty = history.length === 0;
  const isDeterminingAccess =
    isAuthLoading || (initialChatId && isLoadingHistory && isHistoryEmpty);

  // A chat is "not found" if we're authenticated but the chat ID is not in history.
  const chatExistsInHistory = history.some((h) => h.id === initialChatId);
  const showNotFound =
    !isDeterminingAccess && !!initialChatId && !chatExistsInHistory;

  // Client-side guard: handles expired JWTs that bypass the middleware cookie check.
  useEffect(() => {
    if (isAuthLoading) return;

    // Check cookie as a backup to avoid race conditions during transitions.
    const hasToken = !!Cookies.get('auth_token');

    if (!isAuthenticated && !hasToken) {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Find the current chat title from history
  const currentChat = history.find(
    (h: ChatHistoryItem) => h.id === currentChatId,
  );
  const currentTitle = currentChat?.title;

  const shouldAutoScroll = !!currentChatId || !!sessionId;
  const messagesEndRef = useAutoScroll([messages, isLoading], shouldAutoScroll);
  const showWelcomeScreen = !currentChatId && messages.length === 0;

  const handleAddAttachment = useCallback((attachment: FileRef) => {
    setAttachments((prev) => {
      // Avoid duplicates by chunk_id
      const newChunkId = attachment.chunks[0]?.chunk_id;
      if (newChunkId && prev.some((a) => a.chunks[0]?.chunk_id === newChunkId))
        return prev;
      return [...prev, attachment];
    });
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSendMessage = useCallback(
    (message: string) => {
      sendMessage(message, attachments);
      setAttachments([]);
    },
    [sendMessage, attachments],
  );

  const handleNewChat = () => {
    router.push('/');
  };

  const handleChatSelect = (id: string) => {
    router.push(`/c/${id}`);
  };

  // 1. Loading State Guard
  if (
    isAuthLoading ||
    (initialChatId && isLoadingHistory && history.length === 0)
  ) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 border-4 border-[var(--brand-border-lighter)] border-t-[var(--brand-fg-light)] rounded-full animate-spin" />
          <p className="text-sm font-medium text-brand-fg-light/60 animate-pulse">
            Initializing AINGO Forge...
          </p>
        </div>
      </div>
    );
  }

  // 2. Not Found Guard
  if (showNotFound) {
    return <NotFoundScreen message="This chat either doesn't exist." />;
  }

  // 3. Main Interface
  return (
    <SidebarProvider className="bg-surface-purple">
      <Sidebar
        chatHistory={history}
        currentChatId={currentChatId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
      />

      <SidebarInset className="relative flex h-screen flex-1 flex-col overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,104,255,0.08)_0%,transparent_55%)]" />

        <ChatHeader
          onViewSources={() => setCitationsPanelOpen(true)}
          title={currentTitle}
        />

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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-background/70 via-background/40 to-transparent" />
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
        <div className="fixed bottom-6 right-6 z-[100]">
          <ThemeToggle className="h-10 w-10 rounded-full border border-purple-light shadow-button bg-background hover:bg-surface-light" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
