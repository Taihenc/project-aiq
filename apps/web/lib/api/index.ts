/**
 * API Module Exports
 * Central export point for all API-related types and functions
 */

// Re-export all types
export type {
  APIMessage,
  Choice,
  Usage,
  Citation,
  ChatCompletionsRequest,
  ChatCompletionsResponse,
  ChatRequest,
  ChatResponse,
} from './types';

// Re-export APIMessage as Message alias (for backward compatibility)
export type { APIMessage as Message } from './types';

// Re-export all functions
export { sendChatCompletions, sendChatMessage } from './chat';

