'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import {
  LayoutGrid,
  FileText,
  X,
  Minus,
  Maximize2,
  GripHorizontal,
  RefreshCw,
  Loader2,
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
import type { Citation, ChunkMetadata, FileRef, SourceFile } from '@/types/api';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SourceExplorerPanelProps {
  attachments: FileRef[];
  availableCitations: Citation[];
  onAddAttachment: (att: FileRef) => void;
  onRemoveChunk: (filePath: string, chunkNumber: number) => void;
}

// ─── File list sidebar ───────────────────────────────────────────────────────

interface FileRowProps {
  filePath: string;
  name: string;
  ext?: string;
  citedCount: number;
  attachedCount: number;
  isSelected: boolean;
  onSelect: () => void;
}

function FileRow({
  name,
  ext,
  citedCount,
  attachedCount,
  isSelected,
  onSelect,
}: FileRowProps) {
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

// ─── Panel ───────────────────────────────────────────────────────────────────

const PANEL_W = '65rem'; // 1040px
const PANEL_H = 500;

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
  } = useSourceExplorerStore();

  const [minimized, setMinimized] = useState(false);
  const [fileList, setFileList] = useState<SourceFile[]>([]);
  const [fileListLoading, setFileListLoading] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<ChunkMetadata | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<'chunks' | 'preview'>('chunks');
  const [heatmapMode, setHeatmapMode] = useState<'read' | 'select'>('read');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

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
          selectFile(files[0].file_path);
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
    const citation = availableCitations.find((c) => c.id === selectedFilePath);
    return new Set<number>((citation?.chunks ?? []).map((c) => c.chunk_number));
  }, [availableCitations, selectedFilePath]);

  // Attached chunk numbers for selected file
  const attachedChunkNumbers = useMemo(() => {
    if (!selectedFilePath) return new Set<number>();
    const att = attachments.find((a) => a.file_path === selectedFilePath);
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
  const fileCountMap = useMemo(() => {
    const out = new Map<
      string,
      { citedCount: number; attachedCount: number }
    >();
    for (const c of availableCitations) {
      const cur = out.get(c.id) ?? { citedCount: 0, attachedCount: 0 };
      out.set(c.id, {
        ...cur,
        citedCount: c.chunks?.length ?? 0,
      });
    }
    for (const a of attachments) {
      const cur = out.get(a.file_path) ?? { citedCount: 0, attachedCount: 0 };
      out.set(a.file_path, { ...cur, attachedCount: a.chunks.length });
    }
    return out;
  }, [availableCitations, attachments]);

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
    onAddAttachment({
      file_path: selectedFilePath,
      chunks: [selectedChunk],
      content: selectedChunk.content,
    } as FileRef);
  }, [selectedFilePath, selectedChunk, onAddAttachment]);

  const handleDetachSelected = useCallback(() => {
    if (!selectedFilePath || !selectedChunk) return;
    onRemoveChunk(selectedFilePath, selectedChunk.chunk_number);
  }, [selectedFilePath, selectedChunk, onRemoveChunk]);

  // Reset selectedChunk + preview data when file changes; revoke old blob URL
  // viewMode is intentionally preserved so chunks/preview mode persists across file switches
  useEffect(() => {
    setSelectedChunk(null);
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
    onAddAttachment({
      file_path: selectedFilePath,
      chunks: citedChunks,
    } as FileRef);
  }, [selectedFilePath, selectedChunks, citedChunkNumbers, onAddAttachment]);

  const handleAttachAll = useCallback(() => {
    if (!selectedFilePath || selectedChunks.length === 0) return;
    onAddAttachment({
      file_path: selectedFilePath,
      chunks: selectedChunks,
    } as FileRef);
  }, [selectedFilePath, selectedChunks, onAddAttachment]);

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
        onAddAttachment({
          file_path: selectedFilePath,
          chunks: pageChunks,
        } as FileRef);
    },
    [selectedFilePath, selectedChunks, onAddAttachment],
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
      onAddAttachment({
        file_path: selectedFilePath,
        chunks: [chunk],
        content: chunk.content,
      } as FileRef);
    },
    [selectedFilePath, onAddAttachment],
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
            dragConstraints={constraintsRef}
            dragMomentum={false}
            dragElastic={0}
            initial={{ scale: 0.88, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            style={{
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
                  {/* File list sidebar */}
                  <div className="flex w-[200px] shrink-0 flex-col border-r border-border">
                    <div className="border-b border-border px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Files
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
                              onSelect={() => selectFile(file.file_path)}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Heatmap area — always flex-1, right panel slides in */}
                  <div className="flex flex-1 flex-col overflow-hidden">
                    {selectedFilePath ? (
                      <>
                        {/* File header: filename + quick actions + mode toggle */}
                        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
                          {(() => {
                            const file = fileList.find(
                              (f) => f.file_path === selectedFilePath,
                            );
                            return (
                              <>
                                <FileExtBadge ext={file?.ext ?? ''} />
                                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                                  {file?.name ??
                                    selectedFilePath.split('/').pop()}
                                </span>
                              </>
                            );
                          })()}
                          {viewMode === 'chunks' && heatmapMode === 'read' && (
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
                            selectedChunkNumber={selectedChunk?.chunk_number}
                            onAttachPage={handleAttachPage}
                            onDetachPage={handleDetachPage}
                            onAttachChunk={handleAttachChunk}
                            onDetachChunk={handleDetachChunk}
                            onModeChange={handleHeatmapModeChange}
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
                        (viewMode === 'chunks' && heatmapMode === 'select') ||
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
                          <div className="flex h-full" style={{ width: 341 }}>
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
                                            f.file_path === selectedFilePath,
                                        )?.name ??
                                        selectedFilePath.split('/').pop() ??
                                        ''
                                      }
                                      ext={
                                        fileList.find(
                                          (f) =>
                                            f.file_path === selectedFilePath,
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
                                            f.file_path === selectedFilePath,
                                        )?.name ??
                                        selectedFilePath.split('/').pop() ??
                                        ''
                                      }
                                      fileExt={
                                        fileList.find(
                                          (f) =>
                                            f.file_path === selectedFilePath,
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
                                    />
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
