import { create } from 'zustand';
import { historyApi } from '@/lib/api/history';
import { formatProgressiveTime } from '@/lib/utils/date-formatter';
import { PAGINATION } from '@/lib/config/pagination';
import type { ChatStore } from '@/types';

export const useChatStore = create<ChatStore>((set, get) => ({
  history: [],
  isLoadingHistory: false,
  currentChatId: undefined,
  historyNextCursor: null,
  hasMoreHistory: false,
  isLoadingMoreHistory: false,

  setHistory: (history) => set({ history }),
  setCurrentChatId: (id) => set({ currentChatId: id }),

  fetchHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const { sessions, nextCursor } = await historyApi.getHistory({ limit: PAGINATION.HISTORY_PAGE_SIZE });
      const formattedHistory = sessions.map(s => ({
        id: s.id,
        title: s.title,
        timestamp: formatProgressiveTime(s.updatedAt || s.createdAt),
      }));
      set({
        history: formattedHistory,
        historyNextCursor: nextCursor,
        hasMoreHistory: nextCursor !== null,
      });
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  fetchMoreHistory: async () => {
    const { historyNextCursor, hasMoreHistory, isLoadingMoreHistory } = get();
    if (!hasMoreHistory || isLoadingMoreHistory || !historyNextCursor) return;

    set({ isLoadingMoreHistory: true });
    try {
      const { sessions, nextCursor } = await historyApi.getHistory({
        limit: PAGINATION.HISTORY_PAGE_SIZE,
        cursor: historyNextCursor,
      });
      const formattedNewItems = sessions.map(s => ({
        id: s.id,
        title: s.title,
        timestamp: formatProgressiveTime(s.updatedAt || s.createdAt),
      }));
      set((state) => ({
        history: [...state.history, ...formattedNewItems],
        historyNextCursor: nextCursor,
        hasMoreHistory: nextCursor !== null,
      }));
    } catch (error) {
      console.error('Failed to fetch more history:', error);
    } finally {
      set({ isLoadingMoreHistory: false });
    }
  },

  deleteSession: async (id: string) => {
    try {
      await historyApi.deleteSession(id);

      const isCurrentChat = get().currentChatId === id;

      set((state) => ({
        history: state.history.filter((s) => s.id !== id),
        currentChatId: isCurrentChat ? undefined : state.currentChatId,
      }));

      return isCurrentChat;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  },

  // Transitional State for Smooth Navigation
  transitionalMessages: {},
  setTransitionalMessages: (id, entry) => set((state) => ({
    transitionalMessages: { ...state.transitionalMessages, [id]: entry }
  })),
  getTransitionalMessages: (id) => {
    const entry = get().transitionalMessages[id];
    return entry;
  },

  reset: () => set({
    history: [],
    currentChatId: undefined,
    isLoadingHistory: false,
    historyNextCursor: null,
    hasMoreHistory: false,
    isLoadingMoreHistory: false,
    transitionalMessages: {},
  }),
}));
