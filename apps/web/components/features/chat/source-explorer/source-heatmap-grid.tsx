'use client';

import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  Plus,
  Check,
  Minus,
  BookOpen,
  Layers,
  Search,
  X,
} from 'lucide-react';
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
  /** Attach all chunks on a page */
  onAttachPage?: (page: number) => void;
  /** Detach all chunks on a page */
  onDetachPage?: (page: number) => void;
  /** Attach a single chunk */
  onAttachChunk?: (chunk: ChunkMetadata) => void;
  /** Detach a single chunk */
  onDetachChunk?: (chunk: ChunkMetadata) => void;
  /** Called when user switches between read/select mode */
  onModeChange?: (mode: 'read' | 'select') => void;
  /** Called whenever the search query changes (so parents can highlight reader) */
  onSearchChange?: (query: string) => void;
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
  selectionMode,
  isDragPending,
  dragIntent,
  onMouseDownSelect,
  onMouseEnterSelect,
  isDimmed,
}: {
  chunk: ChunkMetadata;
  state: ReturnType<typeof cellState>;
  isSelected: boolean;
  onSelect: () => void;
  selectionMode: 'read' | 'select';
  isDragPending: boolean;
  dragIntent: 'attach' | 'detach' | null;
  onMouseDownSelect: (chunk: ChunkMetadata, shiftKey: boolean) => void;
  onMouseEnterSelect: (chunk: ChunkMetadata) => void;
  isDimmed?: boolean;
}) {
  const preview = chunk.content
    ? chunk.content.slice(0, 120) + (chunk.content.length > 120 ? '\u2026' : '')
    : null;
  const isAttached = state === 'attached' || state === 'cited-attached';

  // Visual preview during drag: show the pending result of the drag intent
  let effectiveState = state;
  if (isDragPending && selectionMode === 'select') {
    if (dragIntent === 'attach' && !isAttached) effectiveState = 'attached';
    if (dragIntent === 'detach' && isAttached) effectiveState = 'none';
  }

  const tooltipLabel =
    selectionMode === 'select'
      ? isAttached
        ? 'attached'
        : 'not attached'
      : isSelected
        ? 'reading now'
        : state === 'cited-attached'
          ? 'cited + attached'
          : state === 'cited'
            ? 'AI cited'
            : state === 'attached'
              ? 'attached'
              : 'click to read';

  return (
    <div className="group relative">
      <TooltipProvider delayDuration={300} disableHoverableContent>
        <TooltipPrimitive.Root>
          <TooltipTrigger asChild>
            <button
              // Read mode: open reader; Select mode: handled entirely by mousedown/up
              onClick={selectionMode === 'read' ? onSelect : undefined}
              onMouseDown={
                selectionMode === 'select'
                  ? (e) => {
                      e.preventDefault();
                      onMouseDownSelect(chunk, e.shiftKey);
                    }
                  : undefined
              }
              onMouseEnter={
                selectionMode === 'select'
                  ? () => onMouseEnterSelect(chunk)
                  : undefined
              }
              className={cn(
                'relative flex h-9 w-11 items-center justify-center rounded-md text-[10px] font-bold outline-none',
                'border transition-all duration-200',
                // Dimmed (search filter): shrink to small circle
                isDimmed && '!scale-[0.32] !rounded-full cursor-default',
                // Read mode: scale on hover / selected ring
                !isDimmed &&
                  selectionMode === 'read' && [
                    'active:scale-90',
                    isSelected
                      ? 'scale-110 ring-2 ring-[var(--brand-btn-primary)] ring-offset-1 ring-offset-transparent shadow-[0_0_0_3px_rgba(111,88,235,0.22)]'
                      : 'hover:scale-110',
                  ],
                // Select mode: pointer cursor, subtle hover scale, no active shrink
                !isDimmed &&
                  selectionMode === 'select' && [
                    'cursor-pointer hover:scale-105',
                    isDragPending &&
                      dragIntent === 'attach' &&
                      'ring-2 ring-emerald-400/80 ring-offset-1',
                    isDragPending &&
                      dragIntent === 'detach' &&
                      'ring-2 ring-destructive/50 ring-offset-1',
                  ],
                // Cell fill colors
                effectiveState === 'cited-attached' &&
                  'border-emerald-400/70 bg-emerald-100 text-emerald-700 shadow-[0_0_0_2px_rgba(52,211,153,0.3)] dark:bg-emerald-900/50 dark:text-emerald-300',
                effectiveState === 'cited' &&
                  'border-[var(--brand-btn-primary)]/50 bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)] shadow-[0_0_6px_-2px_var(--brand-btn-primary)]',
                effectiveState === 'attached' &&
                  'border-emerald-400/60 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
                effectiveState === 'none' &&
                  'border-border/40 bg-muted/40 text-muted-foreground/50 hover:border-border hover:bg-muted',
              )}
            >
              {chunk.chunk_number}

              {/* Checkbox overlay — only in select mode */}
              {selectionMode === 'select' && (
                <span
                  className={cn(
                    'pointer-events-none absolute bottom-0.5 right-0.5 flex h-3 w-3 items-center justify-center rounded-sm transition-colors',
                    isAttached
                      ? 'bg-emerald-500 text-white'
                      : 'border border-muted-foreground/40 bg-background/60',
                  )}
                >
                  {isAttached && <Check className="h-2 w-2 stroke-[3]" />}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="z-[300] max-w-[240px] rounded-xl border-[var(--brand-source-border)] bg-card p-0 shadow-[0_8px_24px_-8px_rgba(102,88,204,0.3)]"
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
                  {tooltipLabel}
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
        </TooltipPrimitive.Root>
      </TooltipProvider>
      {/* Hover badge removed — use Select mode to attach/detach chunks */}
    </div>
  );
}

// ─── Highlight helper ───────────────────────────────────────────────────────

function highlightSegments(
  text: string,
  query: string,
): { text: string; match: boolean }[] {
  if (!query) return [{ text, match: false }];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const qLower = query.toLowerCase();
  return parts
    .filter((p) => p !== '')
    .map((part) => ({ text: part, match: part.toLowerCase() === qLower }));
}

// ─── Search results pane ─────────────────────────────────────────────────────

function SearchResultsPane({
  matchingChunks,
  query,
  onSelectChunk,
  selectedChunkNumber,
  citedChunkNumbers,
  attachedChunkNumbers,
}: {
  matchingChunks: ChunkMetadata[];
  query: string;
  onSelectChunk: (chunk: ChunkMetadata) => void;
  selectedChunkNumber?: number;
  citedChunkNumbers: Set<number>;
  attachedChunkNumbers: Set<number>;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--brand-source-border)] bg-card/60">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2">
        <Search className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Matches
        </span>
        <span className="rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-fg-accent)]">
          {matchingChunks.length}
        </span>
      </div>

      {/* Results list */}
      <div className="custom-scrollbar flex flex-col gap-2 p-2.5">
        {matchingChunks.map((chunk) => {
          const isCited = citedChunkNumbers.has(chunk.chunk_number);
          const isAttached = attachedChunkNumbers.has(chunk.chunk_number);
          const isSelected = chunk.chunk_number === selectedChunkNumber;
          const content = chunk.content ?? '';

          // Build a context window centred on the first match
          const qLower = query.toLowerCase();
          const idx = content.toLowerCase().indexOf(qLower);
          let excerpt = content;
          if (content.length > 260) {
            if (idx !== -1) {
              const start = Math.max(0, idx - 80);
              const end = Math.min(content.length, idx + qLower.length + 180);
              excerpt =
                (start > 0 ? '\u2026' : '') +
                content.slice(start, end) +
                (end < content.length ? '\u2026' : '');
            } else {
              excerpt = content.slice(0, 260) + '\u2026';
            }
          }

          const segments = highlightSegments(excerpt, query);

          return (
            <button
              key={chunk.chunk_number}
              onClick={() => onSelectChunk(chunk)}
              className={cn(
                'relative w-full overflow-hidden rounded-lg border text-left transition-colors',
                isSelected
                  ? 'border-[var(--brand-btn-primary)]/50 bg-[var(--brand-surface-purple)] shadow-sm'
                  : isCited
                    ? 'border-[var(--brand-btn-primary)]/20 bg-[var(--brand-surface-purple)]/40 hover:bg-[var(--brand-surface-purple)]/70'
                    : isAttached
                      ? 'border-emerald-400/25 bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-950/15 dark:hover:bg-emerald-950/30'
                      : 'border-border/40 bg-muted/20 hover:bg-muted/50',
              )}
            >
              {/* Card header */}
              <div className="flex items-center gap-1.5 px-2.5 pb-1 pt-2">
                <span
                  className={cn(
                    'flex h-5 min-w-[1.75rem] shrink-0 items-center justify-center rounded text-[10px] font-bold',
                    isCited
                      ? 'bg-[var(--brand-citation-bg)] text-[var(--brand-fg-accent)]'
                      : isAttached
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {chunk.chunk_number}
                </span>
                {chunk.page_number > 0 && (
                  <span className="text-[9px] text-muted-foreground/70">
                    p.{chunk.page_number}
                  </span>
                )}
                {isCited && (
                  <span className="rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[var(--brand-fg-accent)]">
                    cited
                  </span>
                )}
                {isAttached && (
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    attached
                  </span>
                )}
              </div>

              {/* Content with highlights */}
              {content && (
                <p className="px-2.5 pb-2.5 text-[11px] leading-relaxed text-foreground/75 [overflow-wrap:anywhere]">
                  {segments.map((seg, i) =>
                    seg.match ? (
                      <mark
                        key={i}
                        className="rounded-sm bg-yellow-200/80 px-0.5 text-yellow-900 not-italic dark:bg-yellow-500/30 dark:text-yellow-200"
                      >
                        {seg.text}
                      </mark>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    ),
                  )}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
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
  compact = false,
}: {
  hasCited: boolean;
  hasAttached: boolean;
  onAttachAllCited: () => void;
  onAttachAll: () => void;
  onClearAll: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <TooltipProvider delayDuration={400}>
        <div className="flex items-center gap-0.5">
          {hasCited && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onAttachAllCited}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)] transition-colors hover:bg-[var(--brand-card-purple)]"
                >
                  <Check className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Attach all cited
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onAttachAll}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-muted/60 text-foreground/70 transition-colors hover:bg-muted"
              >
                <Plus className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Attach all
            </TooltipContent>
          </Tooltip>
          {hasAttached && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClearAll}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Minus className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Clear attached
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

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
  onAttachPage,
  onDetachPage,
  onAttachChunk,
  onDetachChunk,
  onModeChange,
  onSearchChange,
}: HeatmapGridProps) {
  // Ref to the grid root — we walk up to the nearest scrollable ancestor
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Selection mode ────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState<'read' | 'select'>('read');

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      const next = prev === 'read' ? 'select' : 'read';
      onModeChange?.(next);
      return next;
    });
  }, [onModeChange]);

  // ── Search / filter ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const matchingChunkNumbers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      chunks
        .filter(
          (c) =>
            String(c.chunk_number).includes(q) ||
            c.content?.toLowerCase().includes(q),
        )
        .map((c) => c.chunk_number),
    );
  }, [searchQuery, chunks]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Bubble search query to parent so it can highlight the chunk reader
  useEffect(() => {
    onSearchChange?.(searchQuery);
  }, [searchQuery, onSearchChange]);

  // ── Drag-to-select state ──────────────────────────────────────
  // Use refs for synchronous reads inside event handlers (avoids stale closures)
  const isDraggingRef = useRef(false);
  const dragIntentRef = useRef<'attach' | 'detach' | null>(null);
  const draggedNumsRef = useRef<Set<number>>(new Set());
  const lastClickedNumRef = useRef<number | null>(null);

  // Derived render state (triggers re-render for visual feedback)
  const [dragVisual, setDragVisual] = useState<{
    active: boolean;
    intent: 'attach' | 'detach' | null;
    chunkNumbers: Set<number>;
  }>({ active: false, intent: null, chunkNumbers: new Set() });

  /** Commit the current drag: apply intent to all accumulated cells */
  const commitDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    const intent = dragIntentRef.current;
    const nums = new Set(draggedNumsRef.current);

    isDraggingRef.current = false;
    dragIntentRef.current = null;
    draggedNumsRef.current = new Set();
    setDragVisual({ active: false, intent: null, chunkNumbers: new Set() });

    if (!intent || nums.size === 0) return;
    nums.forEach((n) => {
      const chunk = chunks.find((c) => c.chunk_number === n);
      if (!chunk) return;
      if (intent === 'attach') onAttachChunk?.(chunk);
      else onDetachChunk?.(chunk);
    });
  }, [chunks, onAttachChunk, onDetachChunk]);

  // Global mouseup so drag is committed even if released outside the grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) commitDrag();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [commitDrag]);

  const handleCellMouseDown = useCallback(
    (chunk: ChunkMetadata, shiftKey: boolean) => {
      // ── Shift+click: range select ────────────────────────────
      if (shiftKey && lastClickedNumRef.current !== null) {
        const from = lastClickedNumRef.current;
        const to = chunk.chunk_number;
        const allNums = chunks.map((c) => c.chunk_number).sort((a, b) => a - b);
        const minN = Math.min(from, to);
        const maxN = Math.max(from, to);
        const rangeNums = allNums.filter((n) => n >= minN && n <= maxN);
        // Intent: detach if the clicked cell is attached, otherwise attach the range
        const intent: 'attach' | 'detach' = attachedChunkNumbers.has(
          chunk.chunk_number,
        )
          ? 'detach'
          : 'attach';
        rangeNums.forEach((n) => {
          const c = chunks.find((ch) => ch.chunk_number === n);
          if (!c) return;
          if (intent === 'attach') onAttachChunk?.(c);
          else onDetachChunk?.(c);
        });
        lastClickedNumRef.current = chunk.chunk_number;
        return; // No drag for shift+click
      }

      // ── Normal mouse-down: start drag / single-cell toggle ───
      const intent: 'attach' | 'detach' = attachedChunkNumbers.has(
        chunk.chunk_number,
      )
        ? 'detach'
        : 'attach';
      isDraggingRef.current = true;
      dragIntentRef.current = intent;
      draggedNumsRef.current = new Set([chunk.chunk_number]);
      lastClickedNumRef.current = chunk.chunk_number;
      setDragVisual({
        active: true,
        intent,
        chunkNumbers: new Set([chunk.chunk_number]),
      });
    },
    [attachedChunkNumbers, chunks, onAttachChunk, onDetachChunk],
  );

  const handleCellMouseEnter = useCallback((chunk: ChunkMetadata) => {
    if (!isDraggingRef.current) return;
    draggedNumsRef.current.add(chunk.chunk_number);
    // New Set reference so React detects the change
    setDragVisual((prev) => ({
      ...prev,
      chunkNumbers: new Set(draggedNumsRef.current),
    }));
  }, []);

  /** Walk up the DOM to find the nearest scrollable ancestor. */
  const getScrollParent = useCallback((): HTMLElement | null => {
    let node: HTMLElement | null = gridRef.current;
    while (node) {
      const { overflow, overflowY } = getComputedStyle(node);
      if (
        /auto|scroll/.test(overflow + overflowY) &&
        node.scrollHeight > node.clientHeight
      ) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }, []);

  // Auto-scroll to keep the selected cell visible whenever it changes
  useEffect(() => {
    if (selectedChunkNumber == null || !gridRef.current) return;
    const el = gridRef.current.querySelector<HTMLElement>(
      `[data-chunk="${selectedChunkNumber}"]`,
    );
    if (!el) return;
    const container = getScrollParent();
    if (!container) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    if (eRect.top < cRect.top || eRect.bottom > cRect.bottom) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedChunkNumber, getScrollParent]);

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

  const hasCited = citedCount > 0;
  const hasAttached = attachedCount > 0;
  const isSelectMode = selectionMode === 'select';

  return (
    <div
      ref={gridRef}
      className="flex min-h-full flex-col gap-3"
      // Prevent text-selection during drag
      style={{ userSelect: dragVisual.active ? 'none' : undefined }}
    >
      {/* ── Header row: legend + mode toggle ── */}
      <div className="flex items-center justify-between gap-2">
        <HeatmapLegend
          citedCount={citedCount}
          attachedCount={attachedCount}
          totalCount={chunks.length}
        />
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSelectionMode}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all duration-150',
                  isSelectMode
                    ? 'border-[var(--brand-btn-primary)]/50 bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)] shadow-sm'
                    : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground',
                )}
              >
                {isSelectMode ? (
                  <>
                    <BookOpen className="h-3 w-3" />
                    Read
                  </>
                ) : (
                  <>
                    <Layers className="h-3 w-3" />
                    Select
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isSelectMode
                ? 'Switch to Read mode — click a chunk to open the reader'
                : 'Switch to Select mode — click or drag to attach/detach chunks'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* ── Search bar ── */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2.5 h-3 w-3 text-muted-foreground/50" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chunks… (⌘F)"
          className={cn(
            'h-7 w-full rounded-lg border bg-muted/40 pl-7 pr-7 text-[11px] text-foreground placeholder:text-muted-foreground/40',
            'outline-none transition-colors focus:border-[var(--brand-btn-primary)]/50 focus:bg-background focus:ring-1 focus:ring-[var(--brand-btn-primary)]/30',
            matchingChunkNumbers !== null
              ? 'border-[var(--brand-btn-primary)]/40'
              : 'border-border/50',
          )}
        />
        {searchQuery && (
          <div className="absolute right-1.5 flex items-center gap-1">
            {matchingChunkNumbers !== null && (
              <span
                className={cn(
                  'rounded px-1 py-0.5 text-[9px] font-semibold tabular-nums',
                  matchingChunkNumbers.size === 0
                    ? 'text-destructive/70'
                    : 'text-[var(--brand-fg-accent)]',
                )}
              >
                {matchingChunkNumbers.size}/{chunks.length}
              </span>
            )}
            <button
              onClick={() => setSearchQuery('')}
              className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Search results pane ── */}
      <AnimatePresence initial={false}>
        {matchingChunkNumbers !== null && matchingChunkNumbers.size > 0 && (
          <motion.div
            key="search-results-pane"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <SearchResultsPane
              matchingChunks={chunks.filter((c) =>
                matchingChunkNumbers.has(c.chunk_number),
              )}
              query={searchQuery}
              onSelectChunk={onSelectChunk}
              selectedChunkNumber={selectedChunkNumber}
              citedChunkNumbers={citedChunkNumbers}
              attachedChunkNumbers={attachedChunkNumbers}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Select-mode hint ── */}
      <AnimatePresence initial={false}>
        {isSelectMode && (
          <motion.p
            key="select-hint"
            initial={{ opacity: 0, height: 0, marginTop: -4 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: -4 }}
            transition={{ duration: 0.15 }}
            className="text-[10px] text-muted-foreground/70"
          >
            Click to toggle · drag across multiple chunks · Shift+click to
            range-select
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Chunk grid ── */}
      {matchingChunkNumbers !== null && matchingChunkNumbers.size === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No chunks match
          </p>
          <p className="text-xs text-muted-foreground/50">
            Try a different keyword or chunk number
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-1 pb-2 pt-1">
          {pages.map(({ page, chunks: pageChunks }) => (
            <div key={page} className="flex flex-col gap-1.5">
              {/* Page label */}
              {page > 0 && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--brand-citation-text)]">
                    Page {page}
                  </span>
                  {/* Per-page attach toggle */}
                  {(onAttachPage || onDetachPage) &&
                    (() => {
                      const attached = pageChunks.filter((c) =>
                        attachedChunkNumbers.has(c.chunk_number),
                      ).length;
                      const allAttached = attached === pageChunks.length;
                      const isPartial = attached > 0 && !allAttached;
                      return (
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() =>
                                  allAttached
                                    ? onDetachPage?.(page)
                                    : onAttachPage?.(page)
                                }
                                className={cn(
                                  'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                                  allAttached
                                    ? 'border-emerald-400/60 bg-emerald-50 text-emerald-600 hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : isPartial
                                      ? 'border-emerald-300/50 bg-emerald-50/60 text-emerald-600/70 hover:border-emerald-400/60 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-emerald-950/20'
                                      : 'border-border/50 bg-muted/40 text-muted-foreground hover:border-emerald-400/60 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30',
                                )}
                              >
                                {allAttached ? (
                                  <Minus className="h-2.5 w-2.5" />
                                ) : (
                                  <Plus className="h-2.5 w-2.5" />
                                )}
                                {/* Partial indicator dot */}
                                {isPartial && (
                                  <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-400 text-[7px] font-bold leading-none text-white">
                                    {attached}
                                  </span>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {allAttached
                                ? `Detach all (${pageChunks.length})`
                                : isPartial
                                  ? `${attached}/${pageChunks.length} attached — attach rest`
                                  : `Attach all on page ${page}`}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                  <div className="h-px flex-1 bg-border/30" />
                </div>
              )}

              {/* Chunk cells */}
              <motion.div
                layout
                className="flex flex-wrap gap-1 overflow-visible"
              >
                <AnimatePresence initial={false}>
                  {pageChunks.map((chunk) => (
                    <motion.div
                      key={chunk.chunk_number}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.12 }}
                      style={{ overflow: 'visible' }}
                      data-chunk={chunk.chunk_number}
                      className={cn(
                        'transition-all duration-200',
                        matchingChunkNumbers !== null &&
                          !matchingChunkNumbers.has(chunk.chunk_number) &&
                          'pointer-events-none opacity-20 grayscale',
                      )}
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
                        selectionMode={selectionMode}
                        isDragPending={dragVisual.chunkNumbers.has(
                          chunk.chunk_number,
                        )}
                        dragIntent={dragVisual.intent}
                        onMouseDownSelect={handleCellMouseDown}
                        onMouseEnterSelect={handleCellMouseEnter}
                        isDimmed={
                          matchingChunkNumbers !== null &&
                          !matchingChunkNumbers.has(chunk.chunk_number)
                        }
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          ))}
        </div>
      )}

      {/* ── Floating action bar — visible in Select mode, sticky at bottom ── */}
      <AnimatePresence initial={false}>
        {isSelectMode && (
          <motion.div
            key="select-action-bar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="sticky bottom-0 z-10 rounded-xl border border-[var(--brand-source-border)] bg-card/95 p-2.5 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.12)] backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              {/* Attached count pill */}
              <span className="flex-1 text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {attachedCount}
                </span>{' '}
                attached
                {hasCited && (
                  <>
                    {' · '}
                    <span className="font-semibold text-[var(--brand-fg-accent)]">
                      {citedCount}
                    </span>{' '}
                    cited
                  </>
                )}
              </span>

              {/* Bulk action buttons */}
              <div className="flex items-center gap-1">
                {hasCited && (
                  <TooltipProvider delayDuration={400}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            chunks
                              .filter((c) =>
                                citedChunkNumbers.has(c.chunk_number),
                              )
                              .forEach((c) => onAttachChunk?.(c));
                          }}
                          className="flex items-center gap-1 rounded-lg border border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] px-2.5 py-1 text-[11px] font-medium text-[var(--brand-fg-accent)] transition-colors hover:bg-[var(--brand-card-purple)]"
                        >
                          <Check className="h-3 w-3" />
                          Attach cited
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Attach all AI-cited chunks
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <TooltipProvider delayDuration={400}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() =>
                          chunks.forEach((c) => onAttachChunk?.(c))
                        }
                        className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-foreground/70 transition-colors hover:bg-muted"
                      >
                        <Plus className="h-3 w-3" />
                        All
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Attach all chunks
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {hasAttached && (
                  <TooltipProvider delayDuration={400}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() =>
                            chunks
                              .filter((c) =>
                                attachedChunkNumbers.has(c.chunk_number),
                              )
                              .forEach((c) => onDetachChunk?.(c))
                          }
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                        >
                          <Minus className="h-3 w-3" />
                          Clear
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Detach all attached chunks
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
