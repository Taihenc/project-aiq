import { create } from 'zustand';

// ─── Store ───────────────────────────────────────────────────────────────────
//
// Shared Zustand store for metadata-based search filters.
// Mirrors the SearchFilter fields (department, team, project, tags, file_type)
// that are forwarded to the search-flow service and applied at the Qdrant layer.

export interface SearchFilterState {
  department: string;
  team: string;
  project: string;
  tags: string[];
  file_type: string;
}

interface SearchFilterStore extends SearchFilterState {
  setField: <K extends keyof SearchFilterState>(
    key: K,
    value: SearchFilterState[K],
  ) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  clearAll: () => void;
  /** Returns true when at least one filter is non-empty */
  hasFilters: () => boolean;
  /** Number of active filter fields (for UI badge) */
  activeCount: () => number;
}

const EMPTY: SearchFilterState = {
  department: '',
  team: '',
  project: '',
  tags: [],
  file_type: '',
};

export const useSearchFilterStore = create<SearchFilterStore>((set, get) => ({
  ...EMPTY,

  setField: (key, value) => set({ [key]: value }),

  addTag: (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) return;
    const current = get().tags;
    if (!current.includes(trimmed)) set({ tags: [...current, trimmed] });
  },

  removeTag: (tag) =>
    set({ tags: get().tags.filter((t) => t !== tag) }),

  clearAll: () => set(EMPTY),

  hasFilters: () => {
    const { department, team, project, tags, file_type } = get();
    return !!(department || team || project || tags.length > 0 || file_type);
  },

  activeCount: () => {
    const { department, team, project, tags, file_type } = get();
    return (
      (department ? 1 : 0) +
      (team ? 1 : 0) +
      (project ? 1 : 0) +
      (tags.length > 0 ? 1 : 0) +
      (file_type ? 1 : 0)
    );
  },
}));
