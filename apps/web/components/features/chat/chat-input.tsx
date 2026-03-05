'use client';

import { Button } from '@/components/ui/button';
import {
  Globe,
  ArrowUp,
  Sparkles,
  Search,
  FileText,
  MessageCircle,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ChatInputProps } from '@/types';
import type { SearchMode, SearchFilter } from '@/types/api';
import { AttachmentPill } from './attachment-pill';
import { CitationPicker } from './citation-picker';
import { ExcludeFilesPicker } from './exclude-files-picker';
import { useExcludeStore } from '@/hooks/useExcludeStore';

// ── Mode config ──────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<
  SearchMode,
  { label: string; icon: React.ElementType; description: string }
> = {
  auto: {
    label: 'Auto',
    icon: Sparkles,
    description: 'Picks the best strategy automatically',
  },
  search: {
    label: 'Search',
    icon: Search,
    description: 'Semantic vector search across documents',
  },
  lookup: {
    label: 'Lookup',
    icon: FileText,
    description: 'Fetch specific pages or chunks by reference',
  },
  chat: {
    label: 'Chat',
    icon: MessageCircle,
    description: 'Conversational — no document retrieval',
  },
};

// ── Main ChatInput ────────────────────────────────────────────────────────────

export function ChatInput({
  onSendMessage,
  disabled = false,
  attachments = [],
  onRemoveAttachment,
  onRemoveChunk,
  onAddAttachment,
  availableCitations = [],
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [mode, setMode] = useState<SearchMode>('auto');
  const [isSending, setIsSending] = useState(false);
  const [sendPulse, setSendPulse] = useState(false);
  const {
    excludedPaths,
    remove: removeExcluded,
    clearAll: clearExcludedPaths,
  } = useExcludeStore();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isExpanded = isFocused || message.length > 0 || attachments.length > 0;

  const handleBlur = (e: React.FocusEvent) => {
    // Keep expanded if focus moves to another element inside the input container
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    setIsFocused(false);
  };

  const handleSubmit = () => {
    if (message.trim() && !disabled && !isSending) {
      const filter: SearchFilter | undefined =
        excludedPaths.length > 0 ? { exclude: excludedPaths } : undefined;

      // Trigger launch + ring animations
      setIsSending(true);
      setSendPulse(true);

      // Fire the actual send immediately — animation is cosmetic overlay
      onSendMessage?.(message, mode, filter);
      clearExcludedPaths();
      textAreaRef.current?.blur();

      // Clear text after the launch animation settles
      setTimeout(() => {
        setMessage('');
        setIsSending(false);
      }, 160);
    }
  };

  // When a file is attached, auto-remove it from the exclude list
  const handleAddAttachment = (attachment: import('@/types/api').FileRef) => {
    removeExcluded(attachment.file_path);
    onAddAttachment?.(attachment);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className={cn(
          'flex items-center gap-3 border-purple-light rounded-[32px] bg-background/95 dark:bg-card shadow-[0_24px_70px_-38px_rgba(102,88,204,1)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] transition-all duration-300 ease-[cubic-bezier(0.68,0.02,0.21,1.67)]',
          isExpanded ? 'p-4' : 'p-3',
        )}
      >
        {/* Left part - contains attachments, textarea (upper) and tools (lower) */}
        <div className="flex flex-1 flex-col gap-3">
          {/* Attachment badges */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-2">
              {attachments.map((att, index) => (
                <AttachmentPill
                  key={att.file_path || `att-${index}`}
                  att={att}
                  index={index}
                  onRemove={onRemoveAttachment}
                  onRemoveChunk={onRemoveChunk}
                />
              ))}
            </div>
          )}
          {/* Upper part - textarea (wrapped for launch animation) */}
          <motion.div
            animate={
              isSending
                ? { scale: 0.95, y: -10, opacity: 0 }
                : { scale: 1, y: 0, opacity: 1 }
            }
            transition={
              isSending
                ? { duration: 0.14, ease: [0.4, 0, 0.6, 1] }
                : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <textarea
              ref={textAreaRef}
              placeholder="Ask anything..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={handleBlur}
              disabled={disabled || isSending}
              style={{
                height: isExpanded ? '72px' : '24px',
              }}
              className={cn(
                'w-full resize-none border-0 bg-transparent px-2 text-sm text-primary-dark placeholder:text-muted-purple focus:outline-none focus:ring-0 transition-all duration-300 ease-in-out',
                !isExpanded && 'overflow-hidden',
              )}
            />
          </motion.div>

          {/* Lower part - tools icons */}
          <div className="flex items-center gap-1">
            {/* Citation / attachment picker */}
            <CitationPicker
              availableCitations={availableCitations}
              attachments={attachments}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={onRemoveAttachment}
              onRemoveChunk={onRemoveChunk}
            />

            {/* Exclude files from search */}
            <ExcludeFilesPicker
              availableCitations={availableCitations}
              attachments={attachments}
            />

            {/* Search mode selector */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'h-9 gap-1.5 rounded-full px-2.5 text-xs font-medium text-[var(--brand-link)] hover:bg-[var(--brand-new-chat-bg)]',
                        mode !== 'auto' &&
                          'bg-[var(--brand-link)]/10 hover:bg-[var(--brand-link)]/15',
                      )}
                    >
                      {(() => {
                        const { icon: Icon, label } = MODE_CONFIG[mode];
                        return (
                          <>
                            <Icon className="h-3.5 w-3.5 shrink-0 text-inherit" />
                            <span>{label}</span>
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </>
                        );
                      })()}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Choose search strategy</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={12}
                className="min-w-[260px] rounded-2xl border-[var(--brand-source-border)] bg-card/98 dark:bg-card p-1.5 overflow-hidden shadow-[0_20px_60px_-20px_rgba(102,88,204,0.35)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
              >
                <DropdownMenuLabel className="flex items-center gap-2 -mx-1.5 -mt-1.5 border-b border-[var(--brand-source-border)] px-4 pb-3 pt-3.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--brand-link)]" />
                  <span className="text-xs font-semibold text-[var(--brand-source-text)]">
                    Search Mode
                  </span>
                </DropdownMenuLabel>
                {(
                  Object.entries(MODE_CONFIG) as [
                    SearchMode,
                    (typeof MODE_CONFIG)[SearchMode],
                  ][]
                ).map(([val, { label, icon: Icon, description }]) => {
                  const isActive = mode === val;
                  return (
                    <DropdownMenuItem
                      key={val}
                      onSelect={() => setMode(val)}
                      className={cn(
                        'rounded-xl px-3 py-2.5 cursor-pointer gap-3 focus:bg-[var(--brand-new-chat-bg)] focus:text-inherit',
                        isActive &&
                          'bg-[var(--brand-link)]/10 focus:bg-[var(--brand-link)]/15',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                          isActive
                            ? 'bg-[var(--brand-link)]/20 text-[var(--brand-link)]'
                            : 'bg-[var(--brand-new-chat-bg)] text-[var(--brand-source-icon)]',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 text-inherit" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={cn(
                            'text-xs font-semibold leading-tight',
                            isActive
                              ? 'text-[var(--brand-link)]'
                              : 'text-[var(--brand-source-text)]',
                          )}
                        >
                          {label}
                        </span>
                        <span className="text-[10px] leading-snug text-[var(--brand-source-time)]">
                          {description}
                        </span>
                      </div>
                      {isActive && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--brand-link)]" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-pill h-9 w-9 text-[var(--brand-source-icon)] hover:bg-[var(--brand-new-chat-bg)]"
                >
                  <Globe className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add source</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Right part - send button with ring burst */}
        <div className="flex items-center">
          <div className="relative">
            {/* Ring burst — expands and fades on send */}
            <AnimatePresence>
              {sendPulse && (
                <motion.span
                  className="pointer-events-none absolute inset-0 rounded-full bg-brand-fg-light"
                  initial={{ scale: 0.8, opacity: 0.55 }}
                  animate={{ scale: 2.6, opacity: 0 }}
                  exit={{}}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  onAnimationComplete={() => setSendPulse(false)}
                />
              )}
            </AnimatePresence>
            <Button
              size="icon-sm"
              className={cn(
                'animate-mesh-gradient rounded-pill text-white shadow-[0_20px_50px_-28px_rgba(111,93,235,1)] transition-all duration-300 ease-in-out hover:scale-105',
                isExpanded ? 'h-12 w-12' : 'h-10 w-10',
              )}
              onClick={handleSubmit}
              disabled={!message.trim() || disabled || isSending}
            >
              <ArrowUp className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      <p className="text-muted-purple text-center text-xs">
        Press Enter to send, Shift + Enter for newline
      </p>
    </div>
  );
}
