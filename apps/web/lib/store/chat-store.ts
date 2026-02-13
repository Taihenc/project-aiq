import { create } from 'zustand';
import { historyApi } from '@/lib/api/history';
import { formatProgressiveTime } from '@/lib/utils/date-formatter';
import type { ChatStore } from '@/types';

export const useChatStore = create<ChatStore>((set, get) => ({
  history: [],
  isLoadingHistory: false,
  currentChatId: undefined,

  setHistory: (history) => set({ history }),
  setCurrentChatId: (id) => set({ currentChatId: id }),

  fetchHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const sessions = await historyApi.getHistory();
      const formattedHistory = sessions.map(s => ({
        id: s.id,
        title: s.title,
        timestamp: formatProgressiveTime(s.updatedAt || s.createdAt),
      }));
      set({ history: formattedHistory });
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      set({ isLoadingHistory: false });
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
  // This holds messages during a route change so the new page doesn't show a loading spinner
  transitionalMessages: {},
  setTransitionalMessages: (id, messages) => set((state) => ({
    transitionalMessages: { ...state.transitionalMessages, [id]: messages }
  })),
  getTransitionalMessages: (id) => {
    const msgs = get().transitionalMessages[id];
    return msgs;
  },

  reset: () => set({ history: [], currentChatId: undefined, isLoadingHistory: false, transitionalMessages: {} }),
}));
