import type { ReactNode } from 'react';
import type { Citation, FileRef, SearchMode } from './api';
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
  /** True while token events are arriving (before the result event completes) */
  isStreaming?: boolean;
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
  attachments?: FileRef[];
  /** Citation FileRefs that were attached when this user message was sent (read-only) */
  sentAttachments?: FileRef[];
  // --- Tree / branch navigation props ---
  /** Unique message ID in the tree */
  messageId?: string;
  /** 0-based sibling index of this message */
  branchIndex?: number;
  /** Total siblings at this level (1 = no branching) */
  siblingCount?: number;
  /** Called with this message's ID and direction to switch branches */
  onNavigateBranch?: (messageId: string, direction: 'prev' | 'next') => void;
  /** Available citations from the session, forwarded into the edit card */
  availableCitations?: Citation[];
  /** Called when user submits an edit for a user message */
  onEditMessage?: (messageId: string, newContent: string, attachments?: FileRef[]) => void;
  /** Called when user requests a regenerate for an assistant message */
  onRegenerate?: (assistantMessageId: string) => void;
}

export interface ChatInputProps {
  onSendMessage?: (message: string, mode?: SearchMode) => void;
  disabled?: boolean;
  attachments?: FileRef[];
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
  onAddAttachment?: (attachment: FileRef) => void;
  availableCitations?: Citation[];
}

export interface ChatInputAreaProps {
  onSendMessage: (message: string, mode?: SearchMode) => void;
  isLoading: boolean;
  attachments?: FileRef[];
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
  onAddAttachment?: (attachment: FileRef) => void;
  availableCitations?: Citation[];
}

export interface ChatMessagesAreaProps {
  messages: UIMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
  onAddAttachment?: (attachment: FileRef) => void;
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
  attachments?: FileRef[];
  hasOlderMessages?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: () => void;
  // --- Tree callbacks ---
  onNavigateBranch?: (messageId: string, direction: 'prev' | 'next') => void;
  onEditMessage?: (messageId: string, newContent: string, attachments?: FileRef[]) => void;
  onRegenerate?: (assistantMessageId: string) => void;
  availableCitations?: Citation[];
}

export interface ChatHeaderProps {
  onViewSources: () => void;
  title?: string;
}

export interface ChatWelcomeProps {
  onSendMessage: (message: string, mode?: SearchMode) => void;
  isLoading: boolean;
  attachments?: FileRef[];
  onRemoveAttachment?: (index: number) => void;
  onRemoveChunk?: (filePath: string, chunkNumber: number) => void;
  onAddAttachment?: (att: FileRef) => void;
  availableCitations?: Citation[];
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

