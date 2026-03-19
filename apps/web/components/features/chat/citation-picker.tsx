'use client';

import { useState, useRef, useMemo } from 'react';
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
import {
  ChevronDown,
  Check,
  Plus,
  Minus,
  Search,
  FileText,
  X,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createAttachmentFileRef,
  getAttachmentFileId,
  getCitationDisplayName,
  getCitationFileId,
  getFileExtensionFromName,
} from '@/lib/utils/file-identity';
import type { Citation, ChunkMetadata, FileRef } from '@/types/api';
import { FileExtBadge } from './attachment-pill';
import { ChunkContentPopover } from './chunk-content-popover';
import { AttachedChunksPreviewPopover } from './attached-chunks-preview-popover';

// ── CitationPickerItem ────────────────────────────────────────────────────────

export function CitationPickerItem({
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
  onRemoveChunk?: (fileId: string, chunkNumber: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const fileId = getCitationFileId(citation);
  const filename = getCitationDisplayName(citation);
  const ext = getFileExtensionFromName(filename, fileId);
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
            filePath={fileId}
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

// ── CitationPicker ────────────────────────────────────────────────────────────

export function CitationPicker({
  availableCitations = [],
  attachments = [],
  onAddAttachment,
  onRemoveAttachment,
  onRemoveChunk,
  disabled = false,
}: {
  availableCitations: Citation[];
  attachments: FileRef[];
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (fileId: string, chunkNumber: number) => void;
  disabled?: boolean;
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
        getCitationFileId(c).toLowerCase().includes(q) ||
        c.platform?.toLowerCase().includes(q),
    );
  }, [availableCitations, search]);

  const getAttachedChunks = (citation: Citation): ChunkMetadata[] =>
    attachments.find(
      (a) => getAttachmentFileId(a) === getCitationFileId(citation),
    )?.chunks ?? [];

  const handleToggleAll = (citation: Citation) => {
    const fileId = getCitationFileId(citation);
    const filePath = citation.id;
    const idx = attachments.findIndex((a) => getAttachmentFileId(a) === fileId);
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
      onAddAttachment?.(
        createAttachmentFileRef({ fileId, filePath, chunks: allChunks }),
      );
    }
  };

  const handleToggleChunk = (citation: Citation, chunk: ChunkMetadata) => {
    const fileId = getCitationFileId(citation);
    const filePath = citation.id;
    const isAttached = attachments
      .find((a) => getAttachmentFileId(a) === fileId)
      ?.chunks.some((c) => c.chunk_number === chunk.chunk_number);

    if (isAttached) {
      onRemoveChunk?.(fileId, chunk.chunk_number);
    } else {
      onAddAttachment?.(
        createAttachmentFileRef({ fileId, filePath, chunks: [chunk] }),
      );
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
                  (!hasAnyCitations || disabled) &&
                    'opacity-40 cursor-not-allowed',
                )}
                disabled={!hasAnyCitations || disabled}
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
            <span className="text-xs font-semibold text-[var(--brand-source-text)]">
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
        <div className="px-3 pb-2 pt-3">
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
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto custom-scrollbar p-2">
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
