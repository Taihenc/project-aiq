'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plus, Check, LayoutGrid, EyeOff } from 'lucide-react';
import { useSourceExplorerStore } from '@/hooks/useSourceExplorer';
import { useExcludeStore } from '@/hooks/useExcludeStore';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Citation, ChunkMetadata, FileRef } from '@/types';
import { FileExtBadge } from './attachment-pill';

export function SourceCard({
  source,
  onAddAttachment,
  onRemoveAttachment,
  onRemoveChunk,
  attachments = [],
}: {
  source: Citation;
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
  attachments?: FileRef[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    open: openExplorer,
    openAtChunk,
    selectFile,
  } = useSourceExplorerStore();
  const {
    excludedPaths,
    toggle: toggleExclude,
    remove: removeExclude,
  } = useExcludeStore();

  const filePath = source.id;
  const chunks: ChunkMetadata[] = source.chunks ?? [];
  const ext = filePath.split('.').pop()?.toLowerCase();
  const isExcluded = excludedPaths.includes(filePath);

  // Current FileRef in attachments
  const currentAttachment = attachments.find((a) => a.file_path === filePath);

  const isChunkAttached = (chunkNumber: number) =>
    currentAttachment?.chunks.some((c) => c.chunk_number === chunkNumber) ??
    false;

  // Count only chunks that belong to THIS citation and are attached
  const attachedCount = chunks.filter((c) =>
    isChunkAttached(c.chunk_number),
  ).length;
  const isAnyAttached = attachedCount > 0;
  const isAllAttached = chunks.length > 0 && attachedCount === chunks.length;

  const handleToggleChunk = (c: ChunkMetadata) => {
    if (isChunkAttached(c.chunk_number)) {
      onRemoveChunk?.(filePath, c.chunk_number);
    } else {
      onAddAttachment?.({
        file_path: filePath,
        chunks: [
          {
            chunk_number: c.chunk_number,
            page_number: c.page_number,
            content: c.content,
          },
        ],
      });
    }
  };

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAllAttached) {
      const index = attachments.findIndex((a) => a.file_path === filePath);
      if (index !== -1) onRemoveAttachment?.(index);
    } else {
      // Attaching always clears any existing exclusion for this file
      removeExclude(filePath);
      onAddAttachment?.({
        file_path: filePath,
        chunks: chunks.map((c) => ({
          chunk_number: c.chunk_number,
          page_number: c.page_number,
          content: c.content,
        })),
      });
    }
  };

  // Group source.chunks by page_number for the expanded view
  const pageMap = new Map<number, ChunkMetadata[]>();
  for (const chunk of chunks) {
    const pg = chunk.page_number ?? 0;
    if (!pageMap.has(pg)) pageMap.set(pg, []);
    pageMap.get(pg)!.push(chunk);
  }
  const groupedPages = Array.from(pageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([page_number, pageChunks]) => ({ page_number, chunks: pageChunks }));

  return (
    <Card
      className={cn(
        'rounded-card overflow-hidden transition-colors duration-200',
        isAllAttached
          ? 'border-brand-attached-border bg-brand-attached-bg shadow-[0_20px_60px_-48px_rgba(72,187,120,0.4)] dark:shadow-none'
          : isAnyAttached
            ? 'border-brand-attached-border bg-card/95 dark:bg-card shadow-[0_20px_60px_-48px_rgba(72,187,120,0.25)] dark:shadow-none'
            : 'border-[var(--brand-source-border)] bg-card/95 dark:bg-card shadow-[0_20px_60px_-48px_rgba(102,88,204,0.6)] dark:shadow-none',
        !isOpen && isAnyAttached && 'hover:bg-brand-attached-hover-bg',
        !isOpen && !isAnyAttached && 'hover:bg-[var(--brand-source-hover-bg)]',
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* ── Header row ── */}
        <div
          className="group/source flex items-center"
          style={isOpen ? { marginBottom: '1rem' } : undefined}
        >
          {/*
           * ── File-type badge / Explorer shortcut ──────────────────────────
           * At rest: shows the file-extension badge.
           * On card hover: morphs into the "Open chunk heatmap" icon button.
           */}
          <div
            className="relative ml-4 shrink-0 cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              openExplorer();
              selectFile(filePath);
            }}
            title="Open in Source Explorer"
          >
            <div className="pointer-events-none transition-all duration-200 ease-out group-hover/source:opacity-0 group-hover/source:scale-90">
              <FileExtBadge ext={ext} size="md" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[var(--brand-source-attach-bg)] opacity-0 scale-90 ring-1 ring-inset ring-[var(--brand-link)]/20 transition-all duration-200 ease-out group-hover/source:opacity-100 group-hover/source:scale-100 hover:bg-[var(--brand-link)]/10">
              <LayoutGrid className="h-[1.05rem] w-[1.05rem] text-[var(--brand-link)]" />
            </div>
          </div>

          {/* ── Title + chevron trigger ── */}
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="group/trigger flex flex-1 min-w-0 items-center justify-between bg-transparent hover:bg-transparent pl-3 pr-3 py-3 text-[var(--brand-source-text)] transition-all duration-200"
            >
              <div className="flex flex-col items-start min-w-0">
                <span className="truncate text-sm font-medium text-[var(--brand-source-text)] leading-tight">
                  {source.title}
                </span>
                <span className="text-[11px] text-[var(--brand-source-time)]">
                  {source.platform}
                  {chunks.length > 0 &&
                    ` · ${chunks.length} chunk${chunks.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-[var(--brand-source-icon)] transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
            </Button>
          </CollapsibleTrigger>

          {/* ── Thin vertical divider ── */}
          <div className="h-6 w-px shrink-0 bg-[var(--brand-source-border)] opacity-40" />

          {/*
           * ── Fixed action zone (~76px) ──────────────────────────────────
           * Two absolutely-positioned layers cross-fade in the same space:
           *   Layer 1 (at rest)  — compact state indicators (count / exclude dot)
           *   Layer 2 (on hover) — interactive icon buttons
           */}
          <div className="relative flex h-full w-[76px] shrink-0 items-center justify-center">
            {/* Layer 1: state indicators */}
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none select-none transition-all duration-200 ease-out group-hover/source:opacity-0 group-hover/source:scale-75">
              {isAnyAttached ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {attachedCount}/{chunks.length}
                </span>
              ) : isExcluded ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30">
                  <EyeOff className="h-2.5 w-2.5 text-rose-500 dark:text-rose-400" />
                </span>
              ) : null}
            </div>

            {/* Layer 2: action buttons */}
            <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-0 scale-75 transition-all duration-200 ease-out group-hover/source:opacity-100 group-hover/source:scale-100">
              {/* Exclude toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isAnyAttached) toggleExclude(filePath);
                }}
                disabled={isAnyAttached}
                title={
                  isAnyAttached
                    ? 'Remove from attachments first'
                    : isExcluded
                      ? 'Remove exclusion'
                      : 'Exclude from next search'
                }
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150',
                  isAnyAttached
                    ? 'cursor-not-allowed opacity-30 text-(--brand-source-icon)'
                    : isExcluded
                      ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50'
                      : 'text-(--brand-source-icon) hover:bg-(--brand-source-attach-bg) hover:text-rose-500',
                )}
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>

              {/* Attach toggle */}
              {onAddAttachment && (
                <button
                  type="button"
                  onClick={handleToggleAll}
                  title={
                    isAllAttached
                      ? 'Remove all chunks'
                      : isAnyAttached
                        ? `${attachedCount}/${chunks.length} attached — click to attach all`
                        : 'Attach all chunks'
                  }
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150',
                    isAnyAttached
                      ? 'text-brand-attached-text hover:bg-brand-attached-hover-bg'
                      : 'text-(--brand-source-icon) hover:bg-(--brand-source-attach-bg) hover:text-brand-link',
                  )}
                >
                  {isAnyAttached ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Expanded body: Pages → Chunks ── */}
        <CollapsibleContent className="data-[state=closed]:animate-[collapse-up_0.2s_ease-in-out] data-[state=open]:animate-[collapse-down_0.2s_ease-in-out]">
          {groupedPages.length > 0 ? (
            <div className="flex flex-col gap-0 border-t border-[var(--brand-source-border)] pt-3">
              {groupedPages.map((page) => (
                <div key={page.page_number} className="flex flex-col">
                  {/* Page header */}
                  {page.page_number > 0 && (
                    <div className="flex items-center gap-2 bg-[var(--brand-citation-bg)]/60 mx-4 mb-1 rounded-md px-3 py-1.5">
                      <Badge className="rounded-full border border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-citation-text)]">
                        Page {page.page_number}
                      </Badge>
                      <span className="text-[10px] text-[var(--brand-source-time)]">
                        {page.chunks.length} chunk
                        {page.chunks.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Chunk list */}
                  {page.chunks.map((chunk, ci) => {
                    const attached = isChunkAttached(chunk.chunk_number);
                    return (
                      <div
                        key={chunk.chunk_number || ci}
                        className={cn(
                          'group/chunk relative flex gap-3 px-4 py-3 transition-colors',
                          ci < page.chunks.length - 1 &&
                            'border-b border-[var(--brand-source-border)]/50',
                          attached
                            ? 'bg-brand-attached-bg/40'
                            : 'hover:bg-[var(--brand-source-hover-bg)]',
                        )}
                      >
                        {/* Chunk number pill */}
                        <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold leading-none',
                              attached
                                ? 'bg-brand-attached-border/20 text-brand-attached-text'
                                : 'bg-[var(--brand-citation-bg)] text-[var(--brand-citation-text)]',
                            )}
                          >
                            #{chunk.chunk_number || ci + 1}
                          </span>
                        </div>

                        {/* Chunk text */}
                        <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--brand-content-text)] whitespace-pre-wrap [overflow-wrap:anywhere]">
                          {chunk.content ?? 'No content available.'}
                        </p>

                        {/* Per-chunk actions */}
                        <div className="flex shrink-0 items-start gap-0.5 mt-0.5">
                          {/* Open chunk in explorer */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAtChunk(filePath, chunk.chunk_number);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/chunk:opacity-100 text-[var(--brand-source-icon)] hover:bg-[var(--brand-source-attach-bg)] hover:text-[var(--brand-link)]"
                            title="Open in Source Explorer"
                          >
                            <LayoutGrid className="h-3 w-3" />
                          </button>

                          {/* Attach / detach */}
                          {onAddAttachment && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleToggleChunk(chunk)}
                              className={cn(
                                'h-6 w-6 shrink-0 rounded-full opacity-0 transition-opacity group-hover/chunk:opacity-100',
                                attached
                                  ? 'text-brand-attached-text hover:bg-brand-attached-hover-bg opacity-100'
                                  : 'text-[var(--brand-source-icon)] hover:bg-[var(--brand-source-attach-bg)] hover:text-[var(--brand-link)]',
                              )}
                              title={
                                attached
                                  ? 'Remove this chunk'
                                  : 'Attach this chunk'
                              }
                            >
                              {attached ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            /* No chunks */
            <div className="border-t border-[var(--brand-source-border)] px-4 py-3">
              <p className="text-xs leading-relaxed text-[var(--brand-content-text)]">
                No content available.
              </p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
