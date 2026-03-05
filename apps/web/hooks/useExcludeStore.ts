import { create } from 'zustand';

// ─── Store ───────────────────────────────────────────────────────────────────
//
// Shared Zustand store for the "exclude from search" feature.
// Used by both the chat-input toolbar picker and the Source Explorer file list.

interface ExcludeStore {
  excludedPaths: string[];

  /** Toggle a file path in/out of the exclude list.  No-op if the path is attached. */
  toggle: (filePath: string) => void;

  /** Unconditionally remove a file path  (called when a file gets attached). */
  remove: (filePath: string) => void;

  /** Clear all exclusions (called after a message is sent). */
  clearAll: () => void;
}

export const useExcludeStore = create<ExcludeStore>((set, get) => ({
  excludedPaths: [],

  toggle: (filePath) => {
    const current = get().excludedPaths;
    if (current.includes(filePath)) {
      set({ excludedPaths: current.filter((p) => p !== filePath) });
    } else {
      set({ excludedPaths: [...current, filePath] });
    }
  },

  remove: (filePath) =>
    set({ excludedPaths: get().excludedPaths.filter((p) => p !== filePath) }),

  clearAll: () => set({ excludedPaths: [] }),
}));
