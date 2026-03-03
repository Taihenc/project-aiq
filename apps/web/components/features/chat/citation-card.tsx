'use client';

import { useState, useMemo, Fragment } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, Copy, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Citation } from '@/types';
import type { ChunkMetadata } from '@/types/api';
import { FileExtBadge } from './attachment-pill';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Renders text with all occurrences of `query` wrapped in a highlight mark. */
export function HighlightText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-[2px] bg-yellow-300/70 px-px text-inherit dark:bg-yellow-500/40"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

// ── CitationCard ──────────────────────────────────────────────────────────────

interface CitationCardProps {
  citation: Citation;
  /** Subset of chunks to render. `null` means show all. */
  visibleChunks: ChunkMetadata[] | null;
  query: string;
  /** Only highlight in exact mode */
  highlightQuery: string;
  onShowSimilar?: (citation: Citation) => void;
}

export function CitationCard({
  citation,
  visibleChunks,
  query,
  highlightQuery,
  onShowSimilar,
}: CitationCardProps) {
  const isSearching = query.trim().length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const [copiedChunk, setCopiedChunk] = useState<number | null>(null);

  const ext = citation.id.split('.').pop()?.toLowerCase();
  const allChunks: ChunkMetadata[] = citation.chunks ?? [];
  const chunks = visibleChunks ?? allChunks;

  // Group by page
  const groupedPages = useMemo(() => {
    const pageMap = new Map<number, ChunkMetadata[]>();
    for (const chunk of chunks) {
      const pg = chunk.page_number ?? 0;
      if (!pageMap.has(pg)) pageMap.set(pg, []);
      pageMap.get(pg)!.push(chunk);
    }
    return Array.from(pageMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([page_number, pageChunks]) => ({
        page_number,
        chunks: pageChunks,
      }));
  }, [chunks]);

  const handleCopy = (text: string, chunkNumber: number) => {
    navigator.clipboard.writeText(text);
    setCopiedChunk(chunkNumber);
    setTimeout(() => setCopiedChunk(null), 1500);
  };

  // Auto-expand when searching and there are matching chunks
  const open = isSearching ? true : isOpen;

  return (
    <Collapsible
      open={open}
      onOpenChange={isSearching ? undefined : setIsOpen}
      className="w-full min-w-0"
    >
      <div
        className={cn(
          'rounded-xl border transition-colors duration-200 overflow-hidden w-full min-w-0',
          open
            ? 'border-[var(--brand-source-border)] bg-card/95 dark:bg-card'
            : 'border-[var(--brand-source-border)] bg-card/95 dark:bg-card hover:bg-[var(--brand-source-hover-bg)]',
        )}
      >
        {/* Header */}
        <div className="group/header flex w-full min-w-0 items-center gap-2 px-4 py-3 overflow-hidden">
          {/* Clickable title area */}
          <CollapsibleTrigger asChild disabled={isSearching}>
            <button
              className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left"
              aria-disabled={isSearching}
            >
              <FileExtBadge ext={ext} />
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <span className="block truncate text-sm font-medium text-[var(--brand-source-text)] leading-tight">
                  {citation.title}
                </span>
                <span className="block truncate text-[11px] text-[var(--brand-source-time)]">
                  {citation.platform}
                  {isSearching && visibleChunks
                    ? ` · ${visibleChunks.length} of ${allChunks.length} chunk${allChunks.length !== 1 ? 's' : ''} matched`
                    : allChunks.length > 0
                      ? ` · ${allChunks.length} chunk${allChunks.length !== 1 ? 's' : ''}`
                      : ''}
                </span>
              </div>
            </button>
          </CollapsibleTrigger>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-1">
            {onShowSimilar && !isSearching && (
              <button
                onClick={() => onShowSimilar(citation)}
                className="flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/header:opacity-100 text-[var(--brand-source-icon)] hover:bg-[var(--brand-source-attach-bg)] hover:text-[var(--brand-link)]"
                title="Find similar sources"
              >
                <Sparkles className="h-3 w-3" />
              </button>
            )}
            {!isSearching && (
              <CollapsibleTrigger asChild>
                <button className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-[var(--brand-source-attach-bg)]">
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-[var(--brand-source-icon)] transition-transform duration-200',
                      open && 'rotate-180',
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        {/* Expanded: page → chunk body */}
        <CollapsibleContent>
          <div className="flex flex-col border-t border-[var(--brand-source-border)]">
            {groupedPages.length > 0 ? (
              groupedPages.map((page) => (
                <div key={page.page_number} className="flex flex-col">
                  {/* Page badge */}
                  {page.page_number > 0 && (
                    <div className="flex items-center gap-2 bg-[var(--brand-citation-bg)]/60 mx-4 mt-3 mb-1 rounded-md px-3 py-1.5">
                      <Badge className="shrink-0 w-fit h-auto self-center rounded-full border border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-citation-text)]">
                        Page {page.page_number}
                      </Badge>
                      <span className="text-[10px] text-[var(--brand-source-time)]">
                        {page.chunks.length} chunk
                        {page.chunks.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Chunk rows */}
                  {page.chunks.map((chunk, ci) => (
                    <div
                      key={chunk.chunk_number || ci}
                      className={cn(
                        'group/chunk relative flex gap-3 px-4 py-3',
                        ci < page.chunks.length - 1 &&
                          'border-b border-[var(--brand-source-border)]/50',
                      )}
                    >
                      {/* Number + score */}
                      <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
                        <span className="rounded-full bg-[var(--brand-citation-bg)] px-2 py-0.5 text-[10px] font-bold leading-none text-[var(--brand-citation-text)]">
                          #{chunk.chunk_number || ci + 1}
                        </span>
                        {chunk.score != null && (
                          <span className="text-[9px] text-[var(--brand-source-time)] tabular-nums">
                            {chunk.score.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Text */}
                      <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--brand-content-text)] whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {chunk.content ? (
                          <HighlightText
                            text={chunk.content}
                            query={highlightQuery}
                          />
                        ) : (
                          <span className="italic text-[var(--brand-source-time)]">
                            No content available.
                          </span>
                        )}
                      </p>

                      {/* Copy button */}
                      {chunk.content && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            handleCopy(chunk.content!, chunk.chunk_number)
                          }
                          className={cn(
                            'mt-0.5 h-6 w-6 shrink-0 rounded-full opacity-0 transition-opacity group-hover/chunk:opacity-100',
                            copiedChunk === chunk.chunk_number
                              ? 'opacity-100 text-green-500'
                              : 'text-[var(--brand-source-icon)] hover:bg-[var(--brand-source-attach-bg)] hover:text-[var(--brand-link)]',
                          )}
                          title="Copy chunk"
                        >
                          {copiedChunk === chunk.chunk_number ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="px-4 py-3">
                <p className="text-xs italic text-[var(--brand-source-time)]">
                  No chunk content available.
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
