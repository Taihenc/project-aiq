import { UIMessage } from './chat';
import { ChatHistoryItem } from './components';

export interface ChatStore {
  history: ChatHistoryItem[];
  isLoadingHistory: boolean;
  currentChatId: string | undefined;

  // Actions
  setHistory: (history: ChatHistoryItem[]) => void;
  setCurrentChatId: (id: string | undefined) => void;
  fetchHistory: () => Promise<void>;
  deleteSession: (id: string) => Promise<boolean>;

  // Transition
  transitionalMessages: Record<string, UIMessage[]>;
  setTransitionalMessages: (id: string, messages: UIMessage[]) => void;
  getTransitionalMessages: (id: string) => UIMessage[] | undefined;

  reset: () => void;
}
