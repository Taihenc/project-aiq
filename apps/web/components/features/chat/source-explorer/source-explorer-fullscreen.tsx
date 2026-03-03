'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  X,
  PictureInPicture2,
  Loader2,
  RefreshCw,
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
import type { Citation, ChunkMetadata, FileRef, SourceFile } from '@/types/api';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SourceExplorerFullscreenProps {
  attachments: FileRef[];
  availableCitations: Citation[];
  onAddAttachment: (att: FileRef) => void;
  onRemoveChunk: (filePath: string, chunkNumber: number) => void;
}

// ─── File row ─────────────────────────────────────────────────────────────────

function FileRow({
  name,
  ext,
  citedCount,
  attachedCount,
  isSelected,
  onSelect,
}: {
  name: string;
  ext?: string;
  citedCount: number;
  attachedCount: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors',
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

// ─── Component ───────────────────────────────────────────────────────────────

export function SourceExplorerFullscreen({
  attachments,
  availableCitations,
  onAddAttachment,
  onRemoveChunk,
}: SourceExplorerFullscreenProps) {
  const {
    mode,
    isOpen,
    selectedFilePath,
    chunksCache,
    loadingFiles,
    close,
    exitFullscreen,
    selectFile,
    refreshFile,
  } = useSourceExplorerStore();

  const [fileList, setFileList] = useState<SourceFile[]>([]);
  const [fileListLoading, setFileListLoading] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<ChunkMetadata | null>(
    null,
  );

  // Load file list when fullscreen opens
  useEffect(() => {
    if (!isOpen || mode !== 'fullscreen') return;
    let cancelled = false;
    setFileListLoading(true);
    sharePointApi
      .getIndexedFiles()
      .then((files) => {
        if (cancelled) return;
        setFileList(files);
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

  const citedChunkNumbers = useMemo(() => {
    if (!selectedFilePath) return new Set<number>();
    const citation = availableCitations.find((c) => c.id === selectedFilePath);
    return new Set<number>((citation?.chunks ?? []).map((c) => c.chunk_number));
  }, [availableCitations, selectedFilePath]);

  const attachedChunkNumbers = useMemo(() => {
    if (!selectedFilePath) return new Set<number>();
    const att = attachments.find((a) => a.file_path === selectedFilePath);
    return new Set<number>((att?.chunks ?? []).map((c) => c.chunk_number));
  }, [attachments, selectedFilePath]);

  const fileCountMap = useMemo(() => {
    const out = new Map<
      string,
      { citedCount: number; attachedCount: number }
    >();
    for (const c of availableCitations) {
      const cur = out.get(c.id) ?? { citedCount: 0, attachedCount: 0 };
      out.set(c.id, { ...cur, citedCount: c.chunks?.length ?? 0 });
    }
    for (const a of attachments) {
      const cur = out.get(a.file_path) ?? { citedCount: 0, attachedCount: 0 };
      out.set(a.file_path, { ...cur, attachedCount: a.chunks.length });
    }
    return out;
  }, [availableCitations, attachments]);

  // Select chunk for reading
  const handleSelectChunk = useCallback((chunk: ChunkMetadata) => {
    setSelectedChunk((prev) =>
      prev?.chunk_number === chunk.chunk_number ? null : chunk,
    );
  }, []);

  // Attach / detach selected chunk via reader
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

  // Clear reader when switching files
  useEffect(() => {
    setSelectedChunk(null);
  }, [selectedFilePath]);

  const handleAttachAllCited = useCallback(() => {
    if (!selectedFilePath) return;
    const cited = selectedChunks.filter((c) =>
      citedChunkNumbers.has(c.chunk_number),
    );
    if (cited.length > 0)
      onAddAttachment({
        file_path: selectedFilePath,
        chunks: cited,
      } as FileRef);
  }, [selectedFilePath, selectedChunks, citedChunkNumbers, onAddAttachment]);

  const handleAttachAll = useCallback(() => {
    if (!selectedFilePath || !selectedChunks.length) return;
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

  return (
    <AnimatePresence>
      {isOpen && mode === 'fullscreen' && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[210] bg-background/80 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed inset-4 z-[211] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_64px_-16px_rgba(102,88,204,0.4)]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[var(--brand-surface-light)] px-5 py-3">
              <LayoutGrid className="h-4 w-4 shrink-0 text-[var(--brand-fg-light)]" />
              <span className="font-kiona flex-1 text-sm font-semibold text-[var(--brand-fg-dark)]">
                Source Explorer
              </span>

              {selectedFilePath && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                      onClick={() => refreshFile(selectedFilePath)}
                      disabled={isLoadingChunks}
                    >
                      <RefreshCw
                        className={cn(
                          'h-3.5 w-3.5',
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
                {/* Detach to floating */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-[var(--brand-surface-purple)] hover:text-[var(--brand-fg-light)]"
                      onClick={exitFullscreen}
                    >
                      <PictureInPicture2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Detach to floating panel
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={close}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Body: file list + heatmap */}
            <div className="flex flex-1 overflow-hidden">
              {/* File list sidebar */}
              <div className="flex w-[260px] shrink-0 flex-col border-r border-border">
                <div className="border-b border-border px-4 py-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Indexed Files
                  </span>
                </div>
                <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
                  {fileListLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-fg-accent)]" />
                    </div>
                  ) : fileList.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
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

              {/* Heatmap area — shrinks when reader is open */}
              <div
                className={cn(
                  'flex flex-col overflow-hidden transition-[width,flex] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                  selectedChunk ? 'w-[44%] shrink-0' : 'flex-1',
                )}
              >
                {selectedFilePath ? (
                  <>
                    {/* File header */}
                    <div className="flex shrink-0 flex-col gap-2.5 border-b border-border px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const file = fileList.find(
                            (f) => f.file_path === selectedFilePath,
                          );
                          return (
                            <>
                              <FileExtBadge ext={file?.ext ?? ''} />
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                                {file?.name ??
                                  selectedFilePath.split('/').pop()}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {selectedChunks.length} chunks
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <HeatmapQuickActions
                        hasCited={citedChunkNumbers.size > 0}
                        hasAttached={attachedChunkNumbers.size > 0}
                        onAttachAllCited={handleAttachAllCited}
                        onAttachAll={handleAttachAll}
                        onClearAll={handleClearAll}
                      />
                    </div>
                    {/* Grid */}
                    <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
                      <SourceHeatmapGrid
                        chunks={selectedChunks}
                        citedChunkNumbers={citedChunkNumbers}
                        attachedChunkNumbers={attachedChunkNumbers}
                        isLoading={isLoadingChunks}
                        onSelectChunk={handleSelectChunk}
                        selectedChunkNumber={selectedChunk?.chunk_number}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Select a file from the sidebar to explore its chunks
                    </p>
                  </div>
                )}
              </div>

              {/* Content reader — slides in from right */}
              <AnimatePresence initial={false}>
                {selectedChunk && selectedFilePath && (
                  <motion.div
                    key={`reader-${selectedFilePath}`}
                    initial={{ opacity: 0, x: 32 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 32 }}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 34,
                    }}
                    className="flex-1 overflow-hidden border-l border-border"
                  >
                    <ChunkContentReader
                      chunk={selectedChunk}
                      allChunks={selectedChunks}
                      fileName={
                        fileList.find((f) => f.file_path === selectedFilePath)
                          ?.name ??
                        selectedFilePath.split('/').pop() ??
                        ''
                      }
                      fileExt={
                        fileList.find((f) => f.file_path === selectedFilePath)
                          ?.ext
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
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
