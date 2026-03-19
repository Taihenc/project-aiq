'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  MessageSquare,
  FileText,
  Sparkles,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Clock,
  ChevronRight,
  ArrowLeft,
  Search,
  GitBranch,
} from 'lucide-react';
import { useBranchMapStore } from '@/hooks/useBranchMap';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useCommandStore } from '@/lib/store/command-store';
import { useChatStore } from '@/lib/store/chat-store';
import { useAuth } from '@/lib/auth/auth-context';

type Page = 'root' | 'chats';

export function CommandPalette() {
  const { open, setOpen } = useCommandStore();
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const toggleBranchMap = useBranchMapStore((s) => s.toggle);
  const isOnChatPage = pathname?.startsWith('/c/');
  const { logout } = useAuth();
  // Only subscribe to history while the dialog is open — avoids re-renders on
  // every chat store update when the palette is closed.
  const history = useChatStore((s) => (open ? s.history : null)) ?? [];

  const [pages, setPages] = useState<Page[]>(['root']);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPage = pages[pages.length - 1];
  const isNested = pages.length > 1;

  // ── Register ⌘K / Ctrl+K ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setOpen]);

  // ── Reset state when dialog closes ───────────────────────────────────────
  const handleOpenChange = useCallback(
    (value: boolean) => {
      setOpen(value);
      if (!value) {
        setPages(['root']);
        setInputValue('');
      }
    },
    [setOpen],
  );

  // ── Backspace on empty input → go back ───────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && inputValue === '' && isNested) {
        e.preventDefault();
        setPages((prev) => prev.slice(0, -1));
        setInputValue('');
      }
    },
    [inputValue, isNested],
  );

  // ── Navigate to a sub-page ────────────────────────────────────────────────
  const pushPage = useCallback((page: Page) => {
    setPages((prev) => [...prev, page]);
    setInputValue('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const run = useCallback(
    (action: () => void) => {
      handleOpenChange(false);
      setTimeout(action, 50);
    },
    [handleOpenChange],
  );

  const placeholder =
    currentPage === 'chats'
      ? 'Search chat history…'
      : 'Type a command or search…';

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Command Palette"
      description="Search commands, chats, and settings"
      showCloseButton={false}
      className="max-w-lg border border-[var(--brand-border-light)] shadow-2xl shadow-[var(--brand-surface-purple)]"
      commandClassName="bg-[var(--brand-surface-light)]"
    >
      {/* ── Breadcrumb header when nested ─────────────────────────────────── */}
      {isNested && (
        <div className="flex items-center gap-2 border-b border-[var(--brand-border-lighter)] bg-[var(--brand-card-purple)] px-3 py-2 text-xs text-[var(--brand-fg-secondary)]">
          <button
            onClick={() => {
              setPages((prev) => prev.slice(0, -1));
              setInputValue('');
            }}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--brand-new-chat-hover)] hover:text-[var(--brand-fg-dark)]"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <span className="opacity-40">/</span>
          <span className="font-semibold text-[var(--brand-fg-dark)]">
            {currentPage === 'chats' ? 'Chat History' : currentPage}
          </span>
          <span className="ml-auto opacity-50">↵ select · ⌫ back</span>
        </div>
      )}

      <CommandInput
        ref={inputRef}
        placeholder={placeholder}
        value={inputValue}
        onValueChange={setInputValue}
        onKeyDown={handleKeyDown}
      />

      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-8">
            <Search className="h-7 w-7 text-[var(--brand-fg-muted)]" />
            <p className="text-sm text-[var(--brand-fg-secondary)]">
              No results found
            </p>
          </div>
        </CommandEmpty>

        {/* ════════════════════════ ROOT PAGE ═══════════════════════════════ */}
        {currentPage === 'root' && (
          <>
            <CommandGroup heading="Navigation">
              <CommandItem
                value="new chat start"
                onSelect={() => run(() => router.push('/'))}
              >
                <MessageSquare className="mr-2 h-4 w-4 text-[var(--brand-fg-accent)]" />
                <span>New Chat</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="source browse"
                onSelect={() => run(() => router.push('/sources'))}
              >
                <FileText className="mr-2 h-4 w-4 text-[var(--brand-fg-accent)]" />
                <span>Sources</span>
              </CommandItem>
              <CommandItem value="prompt library" disabled>
                <Sparkles className="mr-2 h-4 w-4 opacity-30" />
                <span>Prompt Library</span>
                <span className="ml-auto rounded-full border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] px-2 py-0.5 text-[10px] font-medium text-[var(--brand-fg-secondary)]">
                  Soon
                </span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Chat">
              {isOnChatPage && (
                <CommandItem
                  value="open branch map conversation tree"
                  onSelect={() => run(() => toggleBranchMap())}
                >
                  <GitBranch className="mr-2 h-4 w-4 text-[var(--brand-fg-accent)]" />
                  <span>Open Branch Map</span>
                </CommandItem>
              )}
              <CommandItem
                value="search chat history past conversations"
                onSelect={() => pushPage('chats')}
              >
                <Clock className="mr-2 h-4 w-4 text-[var(--brand-fg-accent)]" />
                <span>Search Chat History</span>
                <ChevronRight className="ml-auto h-4 w-4 text-[var(--brand-fg-muted)]" />
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Appearance">
              <CommandItem
                value="theme light mode"
                onSelect={() => run(() => setTheme('light'))}
              >
                <Sun className="mr-2 h-4 w-4 text-amber-400" />
                <span>Light Mode</span>
              </CommandItem>
              <CommandItem
                value="theme dark mode"
                onSelect={() => run(() => setTheme('dark'))}
              >
                <Moon className="mr-2 h-4 w-4 text-indigo-400" />
                <span>Dark Mode</span>
              </CommandItem>
              <CommandItem
                value="theme system follow os"
                onSelect={() => run(() => setTheme('system'))}
              >
                <Monitor className="mr-2 h-4 w-4 text-[var(--brand-fg-secondary)]" />
                <span>System Theme</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Account">
              <CommandItem
                value="sign out logout"
                onSelect={() => run(() => logout())}
                className="text-red-500 data-[selected=true]:bg-red-50 data-[selected=true]:text-red-600 dark:data-[selected=true]:bg-red-950/30 dark:data-[selected=true]:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4 text-red-500" />
                <span>Sign Out</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* ════════════════════════ CHATS PAGE ══════════════════════════════ */}
        {currentPage === 'chats' && (
          <CommandGroup
            heading={`${history.length} conversation${history.length !== 1 ? 's' : ''}`}
          >
            {history.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--brand-fg-secondary)]">
                No chat history yet.
              </div>
            ) : (
              history.map((chat) => (
                <CommandItem
                  key={chat.id}
                  value={`${chat.title} ${chat.id}`}
                  onSelect={() => run(() => router.push(`/c/${chat.id}`))}
                >
                  <MessageSquare className="mr-2 h-4 w-4 shrink-0 text-[var(--brand-fg-accent)]" />
                  <span className="truncate">{chat.title}</span>
                  <CommandShortcut className="ml-auto shrink-0 text-[10px]">
                    {chat.timestamp}
                  </CommandShortcut>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        )}
      </CommandList>

      {/* ── Footer hint bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-[var(--brand-border-lighter)] bg-[var(--brand-card-purple)] px-3 py-2">
        <div className="flex items-center gap-3 text-[10px] text-[var(--brand-fg-muted)]">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] px-1 font-sans text-[var(--brand-fg-secondary)]">
              ↑↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] px-1 font-sans text-[var(--brand-fg-secondary)]">
              ↵
            </kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] px-1 font-sans text-[var(--brand-fg-secondary)]">
              esc
            </kbd>
            close
          </span>
        </div>
        <span className="text-[10px] font-medium text-[var(--brand-fg-muted)]">
          ⌘K
        </span>
      </div>
    </CommandDialog>
  );
}
