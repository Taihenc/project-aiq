'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/custom/sidebar';
import { ChatHeader } from '@/components/features/chat/chat-header';
import { ChatWelcome } from '@/components/features/chat/chat-welcome';
import { ChatMessagesArea } from '@/components/features/chat/chat-messages-area';
import { ChatInputArea } from '@/components/features/chat/chat-input-area';
import { CitationsPanel } from '@/components/features/chat/citations-panel';
import { BranchMapPanel } from '@/components/features/chat/branch-map/branch-map-panel';
import { BranchMapPopoverContent } from '@/components/features/chat/branch-map/branch-map-popover';
import { BranchMapFullscreen } from '@/components/features/chat/branch-map/branch-map-fullscreen';
import { BranchMapTrigger } from '@/components/features/chat/branch-map/branch-map-trigger';
import {
  SourceExplorerPanel,
  SourceExplorerFullscreen,
  SourceExplorerPopoverContent,
  SourceExplorerTrigger,
} from '@/components/features/chat/source-explorer';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useBranchMap } from '@/hooks/useBranchMap';
import { useSourceExplorerStore } from '@/hooks/useSourceExplorer';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useHistory } from '@/hooks/useHistory';
import { useChatStore } from '@/lib/store/chat-store';
import { useAuth } from '@/lib/auth/auth-context';
import { Cookies } from '@/lib/utils/cookies';
import { NotFoundScreen } from '@/components/features/chat/not-found-screen';
import { ChatLoadingScreen } from '@/components/features/chat/chat-loading-screen';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { historyApi } from '@/lib/api/history';
import { useExcludeStore } from '@/hooks/useExcludeStore';
import { useSearchFilterStore } from '@/hooks/useSearchFilterStore';
import { getAttachmentFileId } from '@/lib/utils/file-identity';
import type { FileRef, ChatHistoryItem, UIMessage } from '@/types';

interface ChatLayoutProps {
  initialChatId?: string;
}

