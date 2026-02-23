/**
 * Central Type Export Hub
 * Single source of truth for all TypeScript types in the application
 *
 * Usage:
 * - Import from @/types for all type needs
 * - Organized by domain (API, UI, Components, Hooks)
 */

// ============================================================================
// UI/Domain Types
// ============================================================================
export type { UIMessage } from './chat';

// ============================================================================
// API Types
// ============================================================================
export type {
  APIMessage,
  Message, // Alias for APIMessage
  Choice,
  Usage,
  Citation,
  ChunkMetadata,
  FileRef,
  ChatCompletionsRequest,
  ChatCompletionsResponse,
  ChatRequest,
  ChatResponse,
  ChatSession,
  BackendMessage,
} from './api';

// ============================================================================
// Auth Types
// ============================================================================
export type {
  User,
  DecodedToken,
  LoginResponse,
  AuthContextType,
} from './auth';

// ============================================================================
// Store Types
// ============================================================================
export type { ChatStore } from './store';

// ============================================================================
// Component Props Types
// ============================================================================
export type {
  ChatMessageProps,
  ChatInputProps,
  ChatInputAreaProps,
  ChatMessagesAreaProps,
  ChatHeaderProps,
  ChatWelcomeProps,
  CitationsPanelProps,
  FeatureCardProps,
  ChatHistoryItem,
  SidebarProps,
} from './components';

// ============================================================================
// Hook Types
// ============================================================================
export type {
  UseChatMessagesOptions,
  UseChatMessagesReturn,
  UseAutoScrollOptions,
  UseAutoScrollReturn,
} from './hooks';
