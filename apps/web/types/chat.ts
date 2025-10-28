import type { Citation } from './api';

/**
 * UI Message interface that reflects the ChatCompletionsResponseDto from backend
 * This is used for storing and displaying messages in the UI
 *
 * Note: This is different from Message (APIMessage) in @/lib/api/types
 * - UIMessage: For UI state management (includes all response fields)
 * - Message: For API requests (minimal required fields)
 */
export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Fields from ChatCompletionsResponseDto
  object?: string; // e.g., "chat.completion"
  created?: number; // Unix timestamp
  model?: string;
  finish_reason?: string; // From choices[0].finish_reason
  session_id?: string;
  request_source?: string;
  citations?: Citation[]; // From response.citations
  processing_time_ms?: number;
  // Usage information from response.usage
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
