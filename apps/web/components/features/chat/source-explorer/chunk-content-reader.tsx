'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Paperclip,
  Minus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChunkMetadata } from '@/types/api';
import { FileExtBadge } from '../attachment-pill';
import { highlightSegments } from '@/lib/utils/highlight';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ChunkContentReaderProps {
  chunk: ChunkMetadata;
  /** All sorted chunks for this file — used for prev/next navigation */
  allChunks: ChunkMetadata[];
  fileName: string;
  fileExt?: string;
  isAttached: boolean;
  isCited: boolean;
  onAttach: () => void;
  onDetach: () => void;
  /** Navigate to a different chunk in the same file */
  onNavigate: (chunk: ChunkMetadata) => void;
  onClose: () => void;
  /** If set, highlight this query string in the content body */
  highlightQuery?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChunkContentReader({
  chunk,
  allChunks,
  fileName,
  fileExt,
  isAttached,
  isCited,
  onAttach,
  onDetach,
  onNavigate,
  onClose,
  highlightQuery,
}: ChunkContentReaderProps) {
  const idx = allChunks.findIndex((c) => c.chunk_number === chunk.chunk_number);
  const prevChunk = idx > 0 ? allChunks[idx - 1] : null;
  const nextChunk = idx < allChunks.length - 1 ? allChunks[idx + 1] : null;

  // Keyboard navigation: ← prev, → next, Esc close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't hijack shortcuts inside text inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === 'ArrowLeft' && prevChunk) {
        e.preventDefault();
        onNavigate(prevChunk);
      } else if (e.key === 'ArrowRight' && nextChunk) {
        e.preventDefault();
        onNavigate(nextChunk);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prevChunk, nextChunk, onNavigate, onClose]);

  return (
    <motion.div
      key={`reader-${chunk.chunk_number}`}
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ type: 'spring', stiffness: 440, damping: 36 }}
      className="flex h-full flex-col bg-background/60 backdrop-blur-[2px]"
    >
      {/* ── Header ─────────────────────────────── */}
      <div className="flex shrink-0 items-start gap-2.5 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          {/* Breadcrumb */}
          <div className="mb-2 flex items-center gap-1.5 text-[10px]">
            <FileExtBadge ext={fileExt ?? ''} />
            <span className="max-w-[140px] truncate text-muted-foreground">
              {fileName}
            </span>
            <span className="text-border/70">/</span>
            <span className="font-semibold text-[var(--brand-fg-accent)]">
              Chunk&nbsp;#{chunk.chunk_number}
            </span>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {chunk.page_number > 0 && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Page {chunk.page_number}
              </span>
            )}
            {isCited && (
              <span className="flex items-center gap-1 rounded-md bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-fg-accent)]">
                <Sparkles className="h-2.5 w-2.5" />
                AI Cited
              </span>
            )}
            {isAttached && (
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                Attached to message
              </span>
            )}
          </div>
        </div>

        {/* Attach / Detach + Close */}
        <div className="flex shrink-0 items-center gap-1">
          {isAttached ? (
            <button
              onClick={onDetach}
              className={cn(
                'flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors',
                'border-emerald-300/70 bg-emerald-50 text-emerald-700',
                'hover:border-red-200 hover:bg-red-50 hover:text-red-600',
                'dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-400',
                'dark:hover:border-red-900/60 dark:hover:bg-red-950/60 dark:hover:text-red-400',
              )}
            >
              <Minus className="h-3 w-3" />
              Detach
            </button>
          ) : (
            <button
              onClick={onAttach}
              className={cn(
                'flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-all',
                'border-[var(--brand-border-light)] bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)]',
                'hover:bg-[var(--brand-card-purple)] hover:shadow-[0_0_8px_-2px_var(--brand-btn-primary)]',
              )}
            >
              <Paperclip className="h-3 w-3" />
              Attach
            </button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Content body ───────────────────────── */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {chunk.content ? (
          <div className="px-5 py-5">
            {/* Thin left accent bar for reading feel */}
            <div className="relative pl-4 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:rounded-full before:bg-[var(--brand-border-light)]">
              <p className="whitespace-pre-wrap text-[13px] leading-[1.8] text-foreground/85 [overflow-wrap:anywhere] selection:bg-[var(--brand-surface-purple)]">
                {highlightQuery
                  ? highlightSegments(chunk.content, highlightQuery).map(
                      (seg, i) =>
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
                    )
                  : chunk.content}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12">
            <FileText className="h-9 w-9 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">
              No text content for this chunk
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation footer ──────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/20 px-3 py-2">
        <button
          disabled={!prevChunk}
          onClick={() => prevChunk && onNavigate(prevChunk)}
          className={cn(
            'flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium transition-colors',
            prevChunk
              ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
              : 'cursor-not-allowed text-muted-foreground/30',
          )}
          title="Previous chunk (←)"
        >
          <ChevronLeft className="h-3 w-3" />
          Prev
        </button>

        <span className="select-none text-[11px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground/70">{idx + 1}</span>
          <span className="mx-1 text-border">/</span>
          {allChunks.length}
        </span>

        <button
          disabled={!nextChunk}
          onClick={() => nextChunk && onNavigate(nextChunk)}
          className={cn(
            'flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium transition-colors',
            nextChunk
              ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
              : 'cursor-not-allowed text-muted-foreground/30',
          )}
          title="Next chunk (→)"
        >
          Next
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}
