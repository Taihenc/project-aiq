'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  motion,
  AnimatePresence,
  useDragControls,
  useMotionValue,
} from 'motion/react';
import {
  LayoutGrid,
  FileText,
  X,
  Minus,
  Maximize2,
  GripHorizontal,
  RefreshCw,
  Loader2,
  Search,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { sharePointApi } from '@/lib/api/sharepoint';
import { useSourceExplorerStore } from '@/hooks/useSourceExplorer';
import { FileExtBadge } from '../attachment-pill';
import { SourceHeatmapGrid, HeatmapQuickActions } from './source-heatmap-grid';
import { ChunkContentReader } from './chunk-content-reader';
import { FilePreviewPane } from './file-preview-pane';
import { PayloadPreviewPane } from './source-explorer-body';
import { GlobalSearchPane } from './global-search-pane';
import { FileRow } from './file-row';
import { PANEL_W, PANEL_H } from './constants';
import { buildFileCountMap } from '@/lib/source-explorer/file-count-map';
import { useExcludeStore } from '@/hooks/useExcludeStore';
import {
  createAttachmentFileRef,
  getAttachmentFileId,
  getCitationFileId,
  hasFileIdentifier,
  getPathDisplayName,
  getSourceFileDisplayName,
  getSourceFileId,
} from '@/lib/utils/file-identity';
import type { Citation, ChunkMetadata, FileRef, SourceFile } from '@/types/api';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SourceExplorerPanelProps {
  attachments: FileRef[];
  availableCitations: Citation[];
  onAddAttachment: (att: FileRef) => void;
  onRemoveChunk: (fileId: string, chunkNumber: number) => void;
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function SourceExplorerPanel({
  attachments,
  availableCitations,
  onAddAttachment,
  onRemoveChunk,
}: SourceExplorerPanelProps) {
  const {
    mode,
    isOpen,
    selectedFilePath,
    chunksCache,
    loadingFiles,
    close,
    enterFullscreen,
    selectFile,
    refreshFile,
    openAtChunk,
    pendingChunkTarget,
    clearPendingChunkTarget,
  } = useSourceExplorerStore();

  const {
    excludedIdentifiers,
    toggle: toggleExclude,
    clearAll: clearAllExcluded,
  } = useExcludeStore();

  const [minimized, setMinimized] = useState(false);
  const [fileList, setFileList] = useState<SourceFile[]>([]);
  const [fileListLoading, setFileListLoading] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<ChunkMetadata | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<'chunks' | 'preview'>('chunks');
  const [heatmapMode, setHeatmapMode] = useState<'read' | 'select'>('read');
  const [heatmapSearch, setHeatmapSearch] = useState('');
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const panelX = useMotionValue(0);
  const panelY = useMotionValue(0);

  // When expanding: clamp panelY so the full panel stays inside the viewport.
  // Panel's effective top = (vh - 88 + panelY) - (PANEL_H + TITLE_H)
  // We need that >= margin, so panelY >= margin + 88 + PANEL_H + TITLE_H - vh
  useEffect(() => {
    if (minimized) return;
    const BOTTOM_CSS_PX = 88; // 5.5rem × 16
    const TITLE_H = 44;
    const margin = 12;
    const minY =
      margin + BOTTOM_CSS_PX + PANEL_H + TITLE_H - window.innerHeight;
    if (panelY.get() < minY) panelY.set(minY);
  }, [minimized, panelY]);

  // Load file list once on open
  useEffect(() => {
    if (!isOpen || mode !== 'floating') return;
    let cancelled = false;
    setFileListLoading(true);
    sharePointApi
      .getIndexedFiles()
      .then((files) => {
        if (cancelled) return;
        setFileList(files);
        // Auto-select first file if none selected
        if (!selectedFilePath && files.length > 0) {
          selectFile(getSourceFileId(files[0]));
        }
      })
      .catch(() => {
        if (!cancelled) setFileList([]);
      })
      .finally(() => {
        if (!cancelled) setFileListLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  // Derived: chunks for selected file
  const selectedChunks = useMemo<ChunkMetadata[]>(
    () =>
      (selectedFilePath ? (chunksCache[selectedFilePath] ?? []) : [])
        .slice()
        .sort((a, b) => a.chunk_number - b.chunk_number),
    [selectedFilePath, chunksCache],
  );
  const isLoadingChunks = selectedFilePath
    ? loadingFiles.has(selectedFilePath)
    : false;

  // Cited chunk numbers for selected file
  const citedChunkNumbers = useMemo(() => {
    if (!selectedFilePath) return new Set<number>();
    const citation = availableCitations.find(
      (c) => getCitationFileId(c) === selectedFilePath,
    );
    return new Set<number>((citation?.chunks ?? []).map((c) => c.chunk_number));
  }, [availableCitations, selectedFilePath]);

  // Attached chunk numbers for selected file
  const attachedChunkNumbers = useMemo(() => {
    if (!selectedFilePath) return new Set<number>();
    const att = attachments.find(
      (a) => getAttachmentFileId(a) === selectedFilePath,
    );
    return new Set<number>((att?.chunks ?? []).map((c) => c.chunk_number));
  }, [attachments, selectedFilePath]);

  // Per-page groupings for FilePreviewPane
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

  // Per-file citation + attachment counts for the sidebar
  const fileCountMap = useMemo(
    () => buildFileCountMap(availableCitations, attachments),
    [availableCitations, attachments],
  );

  // Select a chunk for reading
  const handleSelectChunk = useCallback((chunk: ChunkMetadata) => {
    setSelectedChunk((prev) =>
      prev?.chunk_number === chunk.chunk_number ? null : chunk,
    );
  }, []);

  // Switch select/read mode — opening select mode closes the chunk reader
  const handleHeatmapModeChange = useCallback((mode: 'read' | 'select') => {
    setHeatmapMode(mode);
    if (mode === 'select') setSelectedChunk(null);
  }, []);

  // Attach / detach for the currently-reading chunk
  const handleAttachSelected = useCallback(() => {
    if (!selectedFilePath || !selectedChunk) return;
    onAddAttachment(
      createAttachmentFileRef({
        fileId: selectedFilePath,
        filePath:
          fileList.find((f) => getSourceFileId(f) === selectedFilePath)
            ?.file_path ?? selectedFilePath,
        chunks: [selectedChunk],
        content: selectedChunk.content,
      }),
    );
  }, [selectedFilePath, selectedChunk, onAddAttachment, fileList]);

  const handleDetachSelected = useCallback(() => {
    if (!selectedFilePath || !selectedChunk) return;
    onRemoveChunk(selectedFilePath, selectedChunk.chunk_number);
  }, [selectedFilePath, selectedChunk, onRemoveChunk]);

  // Auto-navigate to a pending chunk when chunks are loaded (triggered from SourceCard)
  useEffect(() => {
    if (!isOpen || mode !== 'floating') return;
    if (!pendingChunkTarget || selectedChunks.length === 0) return;
    if (pendingChunkTarget.filePath !== selectedFilePath) return;
    const target = selectedChunks.find(
      (c) => c.chunk_number === pendingChunkTarget.chunkNumber,
    );
    if (!target) return;
    setViewMode('chunks');
    setHeatmapMode('read');
    setSelectedChunk(target);
    clearPendingChunkTarget();
  }, [
    isOpen,
    mode,
    pendingChunkTarget,
    selectedFilePath,
    selectedChunks,
    clearPendingChunkTarget,
  ]);

  // Reset selectedChunk + preview data when file changes; revoke old blob URL
  // viewMode is intentionally preserved so chunks/preview mode persists across file switches
  // pendingChunkTarget is the render-time subscribed value (not getState()), so the
  // closure captures the pre-clear value even if the pending-chunk effect cleared it first.
  useEffect(() => {
    if (pendingChunkTarget === null) {
      setSelectedChunk(null);
    }
    setPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewError(null);
  }, [selectedFilePath, pendingChunkTarget]);

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
      setPreviewUrl(URL.createObjectURL(blob));
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
    if (!previewUrl && !previewLoading) fetchPreview();
  }, [previewUrl, previewLoading, fetchPreview]);

  const handleRetryPreview = useCallback(() => {
    setPreviewUrl(null);
    fetchPreview();
  }, [fetchPreview]);

  // Quick actions
  const handleAttachAllCited = useCallback(() => {
    if (!selectedFilePath) return;
    const citedChunks = selectedChunks.filter((c) =>
      citedChunkNumbers.has(c.chunk_number),
    );
    if (citedChunks.length === 0) return;
    onAddAttachment(
      createAttachmentFileRef({
        fileId: selectedFilePath,
        filePath:
          fileList.find((f) => getSourceFileId(f) === selectedFilePath)
            ?.file_path ?? selectedFilePath,
        chunks: citedChunks,
      }),
    );
  }, [
    selectedFilePath,
    selectedChunks,
    citedChunkNumbers,
    onAddAttachment,
    fileList,
  ]);

  const handleAttachAll = useCallback(() => {
    if (!selectedFilePath || selectedChunks.length === 0) return;
    onAddAttachment(
      createAttachmentFileRef({
        fileId: selectedFilePath,
        filePath:
          fileList.find((f) => getSourceFileId(f) === selectedFilePath)
            ?.file_path ?? selectedFilePath,
        chunks: selectedChunks,
      }),
    );
  }, [selectedFilePath, selectedChunks, onAddAttachment, fileList]);

  const handleClearAll = useCallback(() => {
    if (!selectedFilePath) return;
    for (const chunk of selectedChunks) {
      if (attachedChunkNumbers.has(chunk.chunk_number)) {
        onRemoveChunk(selectedFilePath, chunk.chunk_number);
      }
    }
  }, [selectedFilePath, selectedChunks, attachedChunkNumbers, onRemoveChunk]);

  const handleAttachPage = useCallback(
    (page: number) => {
      if (!selectedFilePath) return;
      const pageChunks = selectedChunks.filter(
        (c) => (c.page_number ?? 0) === page,
      );
      if (pageChunks.length > 0)
        onAddAttachment(
          createAttachmentFileRef({
            fileId: selectedFilePath,
            filePath:
              fileList.find((f) => getSourceFileId(f) === selectedFilePath)
                ?.file_path ?? selectedFilePath,
            chunks: pageChunks,
          }),
        );
    },
    [selectedFilePath, selectedChunks, onAddAttachment, fileList],
  );

  const handleDetachPage = useCallback(
    (page: number) => {
      if (!selectedFilePath) return;
      const pageChunks = selectedChunks.filter(
        (c) => (c.page_number ?? 0) === page,
      );
      for (const chunk of pageChunks)
        onRemoveChunk(selectedFilePath, chunk.chunk_number);
    },
    [selectedFilePath, selectedChunks, onRemoveChunk],
  );

  const handleAttachChunk = useCallback(
    (chunk: ChunkMetadata) => {
      if (!selectedFilePath) return;
      onAddAttachment(
        createAttachmentFileRef({
          fileId: selectedFilePath,
          filePath:
            fileList.find((f) => getSourceFileId(f) === selectedFilePath)
              ?.file_path ?? selectedFilePath,
          chunks: [chunk],
          content: chunk.content,
        }),
      );
    },
    [selectedFilePath, onAddAttachment, fileList],
  );

  const handleDetachChunk = useCallback(
    (chunk: ChunkMetadata) => {
      if (!selectedFilePath) return;
      onRemoveChunk(selectedFilePath, chunk.chunk_number);
    },
    [selectedFilePath, onRemoveChunk],
  );

  if (mode !== 'floating') return null;

  return (
    <>
      {/* Viewport drag constraints */}
      <div
        ref={constraintsRef}
        className="pointer-events-none fixed inset-0 z-200"
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={minimized ? false : constraintsRef}
            dragMomentum={false}
            dragElastic={0}
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            style={{
              x: panelX,
              y: panelY,
              position: 'fixed',
              bottom: '5.5rem',
              right: '1.5rem',
              zIndex: 201,
              width: PANEL_W,
              minWidth: PANEL_W,
              maxWidth: PANEL_W,
            }}
            className="source-explorer-panel flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_48px_-16px_rgba(102,88,204,0.35),0_2px_8px_-2px_rgba(0,0,0,0.12)]"
          >
            {/* ── Title bar ─────────────────────────────────────── */}
            <div
              className="flex cursor-grab items-center gap-2.5 border-b border-border bg-[var(--brand-surface-light)] px-4 py-2.5 active:cursor-grabbing"
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                dragControls.start(e);
              }}
            >
              <GripHorizontal className="pointer-events-none h-3.5 w-3.5 shrink-0 text-[var(--brand-fg-muted)]" />
              <LayoutGrid className="h-4 w-4 shrink-0 text-[var(--brand-fg-light)]" />
              <span className="font-kiona flex-1 text-sm font-medium text-[var(--brand-fg-dark)]">
                Source Explorer
              </span>

              {/* Global search toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      'h-6 w-6 rounded-lg',
                      globalSearchOpen
                        ? 'bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)]'
                        : 'text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]',
                    )}
                    onClick={() => setGlobalSearchOpen((v) => !v)}
                  >
                    <Search className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Search all files
                </TooltipContent>
              </Tooltip>

              {selectedFilePath && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                      onClick={() => refreshFile(selectedFilePath)}
                      disabled={isLoadingChunks}
                    >
                      <RefreshCw
                        className={cn(
                          'h-3 w-3',
                          isLoadingChunks && 'animate-spin',
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Refresh chunks
                  </TooltipContent>
                </Tooltip>
              )}

              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                      onClick={enterFullscreen}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Fullscreen
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                  onClick={() => setMinimized((v) => !v)}
                  title={minimized ? 'Expand' : 'Minimize'}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={close}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* ── Content ───────────────────────────────────────── */}
            <AnimatePresence initial={false}>
              {!minimized && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: PANEL_H, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  className="flex overflow-hidden"
                >
                  {/* ── Global search overlay ── */}
                  {globalSearchOpen ? (
                    <GlobalSearchPane
                      fileList={fileList}
                      chunksCache={chunksCache}
                      loadingFiles={loadingFiles}
                      fileCountMap={fileCountMap}
                      onSelectFile={(fp) => {
                        selectFile(fp);
                        setGlobalSearchOpen(false);
                      }}
                      onSelectChunk={(fp, chunk) => {
                        void openAtChunk(fp, chunk.chunk_number);
                        setGlobalSearchOpen(false);
                      }}
                      onLoadAllFiles={() => {
                        fileList.forEach((f) => {
                          const fileId = getSourceFileId(f);
                          if (!chunksCache[fileId]) selectFile(fileId);
                        });
                      }}
                      onClose={() => setGlobalSearchOpen(false)}
                    />
                  ) : (
                    <>
                      {/* File list sidebar */}
                      <div className="flex w-[200px] shrink-0 flex-col border-r border-border">
                        <div className="flex items-center justify-between border-b border-border px-3 py-2">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Files
                          </span>
                          <button
                            onClick={() => setGlobalSearchOpen((v) => !v)}
                            title="Search across all files"
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded transition-colors',
                              globalSearchOpen
                                ? 'bg-[var(--brand-surface-purple)] text-[var(--brand-fg-accent)]'
                                : 'text-muted-foreground/50 hover:bg-muted hover:text-foreground',
                            )}
                          >
                            <Search className="h-3 w-3" />
                          </button>
                        </div>
                        {/* ── Active files — scrollable ── */}
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
                            fileList
                              .filter(
                                (f) =>
                                  !hasFileIdentifier(
                                    excludedIdentifiers,
                                    getSourceFileId(f),
                                    f.file_path,
                                  ),
                              )
                              .map((file) => {
                                const fileId = getSourceFileId(file);
                                const counts = fileCountMap.get(fileId) ?? {
                                  citedCount: 0,
                                  attachedCount: 0,
                                };
                                return (
                                  <FileRow
                                    key={fileId}
                                    filePath={fileId}
                                    name={getSourceFileDisplayName(file)}
                                    ext={file.ext}
                                    citedCount={counts.citedCount}
                                    attachedCount={counts.attachedCount}
                                    isSelected={selectedFilePath === fileId}
                                    onSelect={() => selectFile(fileId)}
                                    isExcluded={false}
                                    onToggleExclude={() =>
                                      toggleExclude(fileId, file.file_path)
                                    }
                                  />
                                );
                              })
                          )}
                        </div>
                        {/* ── Excluded files — pinned to bottom of container ── */}
                        {fileList.some((f) =>
                          hasFileIdentifier(
                            excludedIdentifiers,
                            getSourceFileId(f),
                            f.file_path,
                          ),
                        ) && (
                          <div className="shrink-0 px-1.5 pb-1.5">
                            <div className="overflow-hidden rounded-xl border border-rose-200/70 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20">
                              <div className="flex items-center gap-1.5 border-b border-rose-200/70 px-2.5 py-1.5 dark:border-rose-900/40">
                                <EyeOff className="h-3 w-3 shrink-0 text-rose-400" />
                                <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-rose-400/80">
                                  Excluded
                                </span>
                                <span className="rounded-full bg-rose-100 px-1.5 py-0 text-[9px] font-bold text-rose-500 dark:bg-rose-950/60 dark:text-rose-400">
                                  {
                                    fileList.filter((f) =>
                                      hasFileIdentifier(
                                        excludedIdentifiers,
                                        getSourceFileId(f),
                                        f.file_path,
                                      ),
                                    ).length
                                  }
                                </span>
                                <button
                                  type="button"
                                  onClick={clearAllExcluded}
                                  title="Clear all exclusions"
                                  className="rounded p-0.5 text-rose-400/60 transition-colors hover:bg-rose-100 hover:text-rose-500 dark:hover:bg-rose-950/40"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="custom-scrollbar max-h-[160px] overflow-y-auto p-1">
                                {fileList
                                  .filter((f) =>
                                    hasFileIdentifier(
                                      excludedIdentifiers,
                                      getSourceFileId(f),
                                      f.file_path,
                                    ),
                                  )
                                  .map((file) => {
                                    const fileId = getSourceFileId(file);
                                    const counts = fileCountMap.get(fileId) ?? {
                                      citedCount: 0,
                                      attachedCount: 0,
                                    };
                                    return (
                                      <FileRow
                                        key={fileId}
                                        filePath={fileId}
                                        name={getSourceFileDisplayName(file)}
                                        ext={file.ext}
                                        citedCount={counts.citedCount}
                                        attachedCount={counts.attachedCount}
                                        isSelected={selectedFilePath === fileId}
                                        onSelect={() => selectFile(fileId)}
                                        isExcluded={true}
                                        onToggleExclude={() =>
                                          toggleExclude(fileId, file.file_path)
                                        }
                                      />
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Heatmap area — always flex-1, right panel slides in */}
                      <div className="flex flex-1 flex-col overflow-hidden">
                        {selectedFilePath ? (
                          <>
                            {/* File header: filename + quick actions + mode toggle */}
                            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
                              {(() => {
                                const file = fileList.find(
                                  (f) =>
                                    getSourceFileId(f) === selectedFilePath,
                                );
                                return (
                                  <>
                                    <FileExtBadge ext={file?.ext ?? ''} />
                                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                                      {file
                                        ? getSourceFileDisplayName(file)
                                        : selectedFilePath}
                                    </span>
                                  </>
                                );
                              })()}
                              {viewMode === 'chunks' &&
                                heatmapMode === 'read' && (
                                  <HeatmapQuickActions
                                    hasCited={citedChunkNumbers.size > 0}
                                    hasAttached={attachedChunkNumbers.size > 0}
                                    onAttachAllCited={handleAttachAllCited}
                                    onAttachAll={handleAttachAll}
                                    onClearAll={handleClearAll}
                                    compact={!!selectedChunk}
                                  />
                                )}
                              {/* Chunks / Preview toggle */}
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
                            </div>
                            {/* Grid (chunks mode only) */}
                            <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
                              <SourceHeatmapGrid
                                chunks={selectedChunks}
                                citedChunkNumbers={citedChunkNumbers}
                                attachedChunkNumbers={attachedChunkNumbers}
                                isLoading={isLoadingChunks}
                                onSelectChunk={handleSelectChunk}
                                selectedChunkNumber={
                                  selectedChunk?.chunk_number
                                }
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

                      {/* Right panel: payload preview, file preview, or chunk reader — slides in */}
                      <AnimatePresence initial={false}>
                        {!!selectedFilePath &&
                          (viewMode === 'preview' ||
                            (viewMode === 'chunks' &&
                              heatmapMode === 'select') ||
                            (viewMode === 'chunks' && !!selectedChunk)) && (
                            <motion.div
                              key={`rpanel-${selectedFilePath}`}
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: 340, opacity: 1 }}
                              exit={{ width: 0, opacity: 0 }}
                              transition={{
                                type: 'spring',
                                stiffness: 380,
                                damping: 36,
                              }}
                              style={{ overflow: 'hidden', flexShrink: 0 }}
                            >
                              {/* w-px separator avoids border-l 1px gap during animation */}
                              <div
                                className="flex h-full"
                                style={{ width: 341 }}
                              >
                                <div className="w-px shrink-0 bg-border" />
                                <div className="flex h-full flex-1 flex-col overflow-hidden">
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
                                            fileList.find(
                                              (f) =>
                                                getSourceFileId(f) ===
                                                selectedFilePath,
                                            )?.name ??
                                            getPathDisplayName(
                                              selectedFilePath,
                                            ) ??
                                            ''
                                          }
                                          ext={
                                            fileList.find(
                                              (f) =>
                                                getSourceFileId(f) ===
                                                selectedFilePath,
                                            )?.ext
                                          }
                                          onRetry={handleRetryPreview}
                                          pages={availablePages}
                                          chunksByPage={chunksByPage}
                                          attachedChunkNumbers={
                                            attachedChunkNumbers
                                          }
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
                                          attachedChunks={selectedChunks.filter(
                                            (c) =>
                                              attachedChunkNumbers.has(
                                                c.chunk_number,
                                              ),
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
                                            fileList.find(
                                              (f) =>
                                                getSourceFileId(f) ===
                                                selectedFilePath,
                                            )?.name ??
                                            getPathDisplayName(
                                              selectedFilePath,
                                            ) ??
                                            ''
                                          }
                                          fileExt={
                                            fileList.find(
                                              (f) =>
                                                getSourceFileId(f) ===
                                                selectedFilePath,
                                            )?.ext
                                          }
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
                                          highlightQuery={
                                            heatmapSearch || undefined
                                          }
                                        />
                                      </motion.div>
                                    ) : null}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
