'use client';

import { Button } from '@/components/ui/button';
import {
  Globe,
  ArrowUp,
  Search,
  Check,
  FileText,
  X,
  Plus,
  Paperclip,
  ChevronDown,
  Minus,
  Eye,
  Maximize2,
  Minimize2,
  ChevronsUpDown,
  ChevronsDownUp,
} from 'lucide-react';
import { useState, useRef, useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ChatInputProps } from '@/types';
import type { Citation, ChunkMetadata, FileRef } from '@/types/api';
import { AttachmentPill, FileExtBadge } from './attachment-pill';

// ── Chunk content preview popover ────────────────────────────────────────────

function ChunkContentPopover({
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
            'overflow-y-auto px-3 py-2.5 transition-[max-height] duration-300 ease-in-out',
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

// ── Per-citation row with expandable per-chunk toggles ────────────────────────

// ── Attached chunks preview popover (file-level, inside citation picker) ─────

function AttachedChunksPreviewPopover({
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

// ── Per-citation row with expandable per-chunk toggles ────────────────────────

function CitationPickerItem({
  citation,
  attachedChunks,
  onToggleAll,
  onToggleChunk,
  onRemoveChunk,
}: {
  citation: Citation;
  /** The ChunkMetadata currently attached for this citation's file (may be empty) */
  attachedChunks: ChunkMetadata[];
  onToggleAll: () => void;
  onToggleChunk: (chunk: ChunkMetadata) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const filename =
    citation.id.split('/').pop() || citation.title || citation.id;
  const ext = filename.split('.').pop()?.toLowerCase();
  const allChunks: ChunkMetadata[] = citation.chunks ?? [];

  const attachedNums = new Set(attachedChunks.map((c) => c.chunk_number));
  const attachedCount = attachedChunks.length;
  const totalCount = allChunks.length;
  const isAllAttached = totalCount > 0 && attachedCount === totalCount;
  const isSomeAttached = attachedCount > 0 && attachedCount < totalCount;
  const isAnyAttached = attachedCount > 0;

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-150',
        isAnyAttached
          ? 'border-emerald-300/50 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20'
          : 'border-transparent hover:border-[var(--brand-source-border)]',
      )}
    >
      {/* File row */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--brand-new-chat-bg)]">
        {/* Expand/collapse toggle — only show when there are chunks */}
        {allChunks.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--brand-source-time)] hover:bg-[var(--brand-source-hover-bg)] hover:text-[var(--brand-source-text)] transition-colors"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                expanded && 'rotate-180',
              )}
            />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}

        {/* File badge */}
        <FileExtBadge ext={ext} />

        {/* File info — clicking toggles all */}
        <button
          type="button"
          onClick={onToggleAll}
          className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
        >
          <span className="truncate text-xs font-medium leading-tight text-[var(--brand-source-text)]">
            {filename}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--brand-citation-text)] border border-[var(--brand-citation-border)]">
              {citation.platform}
            </span>
            {totalCount > 0 && (
              <span
                className={cn(
                  'text-[10px]',
                  isAnyAttached
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-[var(--brand-source-time)]',
                )}
              >
                {isAnyAttached
                  ? `${attachedCount}/${totalCount} chunks`
                  : `${totalCount} chunk${totalCount !== 1 ? 's' : ''}`}
              </span>
            )}
          </div>
        </button>

        {/* Attached chunks preview — only when something is attached */}
        {isAnyAttached && (
          <AttachedChunksPreviewPopover
            attachedChunks={attachedChunks}
            filename={filename}
            ext={ext}
            filePath={citation.id}
            onRemoveChunk={onRemoveChunk}
          />
        )}

        {/* Attach-all / remove-all button */}
        <button
          type="button"
          onClick={onToggleAll}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-150',
            isAllAttached
              ? 'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-400/20 dark:text-emerald-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400'
              : isSomeAttached
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-[var(--brand-link)]/10 hover:text-[var(--brand-link)]'
                : 'bg-[var(--brand-citation-bg)] text-[var(--brand-source-time)] hover:bg-[var(--brand-link)]/10 hover:text-[var(--brand-link)]',
          )}
          title={isAllAttached ? 'Remove all chunks' : 'Attach all chunks'}
        >
          {isAllAttached ? (
            <Check className="h-3 w-3" />
          ) : isSomeAttached ? (
            <Minus className="h-3 w-3" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Expandable chunk list */}
      {expanded && allChunks.length > 0 && (
        <div className="flex flex-col border-t border-[var(--brand-source-border)]/50 pb-1">
          {allChunks.map((chunk, ci) => {
            const isChunkAttached = attachedNums.has(chunk.chunk_number);
            return (
              <div
                key={chunk.chunk_number ?? ci}
                className={cn(
                  'group/chunk flex items-start gap-2 px-4 py-2 transition-colors',
                  isChunkAttached
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-red-50/60 dark:hover:bg-red-950/20'
                    : 'hover:bg-[var(--brand-new-chat-bg)]',
                  ci < allChunks.length - 1 &&
                    'border-b border-[var(--brand-source-border)]/30',
                )}
              >
                {/* Clickable toggle area */}
                <button
                  type="button"
                  onClick={() => onToggleChunk(chunk)}
                  className={cn(
                    'flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-left',
                    isChunkAttached
                      ? 'hover:text-red-500'
                      : 'hover:text-[var(--brand-link)]',
                  )}
                  title={
                    isChunkAttached ? 'Remove this chunk' : 'Attach this chunk'
                  }
                >
                  {/* Chunk number badge */}
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none',
                      isChunkAttached
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'
                        : 'bg-[var(--brand-citation-bg)] text-[var(--brand-citation-text)]',
                    )}
                  >
                    #{chunk.chunk_number ?? ci + 1}
                  </span>

                  {/* Chunk preview */}
                  <p className="min-w-0 flex-1 truncate text-[10px] leading-relaxed text-[var(--brand-content-text)]">
                    {chunk.content ?? (
                      <span className="italic text-[var(--brand-source-time)]">
                        No preview
                      </span>
                    )}
                  </p>
                </button>

                {/* View content button — outside the toggle button to avoid nesting */}
                <ChunkContentPopover
                  chunk={chunk}
                  chunkIndex={ci}
                  filename={filename}
                />

                {/* Status icon — outside the toggle button */}
                <button
                  type="button"
                  onClick={() => onToggleChunk(chunk)}
                  className={cn(
                    'mt-0.5 shrink-0 transition-colors',
                    isChunkAttached
                      ? 'text-emerald-500 hover:text-red-400'
                      : 'text-[var(--brand-source-time)] hover:text-[var(--brand-link)]',
                  )}
                  title={
                    isChunkAttached ? 'Remove this chunk' : 'Attach this chunk'
                  }
                >
                  {isChunkAttached ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Citation picker popover ───────────────────────────────────────────────────

function CitationPicker({
  availableCitations = [],
  attachments = [],
  onAddAttachment,
  onRemoveAttachment,
  onRemoveChunk,
}: {
  availableCitations: Citation[];
  attachments: FileRef[];
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Total attached chunk count across all files
  const totalAttachedChunks = useMemo(
    () => attachments.reduce((n, a) => n + a.chunks.length, 0),
    [attachments],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return availableCitations;
    return availableCitations.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.platform?.toLowerCase().includes(q),
    );
  }, [availableCitations, search]);

  const getAttachedChunks = (citation: Citation): ChunkMetadata[] =>
    attachments.find((a) => a.file_path === citation.id)?.chunks ?? [];

  const handleToggleAll = (citation: Citation) => {
    const idx = attachments.findIndex((a) => a.file_path === citation.id);
    const allChunks = citation.chunks ?? [];
    const attached = idx !== -1 ? attachments[idx] : null;
    const isAllAttached =
      allChunks.length > 0 &&
      allChunks.every((c) =>
        attached?.chunks.some((ac) => ac.chunk_number === c.chunk_number),
      );

    if (isAllAttached) {
      onRemoveAttachment?.(idx);
    } else {
      onAddAttachment?.({ file_path: citation.id, chunks: allChunks });
    }
  };

  const handleToggleChunk = (citation: Citation, chunk: ChunkMetadata) => {
    const isAttached = attachments
      .find((a) => a.file_path === citation.id)
      ?.chunks.some((c) => c.chunk_number === chunk.chunk_number);

    if (isAttached) {
      onRemoveChunk?.(citation.id, chunk.chunk_number);
    } else {
      onAddAttachment?.({ file_path: citation.id, chunks: [chunk] });
    }
  };

  const hasAnyCitations = availableCitations.length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setTimeout(() => searchRef.current?.focus(), 50);
        else setSearch('');
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  'relative rounded-pill h-9 w-9 transition-colors duration-150',
                  open
                    ? 'bg-[var(--brand-link)]/10 text-[var(--brand-link)]'
                    : 'text-[var(--brand-source-icon)] hover:bg-[var(--brand-new-chat-bg)]',
                  !hasAnyCitations && 'opacity-40 cursor-not-allowed',
                )}
                disabled={!hasAnyCitations}
                aria-label="Attach from sources"
              >
                <Paperclip className="h-4 w-4" />
                {totalAttachedChunks > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-link)] text-[9px] font-bold leading-none text-white shadow-sm">
                    {totalAttachedChunks > 9 ? '9+' : totalAttachedChunks}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {hasAnyCitations
                ? 'Attach from sources'
                : 'No sources available yet'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-[22rem] rounded-2xl border-[var(--brand-source-border)] bg-card/98 dark:bg-card p-0 shadow-[0_20px_60px_-20px_rgba(102,88,204,0.35)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--brand-source-border)] px-4 pt-3.5 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-[var(--brand-link)]" />
            <span className="text-sm font-semibold text-[var(--brand-source-text)]">
              Attach from sources
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {totalAttachedChunks > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                {totalAttachedChunks} attached
              </span>
            )}
            <span className="rounded-full bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--brand-citation-text)] border border-[var(--brand-citation-border)]">
              {availableCitations.length} source
              {availableCitations.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--brand-source-border)] px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--brand-new-chat-bg)] px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--brand-source-time)]" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search sources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[var(--brand-source-text)] placeholder:text-[var(--brand-source-time)] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="shrink-0 text-[var(--brand-source-time)] hover:text-[var(--brand-source-text)] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Citation list */}
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
              <Search className="h-6 w-6 text-[var(--brand-source-time)]/50" />
              <p className="text-xs text-[var(--brand-source-time)]">
                {search
                  ? 'No sources match your search.'
                  : 'No sources available.'}
              </p>
            </div>
          ) : (
            filtered.map((citation) => (
              <CitationPickerItem
                key={citation.id}
                citation={citation}
                attachedChunks={getAttachedChunks(citation)}
                onToggleAll={() => handleToggleAll(citation)}
                onToggleChunk={(chunk) => handleToggleChunk(citation, chunk)}
                onRemoveChunk={onRemoveChunk}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
            {/* Citation / attachment picker */}
            <CitationPicker
              availableCitations={availableCitations}
              attachments={attachments}
              onAddAttachment={onAddAttachment}
              onRemoveAttachment={onRemoveAttachment}
              onRemoveChunk={onRemoveChunk}
            />

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
