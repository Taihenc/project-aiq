import type { ReactNode } from 'react';
import type { Citation } from './api';
import type { UIMessage } from './chat';

/**
 * Component Props Type Definitions
 * Centralized location for all component prop interfaces
 */

// Chat Components
export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp?: string;
}

export interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
}

export interface ChatInputAreaProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export interface ChatMessagesAreaProps {
  messages: UIMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export interface ChatHeaderProps {
  onViewSources: () => void;
}

export interface ChatWelcomeProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export interface CitationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citations?: Citation[];
}

// Feature Components
export interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  iconColor: string;
  gradientColors: string[];
  onClick?: () => void;
}

// Sidebar Components
export interface ChatHistoryItem {
  id: string;
  title: string;
  timestamp: string;
}

export interface SidebarProps {
  chatHistory?: ChatHistoryItem[];
  currentChatId?: string;
  onChatSelect?: (chatId: string) => void;
  onNewChat?: () => void;
}

