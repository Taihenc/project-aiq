'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Plus, Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChunkMetadata } from '@/types/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HeatmapGridProps {
  /** All chunks for this file (from embedding service) */
  chunks: ChunkMetadata[];
  /** Chunks the AI cited in responses (from availableCitations) */
  citedChunkNumbers: Set<number>;
  /** Chunks currently attached to the message */
  attachedChunkNumbers: Set<number>;
  isLoading: boolean;
  /** Click a cell to open the content reader */
  onSelectChunk: (chunk: ChunkMetadata) => void;
  /** Highlight this chunk number as "currently reading" */
  selectedChunkNumber?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cellState(
  chunk: ChunkMetadata,
  cited: Set<number>,
  attached: Set<number>,
): 'cited-attached' | 'cited' | 'attached' | 'none' {
  const n = chunk.chunk_number;
  const isCited = cited.has(n);
  const isAttached = attached.has(n);
  if (isCited && isAttached) return 'cited-attached';
  if (isCited) return 'cited';
  if (isAttached) return 'attached';
  return 'none';
}

// ─── Single Cell ─────────────────────────────────────────────────────────────

function HeatmapCell({
  chunk,
  state,
  isSelected,
  onSelect,
}: {
  chunk: ChunkMetadata;
  state: ReturnType<typeof cellState>;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const preview = chunk.content
    ? chunk.content.slice(0, 120) + (chunk.content.length > 120 ? '\u2026' : '')
    : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onSelect}
            className={cn(
              'relative flex h-6 w-8 items-center justify-center rounded text-[8px] font-bold',
              'border transition-all duration-150 active:scale-90',
              // Selected overlay: bright white ring on top of state color
              isSelected &&
                'ring-2 ring-white/90 ring-offset-1 ring-offset-transparent dark:ring-white/70',
              state === 'cited-attached' &&
                'border-emerald-400/70 bg-emerald-100 text-emerald-700 shadow-[0_0_0_2px_rgba(52,211,153,0.3)] dark:bg-emerald-900/50 dark:text-emerald-300',
              state === 'cited' &&
                'border-[var(--brand-btn-primary)]/50 bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)] shadow-[0_0_6px_-2px_var(--brand-btn-primary)] hover:bg-[var(--brand-card-purple)]',
              state === 'attached' &&
                'border-emerald-400/60 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
              state === 'none' &&
                'border-border/40 bg-muted/40 text-muted-foreground/50 hover:border-border hover:bg-muted',
              !isSelected && 'hover:scale-110',
            )}
          >
            {chunk.chunk_number}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[240px] rounded-xl border-[var(--brand-source-border)] bg-card p-0 shadow-[0_8px_24px_-8px_rgba(102,88,204,0.3)]"
        >
          <div className="px-3 py-2">
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none',
                  state === 'cited-attached' || state === 'cited'
                    ? 'bg-[var(--brand-citation-bg)] text-[var(--brand-fg-accent)]'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                #{chunk.chunk_number}
              </span>
              {chunk.page_number > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  p.{chunk.page_number}
                </span>
              )}
              <span
                className={cn(
                  'ml-auto text-[9px] font-semibold uppercase tracking-wide',
                  state === 'cited-attached'
                    ? 'text-emerald-500'
                    : state === 'cited'
                      ? 'text-[var(--brand-fg-accent)]'
                      : state === 'attached'
                        ? 'text-emerald-500'
                        : 'text-muted-foreground/50',
                )}
              >
                {state === 'cited-attached'
                  ? 'cited + attached'
                  : state === 'cited'
                    ? 'AI cited'
                    : state === 'attached'
                      ? 'attached'
                      : 'click to read'}
              </span>
            </div>
            {preview ? (
              <p className="text-[11px] leading-relaxed text-foreground/80 whitespace-pre-wrap [overflow-wrap:anywhere]">
                {preview}
              </p>
            ) : (
              <p className="text-[11px] italic text-muted-foreground">
                No preview available
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function HeatmapLegend({
  citedCount,
  attachedCount,
  totalCount,
}: {
  citedCount: number;
  attachedCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-sm border border-[var(--brand-btn-primary)]/50 bg-[var(--brand-surface-purple)]" />
        <span>
          AI cited{' '}
          <span className="font-semibold text-[var(--brand-fg-accent)]">
            {citedCount}
          </span>
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-sm border border-emerald-400/60 bg-emerald-100 dark:bg-emerald-950/60" />
        <span>
          Attached{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {attachedCount}
          </span>
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-4 rounded-sm border border-border/40 bg-muted/40" />
        <span>
          Total{' '}
          <span className="font-semibold text-foreground/70">{totalCount}</span>
        </span>
      </span>
    </div>
  );
}

// ─── Quick-action bar ────────────────────────────────────────────────────────

export function HeatmapQuickActions({
  hasCited,
  hasAttached,
  onAttachAllCited,
  onAttachAll,
  onClearAll,
}: {
  hasCited: boolean;
  hasAttached: boolean;
  onAttachAllCited: () => void;
  onAttachAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasCited && (
        <button
          onClick={onAttachAllCited}
          className="flex items-center gap-1 rounded-lg border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] px-2.5 py-1 text-[11px] font-medium text-[var(--brand-fg-accent)] transition-colors hover:bg-[var(--brand-card-purple)]"
        >
          <Check className="h-3 w-3" />
          Attach all cited
        </button>
      )}
      <button
        onClick={onAttachAll}
        className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-foreground/70 transition-colors hover:bg-muted"
      >
        <Plus className="h-3 w-3" />
        Attach all
      </button>
      {hasAttached && (
        <button
          onClick={onClearAll}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <Minus className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  );
}

// ─── Main grid ───────────────────────────────────────────────────────────────

export function SourceHeatmapGrid({
  chunks,
  citedChunkNumbers,
  attachedChunkNumbers,
  isLoading,
  onSelectChunk,
  selectedChunkNumber,
}: HeatmapGridProps) {
  // Group chunks by page
  const pages = useMemo(() => {
    const map = new Map<number, ChunkMetadata[]>();
    for (const c of chunks) {
      const pg = c.page_number ?? 0;
      if (!map.has(pg)) map.set(pg, []);
      map.get(pg)!.push(c);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([page, pageChunks]) => ({ page, chunks: pageChunks }));
  }, [chunks]);

  const citedCount = useMemo(
    () => chunks.filter((c) => citedChunkNumbers.has(c.chunk_number)).length,
    [chunks, citedChunkNumbers],
  );
  const attachedCount = useMemo(
    () => chunks.filter((c) => attachedChunkNumbers.has(c.chunk_number)).length,
    [chunks, attachedChunkNumbers],
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-fg-accent)]" />
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No chunks found
        </p>
        <p className="text-xs text-muted-foreground/60">
          This file may still be indexing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <HeatmapLegend
        citedCount={citedCount}
        attachedCount={attachedCount}
        totalCount={chunks.length}
      />

      <div className="custom-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto">
        {pages.map(({ page, chunks: pageChunks }) => (
          <div key={page} className="flex flex-col gap-1.5">
            {/* Page label */}
            {page > 0 && (
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--brand-citation-text)]">
                  Page {page}
                </span>
                <div className="h-px flex-1 bg-border/30" />
              </div>
            )}

            {/* Chunk cells */}
            <motion.div layout className="flex flex-wrap gap-1">
              <AnimatePresence initial={false}>
                {pageChunks.map((chunk) => (
                  <motion.div
                    key={chunk.chunk_number}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.12 }}
                  >
                    <HeatmapCell
                      chunk={chunk}
                      state={cellState(
                        chunk,
                        citedChunkNumbers,
                        attachedChunkNumbers,
                      )}
                      isSelected={chunk.chunk_number === selectedChunkNumber}
                      onSelect={() => onSelectChunk(chunk)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}
