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
import { historyApi } from '@/lib/api/history';
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
    setAttachments([]); // Clear attachments when switching chats
  }, [initialChatId]);

  const { history } = useHistory();

  const {
    messages,
    isLoading,
    sendMessage,
    sessionId,
    hasOlderMessages,
    loadOlderMessages,
    isLoadingOlder,
  } = useChatMessages({
    isDemoMode,
    initialMessages: [],
    chatId: currentChatId,
  });

  // Authentication & Session Guard logic
  // ---------------------------------------------------------

  // Lightweight session existence check — only used for the "not found" screen.
  // Does NOT block the main UI; the transitional cache keeps the switch smooth.
  const [sessionExists, setSessionExists] = useState<boolean | null>(null);
  useEffect(() => {
    if (!initialChatId) {
      setSessionExists(null);
      return;
    }
    if (isAuthLoading || !isAuthenticated) return;

    // Optimistic: if the chat is already in the loaded history, skip the API call
    const knownInHistory = history.some((h) => h.id === initialChatId);
    if (knownInHistory) {
      setSessionExists(true);
      return;
    }

    let cancelled = false;
    historyApi
      .checkSession(initialChatId)
      .then((exists) => {
        if (!cancelled) setSessionExists(exists);
      })
      .catch(() => {
        if (!cancelled) setSessionExists(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialChatId, isAuthenticated, isAuthLoading, history]);

  // Only show "not found" once we've confirmed the session doesn't exist.
  // While the check is in-flight (sessionExists === null), render the main UI
  // so the transitional message cache keeps the switch seamless.
  const showNotFound =
    !isAuthLoading && !!initialChatId && sessionExists === false;

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
      const existing = prev.find((a) => a.file_path === attachment.file_path);
      if (existing) {
        // Merge new chunks, dedupe by chunk_number
        const existingNums = new Set(
          existing.chunks.map((c) => c.chunk_number),
        );
        const newChunks = attachment.chunks.filter(
          (c) => !existingNums.has(c.chunk_number),
        );
        if (newChunks.length === 0) return prev;
        return prev.map((a) =>
          a.file_path === attachment.file_path
            ? { ...a, chunks: [...a.chunks, ...newChunks] }
            : a,
        );
      }
      return [...prev, attachment];
    });
  }, []);

  const handleRemoveChunk = useCallback(
    (filePath: string, chunkNumber: number) => {
      setAttachments((prev) =>
        prev.reduce<FileRef[]>((acc, a) => {
          if (a.file_path !== filePath) {
            acc.push(a);
          } else {
            const remaining = a.chunks.filter(
              (c) => c.chunk_number !== chunkNumber,
            );
            if (remaining.length > 0) acc.push({ ...a, chunks: remaining });
            // drop the entire FileRef if no chunks remain
          }
          return acc;
        }, []),
      );
    },
    [],
  );

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSendMessage = useCallback(
    (message: string, mode?: import('@/types/api').SearchMode) => {
      sendMessage(message, attachments, mode);
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

  // 1. Loading State Guard — only for initial auth, NOT for chat switches
  if (isAuthLoading) {
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

      <SidebarInset className="relative flex h-screen flex-1 flex-col overflow-hidden overscroll-none bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,104,255,0.08)_0%,transparent_55%)]" />

        <ChatHeader
          onViewSources={() => setCitationsPanelOpen(true)}
          title={currentTitle}
        />

        <div className="relative z-0 flex flex-1 min-h-0 flex-col px-6 pt-2 sm:px-10 lg:px-12">
          {showWelcomeScreen ? (
            <ChatWelcome
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          ) : (
            <ChatMessagesArea
              messages={messages}
              messagesEndRef={messagesEndRef}
              isLoading={isLoading}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              onRemoveChunk={handleRemoveChunk}
              attachments={attachments}
              hasOlderMessages={hasOlderMessages}
              isLoadingOlder={isLoadingOlder}
              onLoadOlder={loadOlderMessages}
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
            onRemoveChunk={handleRemoveChunk}
            onAddAttachment={handleAddAttachment}
            availableCitations={extractCitations(messages)}
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
