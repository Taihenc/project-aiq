import { motion, AnimatePresence } from 'motion/react';

import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SidebarProps } from '@/types';
import { useAuth } from '@/lib/auth/auth-context';
import { useChatStore } from '@/lib/store/chat-store';
import { useState } from 'react';
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
import { ThemeToggle } from '@/components/custom/theme-toggle';

export function Sidebar({
  chatHistory = [],
  currentChatId,
  onChatSelect,
  onNewChat,
}: SidebarProps) {
  const router = useRouter();
  const { user, login, logout, register } = useAuth();
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const displayHistory = chatHistory;

  return (
    <SidebarPrimitive
      collapsible="offcanvas"
      className="border-purple-lighter bg-brand-sidebar-bg border-r"
    >
      <SidebarHeader className="gap-0 px-6 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-purple rounded-card flex h-10 w-10 items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--brand-logo-label)]">
              AIQ
            </span>
            <span className="text-primary-dark font-kiona text-lg font-semibold">
              XHIVE
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-6 px-4 py-6 text-sm">
        <SidebarGroup className="gap-3">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Start a new chat"
                  onClick={onNewChat}
                  className="text-primary-light rounded-card flex h-12 w-full items-center justify-start gap-2 border border-transparent bg-brand-new-chat-bg px-4 py-3 shadow-none transition-colors hover:bg-brand-new-chat-hover"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Browse sources"
                  className="text-accent-purple rounded-card flex h-12 w-full items-center justify-start gap-2 px-4 py-3 hover:bg-background/60"
                >
                  <FileText className="h-4 w-4" />
                  <span>Source</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Open prompt library"
                  className="text-accent-purple rounded-card flex h-12 w-full items-center justify-start gap-2 px-4 py-3 hover:bg-background/60"
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
                      onClick={onNewChat}
                      className="text-[10px] text-brand-fg-accent hover:text-brand-fg-light transition-colors cursor-pointer"
                    >
                      Start a new chat
                    </button>
                  </div>
                ) : (
                  displayHistory.map((chat) => {
                    const isActive = currentChatId === chat.id;
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
                          onClick={() => onChatSelect?.(chat.id)}
                          className={cn(
                            'rounded-card relative flex h-12 w-full items-center justify-start gap-3 border border-transparent px-4 py-3 text-left text-sm transition-all hover:border-[var(--brand-blockquote-border)] hover:bg-card/70',
                            isActive &&
                              'shadow-elevated border-[var(--brand-citation-border)] bg-card text-primary-medium',
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
                              onClick={(_e) => {
                                _e.stopPropagation();
                                setChatToDelete(chat.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </motion.li>
                    );
                  })
                )}
              </AnimatePresence>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
            <div className="flex justify-center mb-1">
              <ThemeToggle className="w-full rounded-card hover:bg-brand-new-chat-bg" />
            </div>
            <div className="shadow-profile rounded-card flex items-center gap-3 bg-card/70 p-3">
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
