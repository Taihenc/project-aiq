'use client';

import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, Sparkles, X } from 'lucide-react';
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
import { CitationCard } from './citation-card';

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
      <SheetContent className="flex flex-col w-[420px] sm:w-[520px] max-w-[calc(100vw-1rem)] border-l border-[var(--brand-source-border)] bg-background dark:bg-[var(--brand-surface-purple)] p-0 gap-0">
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
        <ScrollArea className="flex-1 min-h-0 [&>[data-slot=scroll-area-viewport]>div]:!block">
          <div className="flex flex-col gap-3 p-6 min-w-0">
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
