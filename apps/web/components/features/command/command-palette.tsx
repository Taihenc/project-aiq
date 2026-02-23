'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

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
  const { setTheme } = useTheme();
  const { logout } = useAuth();
  const history = useChatStore((s) => s.history);

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

  function run(action: () => void) {
    handleOpenChange(false);
    setTimeout(action, 50);
  }

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
      className="max-w-lg"
    >
      {/* ── Breadcrumb header when nested ─────────────────────────────────── */}
      {isNested && (
        <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
          <button
            onClick={() => {
              setPages((prev) => prev.slice(0, -1));
              setInputValue('');
            }}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <span className="opacity-40">/</span>
          <span className="font-medium text-foreground">
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

      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results found.</CommandEmpty>

        {/* ════════════════════════ ROOT PAGE ═══════════════════════════════ */}
        {currentPage === 'root' && (
          <>
            <CommandGroup heading="Navigation">
              <CommandItem
                value="new chat start"
                onSelect={() => run(() => router.push('/'))}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>New Chat</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="source browse"
                onSelect={() => run(() => router.push('/sources'))}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Sources</span>
              </CommandItem>
              <CommandItem value="prompt library" disabled>
                <Sparkles className="mr-2 h-4 w-4 opacity-40" />
                <span className="opacity-40">Prompt Library</span>
                <CommandShortcut className="opacity-40">Soon</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Chat">
              <CommandItem
                value="search chat history past conversations"
                onSelect={() => pushPage('chats')}
              >
                <Clock className="mr-2 h-4 w-4" />
                <span>Search Chat History</span>
                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Appearance">
              <CommandItem
                value="theme light mode"
                onSelect={() => run(() => setTheme('light'))}
              >
                <Sun className="mr-2 h-4 w-4" />
                <span>Light Mode</span>
              </CommandItem>
              <CommandItem
                value="theme dark mode"
                onSelect={() => run(() => setTheme('dark'))}
              >
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark Mode</span>
              </CommandItem>
              <CommandItem
                value="theme system follow os"
                onSelect={() => run(() => setTheme('system'))}
              >
                <Monitor className="mr-2 h-4 w-4" />
                <span>System Theme</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Account">
              <CommandItem
                value="sign out logout"
                onSelect={() => run(() => logout())}
                className="text-red-500 data-[selected=true]:text-red-500"
              >
                <LogOut className="mr-2 h-4 w-4" />
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
              <div className="py-6 text-center text-sm text-muted-foreground">
                No chat history yet.
              </div>
            ) : (
              history.map((chat) => (
                <CommandItem
                  key={chat.id}
                  value={`${chat.title} ${chat.id}`}
                  onSelect={() => run(() => router.push(`/c/${chat.id}`))}
                >
                  <MessageSquare className="mr-2 h-4 w-4 shrink-0 opacity-60" />
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
    </CommandDialog>
  );
}
