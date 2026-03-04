'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChunkMetadata } from '@/types/api';

interface FilePreviewPaneProps {
  url: string | null;
  isLoading: boolean;
  error: string | null;
  fileName: string;
  ext?: string;
  onRetry: () => void;
  // Page-level attachment props (PDF only)
  pages?: number[];
  chunksByPage?: Map<number, ChunkMetadata[]>;
  attachedChunkNumbers?: Set<number>;
  onAttachPage?: (page: number) => void;
  onDetachPage?: (page: number) => void;
}

// ─── Page strip ───────────────────────────────────────────────────────────────

function PageStrip({
  pages,
  chunksByPage,
  attachedChunkNumbers,
  activePage,
  onNavigate,
  onAttachPage,
  onDetachPage,
}: {
  pages: number[];
  chunksByPage: Map<number, ChunkMetadata[]>;
  attachedChunkNumbers: Set<number>;
  activePage: number | null;
  onNavigate: (page: number) => void;
  onAttachPage?: (page: number) => void;
  onDetachPage?: (page: number) => void;
}) {
  if (pages.length === 0) return null;

  return (
    <div className="custom-scrollbar flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-muted/30 px-2 py-1.5">
      <span className="mr-1.5 shrink-0 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Pages
      </span>
      {pages.map((page) => {
        const pageChunks = chunksByPage.get(page) ?? [];
        const attachedCount = pageChunks.filter((c) =>
          attachedChunkNumbers.has(c.chunk_number),
        ).length;
        const isAllAttached =
          pageChunks.length > 0 && attachedCount === pageChunks.length;
        const isPartial = attachedCount > 0 && !isAllAttached;
        const isActive = activePage === page;

        return (
          <div key={page} className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => onNavigate(page)}
              className={cn(
                'rounded px-2 py-0.5 text-[10px] font-semibold transition-colors',
                isActive
                  ? 'bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)] ring-1 ring-[var(--brand-btn-primary)]/40'
                  : isAllAttached
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : isPartial
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-500'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted',
              )}
            >
              p.{page}
            </button>
            {(onAttachPage || onDetachPage) && pageChunks.length > 0 && (
              <button
                onClick={() =>
                  isAllAttached ? onDetachPage?.(page) : onAttachPage?.(page)
                }
                title={
                  isAllAttached ? `Detach page ${page}` : `Attach page ${page}`
                }
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded transition-colors',
                  isAllAttached
                    ? 'text-emerald-500 hover:text-destructive'
                    : 'text-muted-foreground/40 hover:text-emerald-600',
                )}
              >
                {isAllAttached ? (
                  <Minus className="h-2.5 w-2.5" />
                ) : (
                  <Plus className="h-2.5 w-2.5" />
                )}
              </button>
            )}
            <div className="mx-1 h-3 w-px bg-border/40" />
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FilePreviewPane({
  url,
  isLoading,
  error,
  fileName,
  ext,
  onRetry,
  pages = [],
  chunksByPage = new Map(),
  attachedChunkNumbers = new Set(),
  onAttachPage,
  onDetachPage,
}: FilePreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activePage, setActivePage] = useState<number | null>(null);

  // Reset active page when file changes
  useEffect(() => {
    setActivePage(null);
  }, [url]);

  const navigateToPage = useCallback(
    (page: number) => {
      setActivePage(page);
      if (iframeRef.current && url) {
        iframeRef.current.src = `${url}#toolbar=1&navpanes=0&page=${page}`;
      }
    },
    [url],
  );

  // ── Loading ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-fg-accent)]" />
        <span className="text-xs text-muted-foreground">Loading preview…</span>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-7 w-7 text-destructive/60" />
        <p className="text-sm font-medium text-foreground/70">
          Preview unavailable
        </p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-1 gap-1.5"
          onClick={onRetry}
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  // ── No URL yet ────────────────────────────────────────────────────
  if (!url) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No preview available</p>
      </div>
    );
  }

  // ── PDF ───────────────────────────────────────────────────────────
  if (ext === 'pdf') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {pages.length > 0 && (
          <PageStrip
            pages={pages}
            chunksByPage={chunksByPage}
            attachedChunkNumbers={attachedChunkNumbers}
            activePage={activePage}
            onNavigate={navigateToPage}
            onAttachPage={onAttachPage}
            onDetachPage={onDetachPage}
          />
        )}
        <div className="flex flex-1 overflow-hidden">
          <iframe
            ref={iframeRef}
            src={`${url}#toolbar=1&navpanes=0`}
            title={fileName}
            className="flex-1 border-0"
            style={{ minHeight: 0 }}
          />
        </div>
      </div>
    );
  }

  // ── Other file types — download fallback ──────────────────────────
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <FileText className="h-10 w-10 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-medium text-foreground/80">{fileName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Inline preview is only available for PDF files.
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={fileName}
      >
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </a>
    </div>
  );
}
