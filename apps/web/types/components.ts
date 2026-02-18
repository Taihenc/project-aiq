import type { ReactNode } from 'react';
import type { Citation, FileRef } from './api';
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
  status?: string;
  statusHistory?: string[];
  isEmpty?: boolean;
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  attachments?: FileRef[];
}

export interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
  attachments?: FileRef[];
  onRemoveAttachment?: (index: number) => void;
}

export interface ChatInputAreaProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  attachments?: FileRef[];
  onRemoveAttachment?: (index: number) => void;
}

export interface ChatMessagesAreaProps {
  messages: UIMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  attachments?: FileRef[];
}

export interface ChatHeaderProps {
  onViewSources: () => void;
  title?: string;
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

