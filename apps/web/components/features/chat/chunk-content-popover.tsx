'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye, Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChunkMetadata } from '@/types/api';

export function ChunkContentPopover({
  chunk,
  chunkIndex,
  filename,
}: {
  chunk: ChunkMetadata;
  chunkIndex: number;
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasContent = !!chunk.content;

  // Reset expanded state when popover closes
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setExpanded(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                disabled={!hasContent}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-150',
                  open
                    ? 'bg-[var(--brand-link)]/15 text-[var(--brand-link)]'
                    : hasContent
                      ? 'text-[var(--brand-source-time)] hover:bg-[var(--brand-source-hover-bg)] hover:text-[var(--brand-source-text)]'
                      : 'text-[var(--brand-source-time)]/30 cursor-not-allowed',
                )}
                title={
                  hasContent ? 'View full content' : 'No content available'
                }
              >
                <Eye className="h-3 w-3" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{hasContent ? 'View chunk content' : 'No content available'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
        className="w-72 rounded-xl border-[var(--brand-source-border)] bg-card/98 dark:bg-card p-0 shadow-[0_16px_48px_-16px_rgba(102,88,204,0.4)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--brand-source-border)] px-3 py-2.5">
          <span className="rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[var(--brand-citation-text)] border border-[var(--brand-citation-border)]">
            #{chunk.chunk_number ?? chunkIndex + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--brand-source-text)]">
            {filename}
          </span>
          {chunk.page_number != null && chunk.page_number > 0 && (
            <span className="shrink-0 rounded-full bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[9px] font-medium text-[var(--brand-citation-text)] border border-[var(--brand-citation-border)]">
              p.{chunk.page_number}
            </span>
          )}
          {/* Expand / collapse button */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-full p-0.5 text-[var(--brand-source-time)] hover:bg-[var(--brand-source-hover-bg)] hover:text-[var(--brand-source-text)] transition-colors"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-full p-0.5 text-[var(--brand-source-time)] hover:bg-[var(--brand-source-hover-bg)] hover:text-[var(--brand-source-text)] transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        {/* Content */}
        <div
          className={cn(
            'overflow-y-auto custom-scrollbar px-3 py-2.5 transition-[max-height] duration-300 ease-in-out',
            expanded ? 'max-h-[60vh]' : 'max-h-40',
          )}
        >
          <p className="text-[11px] leading-relaxed text-[var(--brand-content-text)] whitespace-pre-wrap [overflow-wrap:anywhere]">
            {chunk.content}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