export function ChatLayout({ initialChatId }: ChatLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const [citationsPanelOpen, setCitationsPanelOpen] = useState(false);
  const [attachments, setAttachments] = useState<FileRef[]>([]);
  const branchMap = useBranchMap();
  const sourceExplorer = useSourceExplorerStore();
  const {
    remove: removeExcluded,
    clearAll: clearExcluded,
    initFrom: initExcluded,
  } = useExcludeStore();
  const { clearAll: clearFilter, initFrom: initFilter } =
    useSearchFilterStore();

  const [currentChatId, setCurrentChatId] = useState<string | undefined>(
    initialChatId,
  );

  useEffect(() => {
    setCurrentChatId(initialChatId);
    useChatStore.getState().setCurrentChatId(initialChatId);
    setAttachments([]); // Clear attachments when switching chats
    clearExcluded(); // Clear exclude list when switching chats
    clearFilter(); // Clear search filters when switching chats
  }, [initialChatId, clearExcluded, clearFilter]);

  const { history } = useHistory();

  const {
    messages,
    messageTree,
    activePath,
    isLoading,
    sendMessage,
    editUserMessage,
    regenerateResponse,
    navigateBranch,
    navigateToMessage,
    sessionId,
    hasOlderMessages,
    loadOlderMessages,
    isLoadingOlder,
    sessionAvailableCitations,
  } = useChatMessages({
    isDemoMode,
    initialMessages: [],
    chatId: currentChatId,
  });

  // Seed exclude + filter stores from the last user message once per chat load.
  // Uses a ref to avoid re-seeding on every subsequent message update.
  const seededForChatRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!currentChatId || messages.length === 0) return;
    if (seededForChatRef.current === currentChatId) return;
    seededForChatRef.current = currentChatId;

    const lastUserMsg = [...messages]
      .reverse()
      .find((m: UIMessage) => m.role === 'user' && m.searchFilter);
    if (!lastUserMsg?.searchFilter) return;

    const {
      exclude,
      exclude_file_ids,
      department,
      team,
      project,
      tags,
      file_type,
    } = lastUserMsg.searchFilter;
    if (exclude_file_ids?.length || exclude?.length) {
      initExcluded(exclude_file_ids ?? exclude ?? [], exclude);
    }
    const filterState = {
      department: department ?? '',
      team: team ?? '',
      project: project ?? '',
      tags: tags ?? [],
      file_type: file_type ?? '',
    };
    const hasFilter = Object.values(filterState).some((v) =>
      Array.isArray(v) ? v.length > 0 : !!v,
    );
    if (hasFilter) initFilter(filterState);
  }, [currentChatId, messages, initExcluded, initFilter]);

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

  const handleAddAttachment = useCallback(
    (attachment: FileRef) => {
      const attachmentFileId = getAttachmentFileId(attachment);
      removeExcluded(attachmentFileId, attachment.file_path);
      setAttachments((prev) => {
        const existing = prev.find(
          (a) => getAttachmentFileId(a) === attachmentFileId,
        );
        if (existing) {
          const existingNums = new Set(
            existing.chunks.map((c) => c.chunk_number),
          );
          const newChunks = attachment.chunks.filter(
            (c) => !existingNums.has(c.chunk_number),
          );
          if (newChunks.length === 0) return prev;
          return prev.map((a) =>
            getAttachmentFileId(a) === attachmentFileId
              ? { ...a, chunks: [...a.chunks, ...newChunks] }
              : a,
          );
        }
        return [...prev, attachment];
      });
    },
    [removeExcluded],
  );

  const handleRemoveChunk = useCallback(
    (fileId: string, chunkNumber: number) => {
      setAttachments((prev) =>
        prev.reduce<FileRef[]>((acc, a) => {
          if (getAttachmentFileId(a) !== fileId) {
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
    (
      message: string,
      mode?: import('@/types/api').SearchMode,
      filter?: import('@/types/api').SearchFilter,
    ) => {
      sendMessage(message, attachments, mode, filter);
      setAttachments([]);
    },
    [sendMessage, attachments],
  );

  const handleNewChat = () => {
    router.push('/');
  };

  const handleEditMessage = useCallback(
    (messageId: string, newContent: string, attachments?: FileRef[]) => {
      if (isLoading) return;
      editUserMessage(messageId, newContent, attachments);
    },
    [editUserMessage, isLoading],
  );

  const handleRegenerate = useCallback(
    (assistantMessageId: string) => {
      regenerateResponse(assistantMessageId);
    },
    [regenerateResponse],
  );

  const handleNavigateBranch = useCallback(
    (messageId: string, direction: 'prev' | 'next') => {
      if (isLoading) return;
      navigateBranch(messageId, direction);
    },
    [navigateBranch, isLoading],
  );

  const handleNavigateToMessage = useCallback(
    (messageId: string) => {
      if (isLoading) return;
      navigateToMessage(messageId);
    },
    [navigateToMessage, isLoading],
  );

  // Count leaf nodes = number of distinct conversation paths
  const branchCount = useMemo(() => {
    const childIds = new Set<string>();
    for (const m of messageTree.values()) {
      if (m.parentId) childIds.add(m.parentId);
    }
    let leaves = 0;
    for (const m of messageTree.values()) {
      if (!childIds.has(m.id)) leaves++;
    }
    return Math.max(1, leaves);
  }, [messageTree]);

  const handleChatSelect = (id: string) => {
    router.push(`/c/${id}`);
  };

  // 1. Loading State Guard — only for initial auth, NOT for chat switches
  if (isAuthLoading) {
    return <ChatLoadingScreen />;
  }

  // 2. Not Found Guard
  if (showNotFound) {
    return (
      <NotFoundScreen message="This chat you are looking for doesn't exist." />
    );
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

        {showWelcomeScreen ? (
          <div className="relative z-10 px-6 pt-4 sm:px-10 lg:px-12">
            <SidebarTrigger className="border-purple-light text-primary-light shadow-button hover:bg-surface-light rounded-pill border bg-background h-9 w-9 sm:h-10 sm:w-10" />
          </div>
        ) : (
          <ChatHeader
            onViewSources={() => setCitationsPanelOpen(true)}
            title={currentTitle}
          />
        )}

        <div className="relative z-0 flex flex-1 min-h-0 flex-col px-6 pt-2 sm:px-10 lg:px-12">
          {showWelcomeScreen ? (
            <ChatWelcome
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              attachments={attachments}
              onRemoveAttachment={handleRemoveAttachment}
              onRemoveChunk={handleRemoveChunk}
              onAddAttachment={handleAddAttachment}
              availableCitations={sessionAvailableCitations}
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
              onEditMessage={handleEditMessage}
              onRegenerate={handleRegenerate}
              onNavigateBranch={handleNavigateBranch}
              availableCitations={sessionAvailableCitations}
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
            availableCitations={sessionAvailableCitations}
          />
        )}

        <CitationsPanel
          open={citationsPanelOpen}
          onOpenChange={setCitationsPanelOpen}
          citations={sessionAvailableCitations}
        />

        {/* ── Bottom-right FAB stack ────────────────────────────────── */}
        <div className="fixed bottom-6 right-6 z-100 flex flex-col items-center gap-2.5">
          <Popover
            open={sourceExplorer.mode === 'popover'}
            onOpenChange={(open) => !open && sourceExplorer.close()}
          >
            <PopoverAnchor>
              <SourceExplorerTrigger />
            </PopoverAnchor>
            <PopoverContent
              side="top"
              align="end"
              sideOffset={12}
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="w-auto min-w-[65rem] max-w-[65rem] overflow-hidden rounded-2xl border-border bg-card p-0 shadow-[0_16px_40px_-12px_rgba(102,88,204,0.35)]"
            >
              <SourceExplorerPopoverContent
                attachments={attachments}
                availableCitations={sessionAvailableCitations}
                onAddAttachment={handleAddAttachment}
                onRemoveChunk={handleRemoveChunk}
              />
            </PopoverContent>
          </Popover>
          {messages.length > 0 && (
            <Popover
              open={branchMap.mode === 'popover'}
              onOpenChange={(open) => !open && branchMap.close()}
            >
              <PopoverAnchor>
                <BranchMapTrigger
                  onClick={branchMap.toggle}
                  isOpen={branchMap.isOpen}
                  branchCount={branchCount}
                />
              </PopoverAnchor>
              <PopoverContent
                side="top"
                align="end"
                sideOffset={12}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="w-auto overflow-hidden rounded-2xl border-border bg-brand-card-purple p-0 shadow-[0_16px_40px_-12px_rgba(102,88,204,0.35)]"
              >
                <BranchMapPopoverContent
                  messageTree={messageTree}
                  activePath={activePath}
                  branchCount={branchCount}
                  onNavigate={handleNavigateToMessage}
                  onDetach={branchMap.detach}
                  onFullscreen={branchMap.enterFullscreen}
                  onClose={branchMap.close}
                />
              </PopoverContent>
            </Popover>
          )}
          <ThemeToggle className="h-10 w-10 rounded-full border border-purple-light shadow-button bg-background hover:bg-surface-light" />
        </div>

        {/* ── Floating detached panel ───────────────────────────────── */}
        {branchMap.mode === 'floating' && (
          <BranchMapPanel
            isOpen={true}
            onClose={branchMap.close}
            onCollapse={branchMap.collapse}
            messageTree={messageTree}
            activePath={activePath}
            onNavigate={handleNavigateToMessage}
          />
        )}

        {/* ── Source Explorer floating panel ────────────────────────── */}
        <SourceExplorerPanel
          attachments={attachments}
          availableCitations={sessionAvailableCitations}
          onAddAttachment={handleAddAttachment}
          onRemoveChunk={handleRemoveChunk}
        />

        {/* ── Source Explorer fullscreen overlay ───────────────────────── */}
        <SourceExplorerFullscreen
          attachments={attachments}
          availableCitations={sessionAvailableCitations}
          onAddAttachment={handleAddAttachment}
          onRemoveChunk={handleRemoveChunk}
        />

        {/* ── Fullscreen overlay ─────────────────────────────────────── */}
        <BranchMapFullscreen
          isOpen={branchMap.mode === 'fullscreen'}
          messageTree={messageTree}
          activePath={activePath}
          branchCount={branchCount}
          onNavigate={handleNavigateToMessage}
          onClose={branchMap.close}
          onCollapse={branchMap.collapse}
          onDetach={branchMap.detach}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
