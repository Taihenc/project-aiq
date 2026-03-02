import type { UIMessage } from './chat';
import type { FileRef, SearchMode } from './api';

/**
 * Hook Options and Return Types
 * Centralized location for all hook-related type definitions
 */

// useChatMessages hook
export interface UseChatMessagesOptions {
  isDemoMode?: boolean;
  initialMessages?: UIMessage[];
  chatId?: string;
}

export interface UseChatMessagesReturn {
  messages: UIMessage[];
  isLoading: boolean;
  sessionId: string | undefined;
  sendMessage: (content: string, attachments?: FileRef[], mode?: SearchMode) => Promise<void>;
  clearMessages: () => void;
  hasOlderMessages: boolean;
  loadOlderMessages: () => Promise<void>;
  isLoadingOlder: boolean;
}

// useAutoScroll hook
export interface UseAutoScrollOptions {
  enabled?: boolean;
  smooth?: boolean;
}

export interface UseAutoScrollReturn {
  scrollRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: () => void;
}

