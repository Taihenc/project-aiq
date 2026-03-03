import { create } from 'zustand';

// ─── Store ───────────────────────────────────────────────────────────────────

export type BranchMapMode = 'closed' | 'popover' | 'floating' | 'fullscreen';

interface BranchMapStore {
  mode: BranchMapMode;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  detach: () => void;
  enterFullscreen: () => void;
  collapse: () => void;
}

export const useBranchMapStore = create<BranchMapStore>((set, get) => ({
  mode: 'closed',
  isOpen: false,
  open: () => set({ mode: 'popover', isOpen: true }),
  close: () => set({ mode: 'closed', isOpen: false }),
  toggle: () => {
    const { mode } = get();
    if (mode === 'closed') set({ mode: 'popover', isOpen: true });
    else if (mode === 'popover') set({ mode: 'closed', isOpen: false });
  },
  detach: () => set({ mode: 'floating', isOpen: true }),
  enterFullscreen: () => set({ mode: 'fullscreen', isOpen: true }),
  collapse: () => set({ mode: 'popover', isOpen: true }),
}));

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Returns branch map store state. Mount this hook in the chat layout to
 * get reactive open/mode state and actions.
 */
export function useBranchMap() {
  return useBranchMapStore();
}
