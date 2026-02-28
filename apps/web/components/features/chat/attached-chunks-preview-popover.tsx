'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Eye, X, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChunkMetadata } from '@/types/api';
import { FileExtBadge } from './attachment-pill';

export function AttachedChunksPreviewPopover({
  attachedChunks,
  filename,
  ext,
  onRemoveChunk,
  filePath,
}: {
  attachedChunks: ChunkMetadata[];
  filename: string;
  ext: string | undefined;
  filePath: string;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setExpanded(false);
  };

  const pageMap = new Map<number, ChunkMetadata[]>();
  for (const chunk of attachedChunks) {
    const pg = chunk.page_number ?? 0;
    if (!pageMap.has(pg)) pageMap.set(pg, []);
    pageMap.get(pg)!.push(chunk);
  }
  const groupedPages = Array.from(pageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([page_number, chunks]) => ({ page_number, chunks }));

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-150',
            open
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/50',
          )}
          title="Preview attached chunks"
        >
          <Eye className="h-3 w-3" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
        className="w-72 rounded-xl border-[var(--brand-source-border)] bg-card/98 dark:bg-card p-0 shadow-[0_16px_48px_-16px_rgba(102,88,204,0.4)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-[var(--brand-source-border)]">
          <FileExtBadge ext={ext} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-semibold text-[var(--brand-source-text)] leading-tight">
              {filename}
            </span>
            <span className="text-[10px] text-[var(--brand-source-time)]">
              {attachedChunks.length} chunk
              {attachedChunks.length !== 1 ? 's' : ''} attached
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-md p-1 text-[var(--brand-source-time)] hover:bg-[var(--brand-source-hover-bg)] hover:text-[var(--brand-source-text)] transition-colors"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronsDownUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
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

        {/* Pages → Chunks */}
        <div
          className={cn(
            'flex flex-col gap-0 overflow-y-auto transition-[max-height] duration-300 ease-in-out',
            expanded ? 'max-h-[60vh]' : 'max-h-52',
          )}
        >
          {groupedPages.map((page) => (
            <div key={page.page_number} className="flex flex-col">
              {page.page_number > 0 && (
                <div className="mx-3 mt-2 mb-1 flex items-center gap-2 rounded-md bg-[var(--brand-citation-bg)]/60 px-2 py-1">
                  <Badge className="h-auto w-fit shrink-0 self-center rounded-full border border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--brand-citation-text)]">
                    Page {page.page_number}
                  </Badge>
                  <span className="text-[10px] text-[var(--brand-source-time)]">
                    {page.chunks.length} chunk
                    {page.chunks.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {page.chunks.map((chunk, ci) => (
                <div
                  key={chunk.chunk_number ?? ci}
                  className={cn(
                    'group/chunk flex gap-2 px-3 py-2',
                    ci < page.chunks.length - 1 &&
                      'border-b border-[var(--brand-source-border)]/40',
                  )}
                >
                  <span className="mt-0.5 shrink-0 self-start rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                    #{chunk.chunk_number ?? ci + 1}
                  </span>
                  <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-[var(--brand-content-text)] whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {chunk.content ?? (
                      <span className="italic text-[var(--brand-source-time)]">
                        No preview
                      </span>
                    )}
                  </p>
                  {onRemoveChunk && (
                    <button
                      type="button"
                      onClick={() =>
                        onRemoveChunk(filePath, chunk.chunk_number ?? ci + 1)
                      }
                      className="mt-0.5 shrink-0 self-start rounded-full p-0.5 text-[var(--brand-source-time)] opacity-0 group-hover/chunk:opacity-100 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/40 dark:hover:text-red-400 transition-all"
                      title="Remove this chunk"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
