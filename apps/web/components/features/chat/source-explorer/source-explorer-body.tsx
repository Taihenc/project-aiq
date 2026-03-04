'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, RefreshCw, LayoutGrid, FileText } from 'lucide-react';
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

  // Panel is open when preview mode is active OR when a chunk is selected in chunks mode
  const isRightPanelOpen =
    (viewMode === 'preview' || (viewMode === 'chunks' && !!selectedChunk)) &&
    !!selectedFilePath;

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
                {viewMode === 'preview' ? (
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
                ) : selectedChunk ? (
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
                    isCited={citedChunkNumbers.has(selectedChunk.chunk_number)}
                    onAttach={handleAttachSelected}
                    onDetach={handleDetachSelected}
                    onNavigate={setSelectedChunk}
                    onClose={() => setSelectedChunk(null)}
                  />
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
