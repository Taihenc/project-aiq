import { motion, AnimatePresence } from 'motion/react';

import { useRouter, usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from '@/components/ui/sidebar';
import {
  MessageSquare,
  FileText,
  Sparkles,
  LogOut,
  Trash2,
  Command,
  Loader2,
} from 'lucide-react';
import { useCommandStore } from '@/lib/store/command-store';
import { cn } from '@/lib/utils';
import type {
  SidebarProps,
  ChatHistoryItem as ChatHistoryItemType,
} from '@/types';
import { useAuth } from '@/lib/auth/auth-context';
import { useChatStore } from '@/lib/store/chat-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { MoreVertical } from 'lucide-react';

// ── Memoized chat history item ──────────────────────────────────────────────
// Extracted so that only the two items that gain/lose `isActive` re-render
// when the current chat changes, instead of the entire list.
const ChatHistoryItem = memo(function ChatHistoryItem({
  chat,
  isActive,
  onSelect,
  onDelete,
}: {
  chat: ChatHistoryItemType;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const handleSelect = useCallback(
    () => onSelect(chat.id),
    [onSelect, chat.id],
  );
  const handleDeleteRequest = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(chat.id);
    },
    [onDelete, chat.id],
  );

  return (
    <motion.li
      key={chat.id}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group/menu-item relative"
    >
      <SidebarMenuButton
        tooltip={chat.title}
        isActive={isActive}
        onClick={handleSelect}
        className={cn(
          'rounded-card relative flex h-12 w-full items-center justify-start gap-3 border border-transparent bg-transparent px-4 py-3 text-left text-sm transition-all hover:border-[var(--brand-blockquote-border)] hover:bg-brand-new-chat-hover',
          isActive &&
            'border-[var(--brand-citation-border)] bg-brand-new-chat-bg text-primary-dark',
        )}
      >
        <MessageSquare className="h-4 w-4 text-[var(--brand-chat-icon)]" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-primary-medium truncate font-medium">
            {chat.title}
          </span>
          <span className="text-xs text-[var(--brand-chat-time)]">
            {chat.timestamp}
          </span>
        </div>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            showOnHover
            className="text-[var(--brand-action-menu)] hover:text-[var(--brand-action-menu-hover)]"
          >
            <MoreVertical className="h-4 w-4" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
            onClick={handleDeleteRequest}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.li>
  );
});

