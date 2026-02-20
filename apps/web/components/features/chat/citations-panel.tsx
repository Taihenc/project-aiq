'use client';

import { useState, useMemo, Fragment } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  Copy,
  ChevronDown,
  FileText,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import Fuse from 'fuse.js';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CitationsPanelProps, Citation } from '@/types';
import type { ChunkMetadata } from '@/types/api';
import { FileExtBadge } from './attachment-pill';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Renders text with all occurrences of `query` wrapped in a highlight mark. */
function HighlightText({ text, query }: { text: string; query: string }) {
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

// ── Per-citation card ─────────────────────────────────────────────────────────

interface CitationCardProps {
  citation: Citation;
  /** Subset of chunks to render. `null` means show all. */
  visibleChunks: ChunkMetadata[] | null;
  query: string;
  /** Only highlight in exact mode */
  highlightQuery: string;
  onShowSimilar?: (citation: Citation) => void;
}

function CitationCard({
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
    <Collapsible open={open} onOpenChange={isSearching ? undefined : setIsOpen}>
      <div
        className={cn(
          'rounded-xl border transition-colors duration-200 overflow-hidden',
          open
            ? 'border-[var(--brand-source-border)] bg-card/95 dark:bg-card'
            : 'border-[var(--brand-source-border)] bg-card/95 dark:bg-card hover:bg-[var(--brand-source-hover-bg)]',
        )}
      >
        {/* Header */}
        <div className="group/header flex w-full items-center gap-2 px-4 py-3">
          {/* Clickable title area */}
          <CollapsibleTrigger asChild disabled={isSearching}>
            <button
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              aria-disabled={isSearching}
            >
              <FileExtBadge ext={ext} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-sm font-medium text-[var(--brand-source-text)] leading-tight">
                  {citation.title}
                </span>
                <span className="text-[11px] text-[var(--brand-source-time)]">
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

// ── Panel ─────────────────────────────────────────────────────────────────────

interface FuseItem {
  id: string;
  title: string;
  platform: string;
  flatContent: string;
}

export function CitationsPanel({
  open,
  onOpenChange,
  citations = [],
}: CitationsPanelProps) {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'exact' | 'fuzzy'>('exact');

  const switchMode = (mode: 'exact' | 'fuzzy') => {
    setSearchMode(mode);
    setQuery('');
  };

  // ── Fuse.js index ─────────────────────────────────────────────────────────
  const fuseData = useMemo<FuseItem[]>(
    () =>
      citations.map((c) => ({
        id: c.id,
        title: c.title,
        platform: c.platform,
        flatContent: (c.chunks ?? [])
          .map((ch) => ch.content ?? '')
          .join(' ')
          .slice(0, 1500),
      })),
    [citations],
  );

  const fuse = useMemo(
    () =>
      new Fuse<FuseItem>(fuseData, {
        keys: [
          { name: 'title', weight: 0.55 },
          { name: 'platform', weight: 0.1 },
          { name: 'flatContent', weight: 0.35 },
        ],
        includeScore: true,
        threshold: 0.55,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [fuseData],
  );

  // ── Search results ─────────────────────────────────────────────────────────
  // Exact mode: filter citations + chunks by substring; Fuzzy mode: Fuse.js at citation level.
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q)
      return citations.map((c) => ({
        citation: c,
        visibleChunks: null as ChunkMetadata[] | null,
      }));

    if (searchMode === 'fuzzy') {
      return fuse
        .search(q)
        .map((r) => ({
          citation: citations.find((c) => c.id === r.item.id)!,
          visibleChunks: null as ChunkMetadata[] | null,
        }))
        .filter((r) => r.citation);
    }

    // Exact mode: substring filter
    const ql = q.toLowerCase();
    const results: {
      citation: Citation;
      visibleChunks: ChunkMetadata[] | null;
    }[] = [];
    for (const c of citations) {
      const titleMatch =
        c.title.toLowerCase().includes(ql) ||
        c.platform.toLowerCase().includes(ql);
      if (titleMatch) {
        results.push({ citation: c, visibleChunks: null });
        continue;
      }
      const matched = (c.chunks ?? []).filter((ch) =>
        ch.content?.toLowerCase().includes(ql),
      );
      if (matched.length > 0)
        results.push({ citation: c, visibleChunks: matched });
    }
    return results;
  }, [citations, fuse, query, searchMode]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-[420px] sm:w-[520px] border-l border-[var(--brand-source-border)] bg-background dark:bg-[var(--brand-surface-purple)] p-0 gap-0">
        {/* Fixed header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[var(--brand-source-border)]">
          <SheetTitle className="text-primary-dark font-kiona">
            Sources & Citations
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-card-purple text-primary-light rounded-pill border-purple-light border px-3 py-1 text-xs font-medium">
                {citations.length} reference{citations.length !== 1 ? 's' : ''}
              </Badge>
              {query && searchResults.length !== citations.length && (
                <span className="text-[11px] text-[var(--brand-source-time)]">
                  {searchResults.length} matching
                </span>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[var(--brand-source-border)]">
          <div className="flex items-center gap-2">
            {/* Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--brand-source-time)] pointer-events-none" />
              <Input
                placeholder={
                  searchMode === 'exact'
                    ? 'Search by keyword…'
                    : 'Search by topic…'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded-lg border-[var(--brand-source-border)] bg-[var(--brand-source-hover-bg)] pl-9 pr-8 text-sm placeholder:text-[var(--brand-source-time)] focus-visible:ring-1 focus-visible:ring-[var(--brand-citation-border)]"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full text-[var(--brand-source-time)] hover:text-[var(--brand-source-text)]"
                  title="Clear"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Mode toggle — outside the input */}
            <TooltipProvider delayDuration={500}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() =>
                      switchMode(searchMode === 'exact' ? 'fuzzy' : 'exact')
                    }
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                      searchMode === 'fuzzy'
                        ? 'border-[var(--brand-citation-border)] bg-[var(--brand-citation-bg)] text-[var(--brand-link)]'
                        : 'border-[var(--brand-source-border)] text-[var(--brand-source-time)] hover:bg-[var(--brand-source-hover-bg)] hover:text-[var(--brand-source-text)]',
                    )}
                  >
                    {searchMode === 'exact' ? (
                      <Search className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[180px] text-center text-xs"
                >
                  {searchMode === 'exact'
                    ? 'Exact — filters & highlights chunks. Switch to Fuzzy.'
                    : 'Fuzzy — finds by topic. Switch to Exact.'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Scrollable list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-3 p-6">
            {searchResults.length > 0 ? (
              searchResults.map(({ citation, visibleChunks }) => (
                <CitationCard
                  key={citation.id}
                  citation={citation}
                  visibleChunks={visibleChunks}
                  query={query}
                  highlightQuery={searchMode === 'exact' ? query : ''}
                  onShowSimilar={(c) => {
                    setSearchMode('fuzzy');
                    setQuery(c.title);
                  }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-[var(--brand-icon-purple-bg)] p-4 mb-4">
                  <FileText className="h-8 w-8 text-[var(--brand-source-icon)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--brand-code-text)] mb-1">
                  {citations.length === 0 ? 'No Sources Yet' : 'No Matches'}
                </h3>
                <p className="text-sm text-[var(--brand-source-time)] max-w-xs">
                  {citations.length === 0
                    ? "This conversation doesn't have any sources yet."
                    : 'Try a different search term.'}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
