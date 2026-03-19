import { create } from 'zustand';

// ─── Store ───────────────────────────────────────────────────────────────────
//
// Shared Zustand store for the "exclude from search" feature.
// Used by both the chat-input toolbar picker and the Source Explorer file list.

type ExcludedFile = {
  fileId: string;
  filePath?: string;
};

function buildExcludeState(excludedFiles: ExcludedFile[]) {
  const deduped: ExcludedFile[] = [];
  for (const candidate of excludedFiles) {
    if (!candidate.fileId && !candidate.filePath) continue;
    const exists = deduped.some(
      (entry) =>
        entry.fileId === candidate.fileId ||
        (!!entry.filePath && entry.filePath === candidate.filePath),
    );
    if (!exists) {
      deduped.push(candidate);
    }
  }

  return {
    excludedFiles: deduped,
    excludedFileIds: deduped.map((entry) => entry.fileId).filter(Boolean),
    excludedPaths: deduped
      .map((entry) => entry.filePath)
      .filter((value): value is string => !!value),
    excludedIdentifiers: Array.from(
      new Set(
        deduped.flatMap((entry) =>
          [entry.fileId, entry.filePath].filter(
            (value): value is string => !!value,
          ),
        ),
      ),
    ),
  };
}

interface ExcludeStore {
  excludedFiles: ExcludedFile[];
  excludedFileIds: string[];
  excludedPaths: string[];
  excludedIdentifiers: string[];

  /** Toggle a file path in/out of the exclude list.  No-op if the path is attached. */
  toggle: (fileId: string, filePath?: string) => void;

  /** Unconditionally remove a file path  (called when a file gets attached). */
  remove: (fileId: string, filePath?: string) => void;

  /** Clear all exclusions (called after a message is sent). */
  clearAll: () => void;

  /** Replace the full exclude list (called when restoring state from a loaded message). */
  initFrom: (fileIds: string[], filePaths?: string[]) => void;
}

export const useExcludeStore = create<ExcludeStore>((set, get) => ({
  ...buildExcludeState([]),

  toggle: (fileId, filePath) => {
    const current = get().excludedFiles;
    const matches = (entry: ExcludedFile) =>
      entry.fileId === fileId || (!!filePath && entry.filePath === filePath);
    if (current.some(matches)) {
      set(buildExcludeState(current.filter((entry) => !matches(entry))));
    } else {
      set(buildExcludeState([...current, { fileId, filePath }]));
    }
  },

  remove: (fileId, filePath) =>
    set(
      buildExcludeState(
        get().excludedFiles.filter(
          (entry) => entry.fileId !== fileId && (!filePath || entry.filePath !== filePath),
        ),
      ),
    ),

  clearAll: () => set(buildExcludeState([])),

  initFrom: (fileIds, filePaths = []) =>
    set(
      buildExcludeState(
        fileIds.map((fileId, index) => ({
          fileId,
          filePath: filePaths[index],
        })),
      ),
    ),
}));