export function Sidebar({
  chatHistory = [],
  currentChatId,
  onChatSelect,
  onNewChat,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const displayHistory = chatHistory;
  const openCommand = useCommandStore((s) => s.setOpen);
  const hasMoreHistory = useChatStore((s) => s.hasMoreHistory);
  const isLoadingMoreHistory = useChatStore((s) => s.isLoadingMoreHistory);
  const fetchMoreHistory = useChatStore((s) => s.fetchMoreHistory);

  const handleChatSelect = useCallback(
    (id: string) => onChatSelect?.(id),
    [onChatSelect],
  );
  const handleChatDeleteRequest = useCallback(
    (id: string) => setChatToDelete(id),
    [],
  );

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    if (hasMoreHistory && !isLoadingMoreHistory) {
      fetchMoreHistory();
    }
  }, [hasMoreHistory, isLoadingMoreHistory, fetchMoreHistory]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const isOnSources = pathname === '/sources';

  return (
    <SidebarPrimitive
      collapsible="offcanvas"
      className="border-purple-lighter bg-brand-sidebar-bg border-r"
    >
      <SidebarHeader className="gap-0 px-6 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-purple rounded-card flex h-10 w-10 shrink-0 items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--brand-logo-label)]">
              AIQ
            </span>
            <span className="text-primary-dark font-kiona text-lg font-semibold">
              XHIVE
            </span>
          </div>
          <button
            onClick={() => openCommand(true)}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-md border border-[var(--brand-blockquote-border)] bg-transparent px-2 py-1 text-[10px] text-[var(--brand-history-label)] transition-colors hover:bg-brand-new-chat-hover"
            aria-label="Open command palette"
          >
            <Command className="h-3 w-3" />
            <span>K</span>
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden p-0">
        <ScrollArea className="h-full [&>[data-slot=scroll-area-viewport]>div]:!block">
          <div className="flex flex-col gap-6 px-4 py-6 text-sm">
            <SidebarGroup className="gap-3">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Start a new chat"
                      onClick={() => {
                        onNewChat?.();
                        if (isOnSources) router.push('/');
                      }}
                      className={cn(
                        'rounded-card flex h-12 w-full items-center justify-start gap-2 border border-transparent bg-transparent px-4 py-3 shadow-none transition-all text-secondary hover:border-[var(--brand-blockquote-border)] hover:bg-brand-new-chat-hover',
                        !isOnSources &&
                          !currentChatId &&
                          'border-[var(--brand-citation-border)] bg-brand-new-chat-bg text-primary-dark',
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium">New Chat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Browse data sources"
                      onClick={() => router.push('/sources')}
                      className={cn(
                        'rounded-card flex h-12 w-full items-center justify-start gap-2 border border-transparent bg-transparent px-4 py-3 shadow-none transition-all text-secondary hover:border-[var(--brand-blockquote-border)] hover:bg-brand-new-chat-hover',
                        isOnSources &&
                          'border-[var(--brand-citation-border)] bg-brand-new-chat-bg text-primary-dark',
                      )}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Source</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Open prompt library"
                      className="rounded-card flex h-12 w-full items-center justify-start gap-2 border border-transparent bg-transparent px-4 py-3 shadow-none transition-all text-secondary hover:border-[var(--brand-blockquote-border)] hover:bg-brand-new-chat-hover"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Prompt Library</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="gap-3">
              <SidebarGroupLabel className="text-[var(--brand-history-label)]">
                Chat History
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-2">
                  <AnimatePresence initial={false}>
                    {displayHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="bg-brand-card-purple rounded-full p-3 mb-3">
                          <MessageSquare className="h-5 w-5 text-brand-fg-muted" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground mb-1">
                          No history yet
                        </span>
                        <button
                          onClick={() => {
                            onNewChat?.();
                            if (isOnSources) router.push('/');
                          }}
                          className="text-[10px] text-brand-fg-accent hover:text-brand-fg-light transition-colors cursor-pointer"
                        >
                          Start a new chat
                        </button>
                      </div>
                    ) : (
                      displayHistory.map((chat) => (
                        <ChatHistoryItem
                          key={chat.id}
                          chat={chat}
                          isActive={currentChatId === chat.id}
                          onSelect={handleChatSelect}
                          onDelete={handleChatDeleteRequest}
                        />
                      ))
                    )}
                  </AnimatePresence>
                  {/* Infinite scroll sentinel */}
                  {hasMoreHistory && (
                    <div ref={sentinelRef} className="flex justify-center py-3">
                      {isLoadingMoreHistory && (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-fg-muted" />
                      )}
                    </div>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        </ScrollArea>
      </SidebarContent>

      <AlertDialog
        open={!!chatToDelete}
        onOpenChange={(open) => !open && setChatToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => {
                if (chatToDelete) {
                  useChatStore
                    .getState()
                    .deleteSession(chatToDelete)
                    .then((wasCurrentChat) => {
                      toast.success('Chat deleted successfully');
                      if (wasCurrentChat) {
                        router.push('/');
                      }
                    })
                    .catch(() => toast.error('Failed to delete chat'));
                  setChatToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SidebarFooter className="px-6 pb-6">
        {user && (
          <>
            <div className="shadow-profile rounded-card flex items-center gap-3 bg-card/70 dark:bg-card p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={`https://ui-avatars.com/api/?name=${user.displayName}`}
                />
                <AvatarFallback className="bg-gradient-to-br from-[#9b88ff] to-[#6f5deb] text-white">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-semibold text-[var(--brand-user-name)] truncate">
                  {user.displayName}
                </span>
                <span className="text-xs text-[var(--brand-chat-time)] truncate">
                  {user.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-500"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
