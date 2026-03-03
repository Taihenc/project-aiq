'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { X, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import type { FileRef, ChunkMetadata } from '@/types/api';

// ── Ext badge ────────────────────────────────────────────────────────────────

export function FileExtBadge({
  ext,
  size = 'sm',
}: {
  ext: string | undefined;
  size?: 'sm' | 'md';
}) {
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
        'flex shrink-0 items-center justify-center font-bold leading-none border border-current/10',
        size === 'md'
          ? 'h-8 w-8 rounded-md text-[9px]'
          : 'h-5 w-5 rounded text-[8px]',
        color,
      )}
    >
      {label}
    </span>
  );
}

// ── Hover popup: page → chunk hierarchy (with per-chunk remove) ───────────────

function AttachmentHoverContent({
  att,
  onRemoveChunk,
}: {
  att: FileRef;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const filename = att.file_path.split('/').pop() || att.file_path;
  const ext = att.file_path.split('.').pop()?.toLowerCase();

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
        <div className="flex flex-col min-w-0 flex-1">
          <span className="truncate text-xs font-semibold text-[var(--brand-source-text)] leading-tight">
            {filename}
          </span>
          <span className="text-[10px] text-[var(--brand-source-time)]">
            {att.chunks.length} chunk{att.chunks.length !== 1 ? 's' : ''}{' '}
            attached
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="shrink-0 rounded-md p-1 text-[var(--brand-source-time)] hover:bg-[var(--brand-source-hover-bg)] hover:text-[var(--brand-source-text)] transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand all chunks'}
        >
          {isExpanded ? (
            <ChevronsDownUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Pages → Chunks */}
      <div
        className={cn(
          'flex flex-col gap-0 overflow-y-auto custom-scrollbar transition-all duration-200',
          isExpanded ? 'max-h-[32rem]' : 'max-h-52',
        )}
      >
        {groupedPages.map((page) => (
          <div key={page.page_number} className="flex flex-col">
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

            {page.chunks.map((chunk, ci) => (
              <div
                key={chunk.chunk_number ?? ci}
                className={cn(
                  'group/chunk flex gap-2 px-3 py-2',
                  ci < page.chunks.length - 1 &&
                    'border-b border-[var(--brand-source-border)]/40',
                )}
              >
                <span className="mt-0.5 shrink-0 self-start rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[var(--brand-citation-text)]">
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
                      onRemoveChunk(att.file_path, chunk.chunk_number ?? ci + 1)
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
    </div>
  );
}

// ── Pill (trigger + hover card) ───────────────────────────────────────────────

export function AttachmentPill({
  att,
  index,
  onRemove,
  onRemoveChunk,
}: {
  att: FileRef;
  index: number;
  onRemove?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
}) {
  const filename = att.file_path.split('/').pop() || att.file_path;
  const ext = att.file_path.split('.').pop()?.toLowerCase();

  return (
    <HoverCard openDelay={200} closeDelay={150}>
      <HoverCardTrigger asChild>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-card-purple)] pl-1.5 pr-1 py-1 text-[11px] font-medium text-[var(--brand-link)] border border-[var(--brand-citation-border)] whitespace-nowrap cursor-pointer hover:bg-[var(--brand-new-chat-hover)] transition-colors">
          <FileExtBadge ext={ext} />
          <span className="max-w-[120px] truncate">{filename}</span>
          <span className="text-[10px] text-[var(--brand-source-time)] font-normal">
            {att.chunks.length}c
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(index);
            }}
            className="ml-0.5 rounded-full p-0.5 text-[var(--brand-source-time)] hover:bg-[var(--brand-border-light)] hover:text-[var(--brand-source-text)] transition-colors"
            title="Remove all chunks"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-80 rounded-xl border-[var(--brand-source-border)] bg-card/98 dark:bg-card p-0 shadow-[0_20px_60px_-20px_rgba(102,88,204,0.35)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
      >
        <AttachmentHoverContent att={att} onRemoveChunk={onRemoveChunk} />
      </HoverCardContent>
    </HoverCard>
  );
}
