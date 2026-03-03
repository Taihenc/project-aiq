import { create } from 'zustand';
import { sharePointApi } from '@/lib/api/sharepoint';
import type { ChunkMetadata } from '@/types/api';

// ─── Store ───────────────────────────────────────────────────────────────────

export type SourceExplorerMode = 'closed' | 'floating' | 'fullscreen';

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
  close: () => void;
  toggle: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;

  /** Select a file and kick off lazy chunk load if not already cached */
  selectFile: (filePath: string) => Promise<void>;

  /** Explicitly refresh chunks for a file (bypasses cache) */
  refreshFile: (filePath: string) => Promise<void>;

  /** Clear state when switching chat sessions */
  reset: () => void;
}

export const useSourceExplorerStore = create<SourceExplorerStore>(
  (set, get) => ({
    mode: 'closed',
    isOpen: false,
    selectedFilePath: null,
    chunksCache: {},
    loadingFiles: new Set(),

    open: () => set({ mode: 'floating', isOpen: true }),
    close: () => set({ mode: 'closed', isOpen: false }),
    toggle: () => {
      const { mode } = get();
      if (mode === 'closed') set({ mode: 'floating', isOpen: true });
      else set({ mode: 'closed', isOpen: false });
    },
    enterFullscreen: () => set({ mode: 'fullscreen', isOpen: true }),
    exitFullscreen: () => set({ mode: 'floating', isOpen: true }),

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

    reset: () =>
      set({
        selectedFilePath: null,
        chunksCache: {},
        loadingFiles: new Set(),
      }),
  }),
);

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSourceExplorer() {
  return useSourceExplorerStore();
}
