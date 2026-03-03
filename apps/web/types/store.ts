import { UIMessage } from './chat';
import { ChatHistoryItem } from './components';

export interface TransitionalCacheEntry {
  messages: UIMessage[];
  cursor: string | null;
  hasMore: boolean;
}

export interface ChatStore {
  history: ChatHistoryItem[];
  isLoadingHistory: boolean;
  currentChatId: string | undefined;
  historyNextCursor: string | null;
  hasMoreHistory: boolean;
  isLoadingMoreHistory: boolean;

  // Actions
  setHistory: (history: ChatHistoryItem[]) => void;
  setCurrentChatId: (id: string | undefined) => void;
  fetchHistory: () => Promise<void>;
  fetchMoreHistory: () => Promise<void>;
  deleteSession: (id: string) => Promise<boolean>;

  // Transition
  transitionalMessages: Record<string, TransitionalCacheEntry>;
  setTransitionalMessages: (id: string, entry: TransitionalCacheEntry) => void;
  getTransitionalMessages: (id: string) => TransitionalCacheEntry | undefined;

  reset: () => void;
}
