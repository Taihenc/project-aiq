'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  RefreshCw,
  LayoutGrid,
  FileText,
  X,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { sharePointApi } from '@/lib/api/sharepoint';
import { FileExtBadge } from '../attachment-pill';
import { SourceHeatmapGrid, HeatmapQuickActions } from './source-heatmap-grid';
import { ChunkContentReader } from './chunk-content-reader';
import { FilePreviewPane } from './file-preview-pane';
import type { useSourceExplorerBody } from './useSourceExplorerBody';
import type { ChunkMetadata } from '@/types/api';

// ─── FileRow ─────────────────────────────────────────────────────────────────

export function FileRow({
  filePath,
  name,
  ext,
  citedCount,
  attachedCount,
  isSelected,
  onSelect,
}: {
  filePath: string;
  name: string;
  ext?: string;
  citedCount: number;
  attachedCount: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  void filePath; // referenced externally, suppresses lint warning
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors',
        isSelected
          ? 'bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)]'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <FileExtBadge ext={ext ?? ''} />
      <span className="min-w-0 flex-1 truncate text-xs font-medium leading-tight">
        {name}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        {citedCount > 0 && (
          <span className="rounded-full bg-[var(--brand-citation-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--brand-fg-accent)]">
            {citedCount}
          </span>
        )}
        {attachedCount > 0 && (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            {attachedCount}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Payload preview pane ────────────────────────────────────────────────────

export function PayloadPreviewPane({
  attachedChunks,
  citedChunkNumbers,
  onDetachChunk,
}: {
  attachedChunks: ChunkMetadata[];
  citedChunkNumbers: Set<number>;
  onDetachChunk?: (chunk: ChunkMetadata) => void;
}) {
  const sorted = useMemo(
    () => [...attachedChunks].sort((a, b) => a.chunk_number - b.chunk_number),
    [attachedChunks],
  );

  const charCount = useMemo(
    () => attachedChunks.reduce((s, c) => s + (c.content?.length ?? 0), 0),
    [attachedChunks],
  );

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <Package className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Payload
        </span>
        {attachedChunks.length > 0 && (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            {attachedChunks.length}
          </span>
        )}
        {charCount > 0 && (
          <span className="ml-auto text-[9px] tabular-nums text-muted-foreground/60">
            ~{charCount.toLocaleString()} chars
          </span>
        )}
      </div>

      {/* ── Body ── */}
      {attachedChunks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-border/60 text-muted-foreground/30">
            <Package className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-medium text-muted-foreground">
            No chunks attached yet
          </p>
          <p className="max-w-[160px] text-[10px] leading-relaxed text-muted-foreground/50">
            Click or drag cells in the grid to add chunks to your payload
          </p>
        </div>
      ) : (
        <div className="custom-scrollbar flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-2">
            {sorted.map((chunk) => {
              const isCited = citedChunkNumbers.has(chunk.chunk_number);
              return (
                <div
                  key={chunk.chunk_number}
                  className={cn(
                    'relative overflow-hidden rounded-lg border transition-colors',
                    isCited
                      ? 'border-[var(--brand-btn-primary)]/25 bg-[var(--brand-surface-purple)]/60'
                      : 'border-emerald-400/25 bg-emerald-50/40 dark:bg-emerald-950/15',
                  )}
                >
                  {/* Card header */}
                  <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
                    <span
                      className={cn(
                        'flex h-5 min-w-[1.75rem] shrink-0 items-center justify-center rounded text-[10px] font-bold',
                        isCited
                          ? 'bg-[var(--brand-citation-bg)] text-[var(--brand-fg-accent)]'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
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
                    {/* Detach button */}
                    <button
                      onClick={() => onDetachChunk?.(chunk)}
                      title="Remove from payload"
                      className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  {/* Content excerpt */}
                  {chunk.content ? (
                    <div className="relative px-2.5 pb-2.5 pt-0.5">
                      <p className="line-clamp-6 text-[11px] leading-relaxed text-foreground/65 whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {chunk.content}
                      </p>
                      {/* Bottom fade to signal clipped text */}
                      {chunk.content.length > 200 && (
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-card/80 to-transparent" />
                      )}
                    </div>
                  ) : (
                    <p className="px-2.5 pb-2 text-[10px] italic text-muted-foreground/40">
                      No content preview
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared body ─────────────────────────────────────────────────────────────

type BodyHook = ReturnType<typeof useSourceExplorerBody>;

interface SourceExplorerBodyViewProps extends BodyHook {
  /** px width for the file list sidebar */
  sidebarWidth?: number;
  /** width of the content reader when open — px number or CSS string e.g. '50%' */
  readerWidth?: number | string;
}

export function SourceExplorerBodyView({
  sidebarWidth = 200,
  readerWidth = 380 as number | string,
  // from hook
  fileList,
  fileListLoading,
  selectedFile,
  selectedChunks,
  isLoadingChunks,
  citedChunkNumbers,
  attachedChunkNumbers,
  fileCountMap,
  selectedChunk,
  setSelectedChunk,
  handleSelectChunk,
  handleAttachSelected,
  handleDetachSelected,
  handleAttachAllCited,
  handleAttachAll,
  handleClearAll,
  handleAttachPage,
  handleDetachPage,
  handleAttachChunk,
  handleDetachChunk,
  selectFile,
  refreshFile,
  selectedFilePath,
}: SourceExplorerBodyViewProps) {
  const handleFileSelect = useCallback(
    (fp: string) => selectFile(fp),
    [selectFile],
  );

  // Switch to chunks mode AND open the chunk reader
  const handleSelectChunkWithMode = useCallback(
    (chunk: ChunkMetadata) => {
      setViewMode('chunks');
      handleSelectChunk(chunk);
    },
    [handleSelectChunk],
  );

  // Close the chunk reader when heatmap switches to Select mode (free up space)
  const handleHeatmapModeChange = useCallback(
    (mode: 'read' | 'select') => {
      setHeatmapMode(mode);
      if (mode === 'select') {
        setSelectedChunk(null);
      }
    },
    [setSelectedChunk],
  );

  // ── chunksByPage + sorted page list ─────────────────────────────
  const chunksByPage = useMemo(() => {
    const map = new Map<number, ChunkMetadata[]>();
    for (const c of selectedChunks) {
      const pg = c.page_number ?? 0;
      if (!map.has(pg)) map.set(pg, []);
      map.get(pg)!.push(c);
    }
    return map;
  }, [selectedChunks]);

  const availablePages = useMemo(
    () =>
      Array.from(chunksByPage.keys())
        .filter((p) => p > 0)
        .sort((a, b) => a - b),
    [chunksByPage],
  );

  // ── Preview state ────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'chunks' | 'preview'>('chunks');
  const [heatmapMode, setHeatmapMode] = useState<'read' | 'select'>('read');
  const [heatmapSearch, setHeatmapSearch] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Reset preview data when file changes; revoke old blob URL
  // viewMode is intentionally preserved so chunks/preview mode persists across file switches
  useEffect(() => {
    setPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewError(null);
  }, [selectedFilePath]);

  // When already in preview mode, auto-fetch the new file's preview on file switch
  useEffect(() => {
    if (viewMode === 'preview' && selectedFilePath) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilePath]);

  const fetchPreview = useCallback(async () => {
    if (!selectedFilePath) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const blob = await sharePointApi.getFileBlob(selectedFilePath);
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    } catch {
      setPreviewError(
        'Could not retrieve the file. It may not be available in storage.',
      );
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedFilePath]);

  const handleSwitchToPreview = useCallback(() => {
    setViewMode('preview');
    // Only fetch if we don't have the URL yet
    if (!previewUrl && !previewLoading) fetchPreview();
  }, [previewUrl, previewLoading, fetchPreview]);

  const handleRetryPreview = useCallback(() => {
    setPreviewUrl(null);
    fetchPreview();
  }, [fetchPreview]);

  // Panel is open when: preview mode, OR select mode (always show payload), OR chunk selected in read mode
  const isRightPanelOpen =
    !!selectedFilePath &&
    (viewMode === 'preview' ||
      (viewMode === 'chunks' && heatmapMode === 'select') ||
      (viewMode === 'chunks' && !!selectedChunk));

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── File list sidebar ─────────────────────────────────── */}
      <div
        className="flex shrink-0 flex-col border-r border-border"
        style={{ width: sidebarWidth }}
      >
        <div className="border-b border-border px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Indexed Files
          </span>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto p-1.5">
          {fileListLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-fg-accent)]" />
            </div>
          ) : fileList.length === 0 ? (
            <p className="px-2 py-4 text-center text-[11px] text-muted-foreground">
              No files found
            </p>
          ) : (
            fileList.map((file) => {
              const counts = fileCountMap.get(file.file_path) ?? {
                citedCount: 0,
                attachedCount: 0,
              };
              return (
                <FileRow
                  key={file.file_path}
                  filePath={file.file_path}
                  name={file.name}
                  ext={file.ext}
                  citedCount={counts.citedCount}
                  attachedCount={counts.attachedCount}
                  isSelected={selectedFilePath === file.file_path}
                  onSelect={() => handleFileSelect(file.file_path)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* ── Heatmap area (always flex-1, reader pushes from right) ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedFilePath ? (
          <>
            {/* File header */}
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
              <FileExtBadge ext={selectedFile?.ext ?? ''} />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                {selectedFile?.name ?? selectedFilePath.split('/').pop()}
              </span>
              {/* Quick actions inline */}
              {viewMode === 'chunks' && (
                <HeatmapQuickActions
                  hasCited={citedChunkNumbers.size > 0}
                  hasAttached={attachedChunkNumbers.size > 0}
                  onAttachAllCited={handleAttachAllCited}
                  onAttachAll={handleAttachAll}
                  onClearAll={handleClearAll}
                  compact={isRightPanelOpen}
                />
              )}
              <div className="flex items-center gap-1">
                {/* Chunks / Preview tab toggle */}
                <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
                  <button
                    onClick={() => setViewMode('chunks')}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors',
                      viewMode === 'chunks'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <LayoutGrid className="h-2.5 w-2.5" />
                    Chunks
                  </button>
                  <button
                    onClick={handleSwitchToPreview}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors',
                      viewMode === 'preview'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <FileText className="h-2.5 w-2.5" />
                    Preview
                  </button>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-5 w-5 rounded text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                      onClick={() => refreshFile(selectedFilePath)}
                      disabled={isLoadingChunks}
                    >
                      <RefreshCw
                        className={cn(
                          'h-2.5 w-2.5',
                          isLoadingChunks && 'animate-spin',
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Refresh
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            {/* Grid or file preview */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
              <SourceHeatmapGrid
                chunks={selectedChunks}
                citedChunkNumbers={citedChunkNumbers}
                attachedChunkNumbers={attachedChunkNumbers}
                isLoading={isLoadingChunks}
                onSelectChunk={handleSelectChunkWithMode}
                selectedChunkNumber={selectedChunk?.chunk_number}
                onAttachPage={handleAttachPage}
                onDetachPage={handleDetachPage}
                onAttachChunk={handleAttachChunk}
                onDetachChunk={handleDetachChunk}
                onModeChange={handleHeatmapModeChange}
                onSearchChange={setHeatmapSearch}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Select a file to explore chunks
            </p>
          </div>
        )}
      </div>

      {/* ── Right panel: chunk reader OR file preview (slides in from right) ── */}
      <AnimatePresence initial={false}>
        {isRightPanelOpen && (
          <motion.div
            key={`panel-${selectedFilePath}`}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: readerWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
          >
            {/* w-px separator avoids border-l 1px ghost during width animation */}
            <div className="flex h-full" style={{ width: '100%' }}>
              <div className="w-px shrink-0 bg-border" />
              <div className="flex h-full flex-1 flex-col overflow-hidden">
                {/* Cross-fade between panel content types */}
                <AnimatePresence mode="wait" initial={false}>
                  {viewMode === 'preview' ? (
                    <motion.div
                      key="file-preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="flex h-full flex-col"
                    >
                      <FilePreviewPane
                        url={previewUrl}
                        isLoading={previewLoading}
                        error={previewError}
                        fileName={
                          selectedFile?.name ??
                          selectedFilePath?.split('/').pop() ??
                          ''
                        }
                        ext={selectedFile?.ext}
                        onRetry={handleRetryPreview}
                        pages={availablePages}
                        chunksByPage={chunksByPage}
                        attachedChunkNumbers={attachedChunkNumbers}
                        onAttachPage={handleAttachPage}
                        onDetachPage={handleDetachPage}
                      />
                    </motion.div>
                  ) : heatmapMode === 'select' ? (
                    <motion.div
                      key="payload-preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="flex h-full flex-col"
                    >
                      <PayloadPreviewPane
                        attachedChunks={selectedChunks.filter((c) =>
                          attachedChunkNumbers.has(c.chunk_number),
                        )}
                        citedChunkNumbers={citedChunkNumbers}
                        onDetachChunk={handleDetachChunk}
                      />
                    </motion.div>
                  ) : selectedChunk ? (
                    <motion.div
                      key="chunk-reader"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="flex h-full flex-col"
                    >
                      <ChunkContentReader
                        chunk={selectedChunk}
                        allChunks={selectedChunks}
                        fileName={
                          selectedFile?.name ??
                          selectedFilePath?.split('/').pop() ??
                          ''
                        }
                        fileExt={selectedFile?.ext}
                        isAttached={attachedChunkNumbers.has(
                          selectedChunk.chunk_number,
                        )}
                        isCited={citedChunkNumbers.has(
                          selectedChunk.chunk_number,
                        )}
                        onAttach={handleAttachSelected}
                        onDetach={handleDetachSelected}
                        onNavigate={setSelectedChunk}
                        onClose={() => setSelectedChunk(null)}
                        highlightQuery={heatmapSearch || undefined}
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
