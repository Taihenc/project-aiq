'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FileExtBadge } from '../attachment-pill';
import { SourceHeatmapGrid, HeatmapQuickActions } from './source-heatmap-grid';
import { ChunkContentReader } from './chunk-content-reader';
import type { useSourceExplorerBody } from './useSourceExplorerBody';

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
  selectFile,
  refreshFile,
  selectedFilePath,
}: SourceExplorerBodyViewProps) {
  const handleFileSelect = useCallback(
    (fp: string) => selectFile(fp),
    [selectFile],
  );

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
            <div className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <FileExtBadge ext={selectedFile?.ext ?? ''} />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                  {selectedFile?.name ?? selectedFilePath.split('/').pop()}
                </span>
                <div className="flex items-center gap-1">
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {selectedChunks.length} chunks
                  </span>
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
              <HeatmapQuickActions
                hasCited={citedChunkNumbers.size > 0}
                hasAttached={attachedChunkNumbers.size > 0}
                onAttachAllCited={handleAttachAllCited}
                onAttachAll={handleAttachAll}
                onClearAll={handleClearAll}
              />
            </div>
            {/* Grid */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
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
              Select a file to explore chunks
            </p>
          </div>
        )}
      </div>

      {/* ── Content reader (slides in from right) ─────────────── */}
      <AnimatePresence initial={false}>
        {selectedChunk && selectedFilePath && (
          <motion.div
            key={`reader-${selectedFilePath}`}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: readerWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
            className="border-l border-border"
          >
            <div style={{ width: '100%', height: '100%' }}>
              <ChunkContentReader
                chunk={selectedChunk}
                allChunks={selectedChunks}
                fileName={
                  selectedFile?.name ?? selectedFilePath.split('/').pop() ?? ''
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
