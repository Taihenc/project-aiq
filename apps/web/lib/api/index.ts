/**
 * API Module Exports
 * Central export point for all API-related functions
 *
 * Note: Types should now be imported from @/types instead
 * This file maintains backward compatibility by re-exporting types
 */

// Re-export all types for backward compatibility
export type {
  APIMessage,
  Message,
  Choice,
  Usage,
  Citation,
  ChatCompletionsRequest,
  ChatCompletionsResponse,
  ChatRequest,
  ChatResponse,
} from '@/types/api';

// Re-export all functions
export { sendChatCompletions, sendChatMessage } from './chat';
