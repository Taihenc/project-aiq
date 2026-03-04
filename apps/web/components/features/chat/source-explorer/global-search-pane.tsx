'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, X, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileExtBadge } from '../attachment-pill';
import type { ChunkMetadata, SourceFile } from '@/types/api';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GlobalSearchPaneProps {
  fileList: SourceFile[];
  chunksCache: Record<string, ChunkMetadata[]>;
  loadingFiles: Set<string>;
  fileCountMap: Map<string, { citedCount: number; attachedCount: number }>;
  onSelectFile: (filePath: string) => void;
  onSelectChunk: (filePath: string, chunk: ChunkMetadata) => void;
  /** Trigger background loading of all uncached files */
  onLoadAllFiles: () => void;
  onClose: () => void;
}

// ─── Highlight helper ─────────────────────────────────────────────────────────

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

function HighlightText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const segments = highlightSegments(text, query);
  return (
    <span className={className}>
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
    </span>
  );
}

// ─── Individual chunk result card ─────────────────────────────────────────────

function ChunkResultCard({
  chunk,
  query,
  isCited,
  isAttached,
  onClick,
}: {
  chunk: ChunkMetadata;
  query: string;
  isCited: boolean;
  isAttached: boolean;
  onClick: () => void;
}) {
  const content = chunk.content ?? '';
  const qLower = query.toLowerCase();
  const idx = content.toLowerCase().indexOf(qLower);
  let excerpt = content;
  if (content.length > 260) {
    if (idx !== -1) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(content.length, idx + qLower.length + 180);
      excerpt =
        (start > 0 ? '…' : '') +
        content.slice(start, end) +
        (end < content.length ? '…' : '');
    } else {
      excerpt = content.slice(0, 260) + '…';
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full overflow-hidden rounded-lg border text-left transition-colors',
        isCited
          ? 'border-[var(--brand-btn-primary)]/20 bg-[var(--brand-surface-purple)]/40 hover:bg-[var(--brand-surface-purple)]/70'
          : isAttached
            ? 'border-emerald-400/25 bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-950/15 dark:hover:bg-emerald-950/30'
            : 'border-border/40 bg-muted/20 hover:bg-muted/50',
      )}
    >
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
      {content && (
        <p className="px-2.5 pb-2.5 text-[11px] leading-relaxed text-foreground/75 [overflow-wrap:anywhere]">
          {highlightSegments(excerpt, query).map((seg, i) =>
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
}

// ─── File group ───────────────────────────────────────────────────────────────

function FileGroup({
  file,
  matchingChunks,
  query,
  fileCountMap,
  onSelectFile,
  onSelectChunk,
}: {
  file: SourceFile;
  matchingChunks: ChunkMetadata[];
  query: string;
  fileCountMap: Map<string, { citedCount: number; attachedCount: number }>;
  onSelectFile: (fp: string) => void;
  onSelectChunk: (fp: string, chunk: ChunkMetadata) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const counts = fileCountMap.get(file.file_path) ?? {
    citedCount: 0,
    attachedCount: 0,
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/60">
      {/* Group header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        )}
        <FileExtBadge ext={file.ext ?? ''} />
        <span className="min-w-0 flex-1 truncate text-left">
          <HighlightText
            text={file.name}
            query={query}
            className="text-[12px] font-medium"
          />
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {counts.citedCount > 0 && (
            <span className="rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-fg-accent)]">
              {counts.citedCount} cited
            </span>
          )}
          {counts.attachedCount > 0 && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              {counts.attachedCount} attached
            </span>
          )}
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
            {matchingChunks.length} chunk
            {matchingChunks.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectFile(file.file_path);
            }}
            className="rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:border-[var(--brand-btn-primary)]/40 hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-accent)] transition-colors"
          >
            Open
          </button>
        </div>
      </button>

      {/* Chunk cards */}
      {expanded && (
        <div className="flex flex-col gap-1.5 border-t border-border/40 p-2">
          {matchingChunks.map((chunk) => {
            const fileCounts = fileCountMap.get(file.file_path) ?? {
              citedCount: 0,
              attachedCount: 0,
            };
            // We approximate isCited/isAttached at file level since we don't have per-chunk set here.
            // Callers (body/panel) pass overall counts; for individual chunk status we just use defaults.
            void fileCounts;
            return (
              <ChunkResultCard
                key={chunk.chunk_number}
                chunk={chunk}
                query={query}
                isCited={false}
                isAttached={false}
                onClick={() => onSelectChunk(file.file_path, chunk)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GlobalSearchPane({
  fileList,
  chunksCache,
  loadingFiles,
  fileCountMap,
  onSelectFile,
  onSelectChunk,
  onLoadAllFiles,
  onClose,
}: GlobalSearchPaneProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Debounce content search by 150ms; auto-load all files on first query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.trim()) onLoadAllFiles();
    }, 150);
    return () => clearTimeout(t);
  }, [query, onLoadAllFiles]);

  const q = debouncedQuery.trim().toLowerCase();

  // File-name matches (instant)
  const fileNameMatches = useMemo(() => {
    if (!q) return [];
    return fileList.filter((f) => f.name.toLowerCase().includes(q));
  }, [q, fileList]);

  // Content matches grouped by file
  const contentMatchGroups = useMemo(() => {
    if (!q) return [];
    const groups: { file: SourceFile; chunks: ChunkMetadata[] }[] = [];
    for (const file of fileList) {
      const cached = chunksCache[file.file_path];
      if (!cached || cached.length === 0) continue;
      const matching = cached.filter(
        (c) =>
          c.content?.toLowerCase().includes(q) ||
          String(c.chunk_number).includes(q),
      );
      if (matching.length > 0) groups.push({ file, chunks: matching });
    }
    return groups;
  }, [q, fileList, chunksCache]);

  const loadedCount = Object.keys(chunksCache).length;
  const totalCount = fileList.length;
  void loadedCount;
  void totalCount;
  const isLoadingSome = loadingFiles.size > 0;

  const totalContentMatches = contentMatchGroups.reduce(
    (s, g) => s + g.chunks.length,
    0,
  );

  const handleLoadAll = useCallback(() => {
    onLoadAllFiles();
  }, [onLoadAllFiles]);
  void handleLoadAll; // kept for potential external use

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      {/* ── Search input header ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-[var(--brand-fg-accent)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files and chunks…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onClose}
          className="ml-1 flex h-6 w-6 items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Close global search (Esc)"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* ── Results ── */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {!q ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-border/50 text-muted-foreground/30">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Search across all files
            </p>
            <p className="max-w-[220px] text-[11px] leading-relaxed text-muted-foreground/60">
              Type to search file names and chunk contents
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-4">
            {/* ── File name matches ── */}
            {fileNameMatches.length > 0 && (
              <section className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Files
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                    {fileNameMatches.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {fileNameMatches.map((file) => {
                    const counts = fileCountMap.get(file.file_path) ?? {
                      citedCount: 0,
                      attachedCount: 0,
                    };
                    return (
                      <button
                        key={file.file_path}
                        onClick={() => onSelectFile(file.file_path)}
                        className="flex w-full items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                      >
                        <FileExtBadge ext={file.ext ?? ''} />
                        <span className="min-w-0 flex-1 truncate">
                          <HighlightText
                            text={file.name}
                            query={debouncedQuery}
                            className="text-[12px] font-medium"
                          />
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          {counts.citedCount > 0 && (
                            <span className="rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-fg-accent)]">
                              {counts.citedCount}
                            </span>
                          )}
                          {counts.attachedCount > 0 && (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                              {counts.attachedCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Content matches ── */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Chunk content
                </span>
                {contentMatchGroups.length > 0 && (
                  <span className="rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-fg-accent)]">
                    {totalContentMatches} in {contentMatchGroups.length} file
                    {contentMatchGroups.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Loading indicator */}
              {isLoadingSome && (
                <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground/60" />
                  <p className="flex-1 text-[10px] text-muted-foreground/70">
                    Loading chunks for {loadingFiles.size} file
                    {loadingFiles.size !== 1 ? 's' : ''}…
                  </p>
                </div>
              )}

              {contentMatchGroups.length === 0 && !isLoadingSome ? (
                <p className="py-4 text-center text-[11px] text-muted-foreground/60">
                  No chunk content matches.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {contentMatchGroups.map(({ file, chunks }) => (
                    <FileGroup
                      key={file.file_path}
                      file={file}
                      matchingChunks={chunks}
                      query={debouncedQuery}
                      fileCountMap={fileCountMap}
                      onSelectFile={onSelectFile}
                      onSelectChunk={onSelectChunk}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Zero results total */}
            {fileNameMatches.length === 0 &&
              contentMatchGroups.length === 0 &&
              !isLoadingSome && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    No results
                  </p>
                  <p className="text-[11px] text-muted-foreground/50">
                    Try a different keyword or file name
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
