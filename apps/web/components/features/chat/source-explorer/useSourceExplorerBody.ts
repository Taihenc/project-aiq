'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { sharePointApi } from '@/lib/api/sharepoint';
import { useSourceExplorerStore } from '@/hooks/useSourceExplorer';
import type { Citation, ChunkMetadata, FileRef, SourceFile } from '@/types/api';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SourceExplorerBodyProps {
  attachments: FileRef[];
  availableCitations: Citation[];
  onAddAttachment: (att: FileRef) => void;
  onRemoveChunk: (filePath: string, chunkNumber: number) => void;
}

// ─── Shared hook ─────────────────────────────────────────────────────────────
//
// Encapsulates all state and handlers shared by the popover, floating panel,
// and fullscreen variants of the Source Explorer.

export function useSourceExplorerBody({
  attachments,
  availableCitations,
  onAddAttachment,
  onRemoveChunk,
}: SourceExplorerBodyProps) {
  const { selectedFilePath, chunksCache, loadingFiles, selectFile, refreshFile, pendingChunkTarget } =
    useSourceExplorerStore();

  const [fileList, setFileList] = useState<SourceFile[]>([]);
  const [fileListLoading, setFileListLoading] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<ChunkMetadata | null>(null);

  // Load file list once (called explicitly from each view's useEffect)
  const loadFileList = useCallback(async () => {
    setFileListLoading(true);
    try {
      const files = await sharePointApi.getIndexedFiles();
      setFileList(files);
      if (!selectedFilePath && files.length > 0) {
        selectFile(files[0].file_path);
      }
    } catch {
      setFileList([]);
    } finally {
      setFileListLoading(false);
    }
  }, [selectedFilePath, selectFile]);

  // Clear selected chunk when file changes.
  // pendingChunkTarget is captured at render time (subscribed value), not via
  // getState(), so the closure sees the pre-clear value even if a child effect
  // already called clearPendingChunkTarget() before this effect runs.
  useEffect(() => {
    if (pendingChunkTarget !== null) return;
    setSelectedChunk(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilePath]);

  // Derived: sorted chunks for selected file
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

  // Cited + attached sets for current file
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

  // Sidebar counters
  const fileCountMap = useMemo(() => {
    const out = new Map<string, { citedCount: number; attachedCount: number }>();
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

  // ── Chunk reader handlers ─────────────────────────────────────────────────

  const handleSelectChunk = useCallback(
    (chunk: ChunkMetadata) =>
      setSelectedChunk((prev) =>
        prev?.chunk_number === chunk.chunk_number ? null : chunk,
      ),
    [],
  );

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

  // ── Quick-action handlers ─────────────────────────────────────────────────

  const handleAttachAllCited = useCallback(() => {
    if (!selectedFilePath) return;
    const cited = selectedChunks.filter((c) =>
      citedChunkNumbers.has(c.chunk_number),
    );
    if (cited.length > 0)
      onAddAttachment({ file_path: selectedFilePath, chunks: cited } as FileRef);
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
      if (attachedChunkNumbers.has(chunk.chunk_number))
        onRemoveChunk(selectedFilePath, chunk.chunk_number);
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

  // ── Resolved file info for selected file ──────────────────────────────────

  const selectedFile = fileList.find((f) => f.file_path === selectedFilePath);

  return {
    // File list
    fileList,
    fileListLoading,
    loadFileList,
    // Chunk data
    selectedFile,
    selectedChunks,
    isLoadingChunks,
    // Sets
    citedChunkNumbers,
    attachedChunkNumbers,
    fileCountMap,
    // Reader state
    selectedChunk,
    setSelectedChunk,
    // Handlers
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
    // Store passthrough
    selectFile,
    refreshFile,
    selectedFilePath,
  };
}
