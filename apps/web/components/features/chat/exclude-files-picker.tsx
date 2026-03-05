'use client';

import { useState, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EyeOff, Ban, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Citation, FileRef } from '@/types/api';
import { FileExtBadge } from './attachment-pill';
import { useExcludeStore } from '@/hooks/useExcludeStore';

// ── ExcludeFilesPicker ────────────────────────────────────────────────────────

interface ExcludeFilesPickerProps {
  availableCitations?: Citation[];
  /** Files currently attached — these cannot also be excluded */
  attachments?: FileRef[];
}

export function ExcludeFilesPicker({
  availableCitations = [],
  attachments = [],
}: ExcludeFilesPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { excludedPaths, toggle, clearAll } = useExcludeStore();

  const excludedSet = useMemo(() => new Set(excludedPaths), [excludedPaths]);
  const attachedSet = useMemo(
    () => new Set(attachments.map((a) => a.file_path)),
    [attachments],
  );
  const count = excludedPaths.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableCitations;
    return availableCitations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
    );
  }, [availableCitations, query]);

  const handleToggle = (filePath: string) => {
    // Cannot exclude a file that is already attached
    if (attachedSet.has(filePath)) return;
    toggle(filePath);
  };

  const handleClearAll = () => clearAll();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'h-9 gap-1.5 rounded-full px-2.5 text-xs font-medium text-brand-link hover:bg-brand-new-chat-bg',
                  count > 0 &&
                    'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50',
                )}
              >
                <EyeOff className="h-3.5 w-3.5 shrink-0" />
                <span>Exclude</span>
                {count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {count}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Exclude files from search results</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-[340px] rounded-2xl border-(--brand-source-border) bg-card/98 dark:bg-card p-0 shadow-[0_20px_60px_-20px_rgba(244,63,94,0.18),0_20px_60px_-20px_rgba(102,88,204,0.18)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-(--brand-source-border) px-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40">
              <Ban className="h-3 w-3 text-rose-500" />
            </div>
            <span className="text-xs font-semibold text-(--brand-source-text)">
              Exclude from search
            </span>
          </div>
          {count > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 text-[10px] font-medium text-rose-500 transition-colors hover:text-rose-600"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        {availableCitations.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <EyeOff className="h-6 w-6 text-muted-foreground/25" />
            <p className="text-xs text-muted-foreground/50">
              No source files available yet
            </p>
            <p className="text-[10px] text-muted-foreground/35">
              Files will appear after your first search
            </p>
          </div>
        ) : (
          <>
            {/* ── Search ─────────────────────────────────────────────────── */}
            <div className="px-3 pb-2 pt-3">
              <div className="flex items-center gap-2 rounded-lg border border-(--brand-source-border) bg-brand-new-chat-bg px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                <input
                  type="text"
                  placeholder="Search files…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-(--brand-source-text) placeholder:text-muted-foreground/40 outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="shrink-0 text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ── File list ──────────────────────────────────────────────── */}
            <ScrollArea className="max-h-[260px]">
              <div className="space-y-0.5 px-3 pb-3">
                {filtered.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground/40">
                    No files match &quot;{query}&quot;
                  </p>
                ) : (
                  filtered.map((citation) => {
                    const isExcluded = excludedSet.has(citation.id);
                    const isAttached = attachedSet.has(citation.id);
                    const filename =
                      citation.id.split('/').pop() || citation.title;
                    const ext = filename.split('.').pop()?.toLowerCase();

                    return (
                      <button
                        key={citation.id}
                        type="button"
                        onClick={() => handleToggle(citation.id)}
                        disabled={isAttached}
                        title={
                          isAttached
                            ? 'Remove from attachments first'
                            : undefined
                        }
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all duration-150',
                          isAttached
                            ? 'cursor-not-allowed border-transparent opacity-40'
                            : isExcluded
                              ? 'border-rose-200/60 bg-rose-50 dark:border-rose-800/30 dark:bg-rose-950/20'
                              : 'border-transparent hover:bg-brand-new-chat-bg',
                        )}
                      >
                        {/* Toggle indicator */}
                        <div
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
                            isExcluded && !isAttached
                              ? 'border-rose-500 bg-rose-500 dark:border-rose-600 dark:bg-rose-600'
                              : 'border-(--brand-source-border)',
                          )}
                        >
                          {isExcluded && !isAttached && (
                            <X className="h-2 w-2 text-white" />
                          )}
                        </div>

                        <FileExtBadge ext={ext} />

                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span
                            className={cn(
                              'truncate text-xs font-medium leading-tight transition-colors',
                              isExcluded && !isAttached
                                ? 'text-rose-600 line-through dark:text-rose-400'
                                : 'text-(--brand-source-text)',
                            )}
                          >
                            {filename}
                          </span>
                          <span className="truncate text-[10px] text-(--brand-source-time)">
                            {isAttached
                              ? 'Attached — cannot exclude'
                              : citation.platform}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            {count > 0 && (
              <div className="flex items-center gap-1.5 border-t border-(--brand-source-border) px-4 py-2.5">
                <Ban className="h-3 w-3 text-rose-500" />
                <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                  {count} file{count !== 1 ? 's' : ''} excluded from search
                </span>
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
