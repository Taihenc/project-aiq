import { create } from 'zustand';
import { sharePointApi } from '@/lib/api/sharepoint';
import type { ChunkMetadata } from '@/types/api';

// ─── Store ───────────────────────────────────────────────────────────────────

export type SourceExplorerMode = 'closed' | 'popover' | 'floating' | 'fullscreen';

interface PendingChunkTarget {
  filePath: string;
  chunkNumber: number;
  requestId: number;
}

interface SourceExplorerStore {
  mode: SourceExplorerMode;
  isOpen: boolean;

  /** Currently selected file path in the left sidebar */
  selectedFilePath: string | null;

  /** Lazy-loaded chunks per file; keyed by file_path */
  chunksCache: Record<string, ChunkMetadata[]>;

  /** Files currently being fetched */
  loadingFiles: Set<string>;

  // ── Actions ──────────────────────────────────────────────────

  open: () => void;
  /** Open explorer and focus a specific chunk in a file */
  openAtChunk: (filePath: string, chunkNumber: number) => Promise<void>;
  close: () => void;
  toggle: () => void;
  /** Detach from popover → free-floating draggable panel */
  detach: () => void;
  enterFullscreen: () => void;
  /** Collapse floating/fullscreen back to anchored popover */
  collapse: () => void;

  /** Select a file and kick off lazy chunk load if not already cached */
  selectFile: (filePath: string) => Promise<void>;

  /** Explicitly refresh chunks for a file (bypasses cache) */
  refreshFile: (filePath: string) => Promise<void>;

  /** Clear state when switching chat sessions */
  reset: () => void;

  /** Pending chunk target to auto-navigate once file chunks are available */
  pendingChunkTarget: PendingChunkTarget | null;
  clearPendingChunkTarget: () => void;
  lastChunkOpenRequestId: number;
}

export const useSourceExplorerStore = create<SourceExplorerStore>(
  (set, get) => ({
    mode: 'closed',
    isOpen: false,
    selectedFilePath: null,
    chunksCache: {},
    loadingFiles: new Set(),
    pendingChunkTarget: null,
    lastChunkOpenRequestId: 0,

    open: () => set({ mode: 'popover', isOpen: true }),
    openAtChunk: async (filePath: string, chunkNumber: number) => {
      const requestId = get().lastChunkOpenRequestId + 1;
      const currentMode = get().mode;
      // Preserve floating/fullscreen mode; only default to popover when closed.
      const nextMode =
        currentMode === 'floating' || currentMode === 'fullscreen'
          ? currentMode
          : 'popover';
      // Make open + file selection + pending target one atomic state update.
      set({
        mode: nextMode,
        isOpen: true,
        selectedFilePath: filePath,
        pendingChunkTarget: { filePath, chunkNumber, requestId },
        lastChunkOpenRequestId: requestId,
      });

      const { chunksCache, loadingFiles } = get();
      if (chunksCache[filePath] !== undefined || loadingFiles.has(filePath)) {
        return;
      }

      const next = new Set(loadingFiles);
      next.add(filePath);
      set({ loadingFiles: next });

      try {
        const chunks = await sharePointApi.getFileChunks(filePath);
        const { chunksCache: current, loadingFiles: loading } = get();
        const nextLoading = new Set(loading);
        nextLoading.delete(filePath);
        set({
          chunksCache: { ...current, [filePath]: chunks },
          loadingFiles: nextLoading,
        });
      } catch {
        const { loadingFiles: loading, chunksCache: current } = get();
        const nextLoading = new Set(loading);
        nextLoading.delete(filePath);
        set({
          // Store empty array so we don't retry forever.
          chunksCache: { ...current, [filePath]: [] },
          loadingFiles: nextLoading,
        });
      }
    },
    close: () => set({ mode: 'closed', isOpen: false }),
    toggle: () => {
      const { mode } = get();
      if (mode === 'closed') set({ mode: 'popover', isOpen: true });
      else if (mode === 'popover') set({ mode: 'closed', isOpen: false });
      // floating / fullscreen — toggle just closes
      else set({ mode: 'closed', isOpen: false });
    },
    detach: () => set({ mode: 'floating', isOpen: true }),
    enterFullscreen: () => set({ mode: 'fullscreen', isOpen: true }),
    collapse: () => set({ mode: 'popover', isOpen: true }),

    selectFile: async (filePath: string) => {
      set({ selectedFilePath: filePath });
      const { chunksCache, loadingFiles } = get();

      // Already have data — skip
      if (chunksCache[filePath] !== undefined) return;
      // Already fetching — skip
      if (loadingFiles.has(filePath)) return;

      const next = new Set(loadingFiles);
      next.add(filePath);
      set({ loadingFiles: next });

      try {
        const chunks = await sharePointApi.getFileChunks(filePath);
        const { chunksCache: current, loadingFiles: loading } = get();
        const nextLoading = new Set(loading);
        nextLoading.delete(filePath);
        set({
          chunksCache: { ...current, [filePath]: chunks },
          loadingFiles: nextLoading,
        });
      } catch {
        const { loadingFiles: loading, chunksCache: current } = get();
        const nextLoading = new Set(loading);
        nextLoading.delete(filePath);
        set({
          // Store empty array so we don't retry forever
          chunksCache: { ...current, [filePath]: [] },
          loadingFiles: nextLoading,
        });
      }
    },

    refreshFile: async (filePath: string) => {
      const { loadingFiles } = get();
      if (loadingFiles.has(filePath)) return;

      const next = new Set(loadingFiles);
      next.add(filePath);
      set({ loadingFiles: next, selectedFilePath: filePath });

      try {
        const chunks = await sharePointApi.getFileChunks(filePath);
        const { chunksCache: current, loadingFiles: loading } = get();
        const nextLoading = new Set(loading);
        nextLoading.delete(filePath);
        set({
          chunksCache: { ...current, [filePath]: chunks },
          loadingFiles: nextLoading,
        });
      } catch {
        const { loadingFiles: loading } = get();
        const nextLoading = new Set(loading);
        nextLoading.delete(filePath);
        set({ loadingFiles: nextLoading });
      }
    },

    clearPendingChunkTarget: () => set({ pendingChunkTarget: null }),

    reset: () =>
      set({
        selectedFilePath: null,
        chunksCache: {},
        loadingFiles: new Set(),
        pendingChunkTarget: null,
        lastChunkOpenRequestId: 0,
      }),
  }),
);

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSourceExplorer() {
  return useSourceExplorerStore();
}
