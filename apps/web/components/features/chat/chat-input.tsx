'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Globe, ArrowUp, X } from 'lucide-react';
import { useState, useRef } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import type { ChatInputProps } from '@/types';
import type { FileRef, ChunkMetadata } from '@/types/api';

// ── Small ext badge matching SourceCard's FileTypeIcon ────────────────────────
function FileExtBadge({ ext }: { ext: string | undefined }) {
  const colorMap: Record<string, string> = {
    pdf: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400',
    docx: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    doc: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    xlsx: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
    xls: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
    csv: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
    pptx: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
    ppt: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
    txt: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  const label = (ext?.toUpperCase() ?? 'FILE').slice(0, 4);
  const color =
    colorMap[ext?.toLowerCase() ?? ''] ??
    'bg-[var(--brand-citation-bg)] text-[var(--brand-citation-text)]';
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[8px] font-bold leading-none border border-current/10',
        color,
      )}
    >
      {label}
    </span>
  );
}

// ── Hover popup: page → chunk hierarchy ──────────────────────────────────────
function AttachmentHoverContent({ att }: { att: FileRef }) {
  const filename = att.file_path.split('/').pop() || att.file_path;
  const ext = att.file_path.split('.').pop()?.toLowerCase();

  // Group chunks by page
  const pageMap = new Map<number, ChunkMetadata[]>();
  for (const chunk of att.chunks) {
    const pg = chunk.page_number ?? 0;
    if (!pageMap.has(pg)) pageMap.set(pg, []);
    pageMap.get(pg)!.push(chunk);
  }
  const groupedPages = Array.from(pageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([page_number, chunks]) => ({ page_number, chunks }));

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-[var(--brand-source-border)]">
        <FileExtBadge ext={ext} />
        <div className="flex flex-col min-w-0">
          <span className="truncate text-xs font-semibold text-[var(--brand-source-text)] leading-tight">
            {filename}
          </span>
          <span className="text-[10px] text-[var(--brand-source-time)]">
            {att.chunks.length} chunk{att.chunks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Pages → Chunks */}
      <div className="flex flex-col gap-0 overflow-y-auto max-h-52">
        {groupedPages.map((page) => (
          <div key={page.page_number} className="flex flex-col">
            {/* Page badge row */}
            {page.page_number > 0 && (
              <div className="flex items-center gap-2 bg-[var(--brand-citation-bg)]/60 mx-3 mt-2 mb-1 rounded-md px-2 py-1">
                <Badge className="shrink-0 w-fit h-auto self-center rounded-full border border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--brand-citation-text)]">
                  Page {page.page_number}
                </Badge>
                <span className="text-[10px] text-[var(--brand-source-time)]">
                  {page.chunks.length} chunk
                  {page.chunks.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Chunk rows */}
            {page.chunks.map((chunk, ci) => (
              <div
                key={chunk.chunk_number || ci}
                className={cn(
                  'flex gap-2 px-3 py-2',
                  ci < page.chunks.length - 1 &&
                    'border-b border-[var(--brand-source-border)]/40',
                )}
              >
                <span className="mt-0.5 shrink-0 self-start rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[var(--brand-citation-text)]">
                  #{chunk.chunk_number || ci + 1}
                </span>
                <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-[var(--brand-content-text)] whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {chunk.content ?? (
                    <span className="italic text-[var(--brand-source-time)]">
                      No preview
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  attachments = [],
  onRemoveAttachment,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isExpanded = isFocused || message.length > 0 || attachments.length > 0;

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSendMessage?.(message);
      setMessage('');
      textAreaRef.current?.blur();
    }
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
              {attachments.map((att, index) => {
                const filename =
                  att.file_path.split('/').pop() || att.file_path;
                const ext = att.file_path.split('.').pop()?.toLowerCase();
                return (
                  <HoverCard
                    key={att.file_path || `att-${index}`}
                    openDelay={200}
                    closeDelay={100}
                  >
                    <HoverCardTrigger asChild>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-card-purple)] pl-1.5 pr-1 py-1 text-[11px] font-medium text-[var(--brand-link)] border border-[var(--brand-citation-border)] whitespace-nowrap cursor-pointer hover:bg-[var(--brand-new-chat-hover)] transition-colors">
                        <FileExtBadge ext={ext} />
                        <span className="max-w-[120px] truncate">
                          {filename}
                        </span>
                        <span className="text-[10px] text-[var(--brand-source-time)] font-normal">
                          {att.chunks.length}c
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveAttachment?.(index);
                          }}
                          className="ml-0.5 rounded-full p-0.5 text-[var(--brand-source-time)] hover:bg-[var(--brand-border-light)] hover:text-[var(--brand-source-text)] transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    </HoverCardTrigger>
                    <HoverCardContent
                      side="top"
                      align="start"
                      className="w-80 rounded-xl border-[var(--brand-source-border)] bg-card/98 dark:bg-card p-0 shadow-[0_20px_60px_-20px_rgba(102,88,204,0.35)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)] overflow-hidden"
                    >
                      <AttachmentHoverContent att={att} />
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          )}
          {/* Upper part - textarea */}
          <textarea
            ref={textAreaRef}
            placeholder="Ask anything..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            style={{
              height: isExpanded ? '72px' : '24px',
            }}
            className={cn(
              'w-full resize-none border-0 bg-transparent px-2 text-sm text-primary-dark placeholder:text-muted-purple focus:outline-none focus:ring-0 transition-all duration-300 ease-in-out',
              !isExpanded && 'overflow-hidden',
            )}
          />

          {/* Lower part - tools icons */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-pill h-9 w-9 text-[var(--brand-source-icon)] hover:bg-[var(--brand-new-chat-bg)]"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach file</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
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
            </TooltipProvider>
          </div>
        </div>

        {/* Right part - send button */}
        <div className="flex items-center">
          <Button
            size="icon-sm"
            className={cn(
              'animate-mesh-gradient rounded-pill text-white shadow-[0_20px_50px_-28px_rgba(111,93,235,1)] transition-all duration-300 ease-in-out hover:scale-105',
              isExpanded ? 'h-12 w-12' : 'h-10 w-10',
            )}
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
          >
            <ArrowUp className="size-5" />
          </Button>
        </div>
      </div>

      <p className="text-muted-purple text-center text-xs">
        Press Enter to send, Shift + Enter for newline
      </p>
    </div>
  );
}
