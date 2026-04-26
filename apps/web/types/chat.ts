import type { Citation, FileRef, SearchFilter } from './api';

/**
 * UI Message interface that reflects the ChatCompletionsResponseDto from backend
 * This is used for storing and displaying messages in the UI
 *
 * Note: This is different from Message (APIMessage) in @/types
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
  status?: string; // Latest real-time status update
  statusHistory?: string[]; // All status updates accumulated during streaming
  isEmpty?: boolean; // True when the AI returned an empty response
  /** True while token events are still arriving (before the result event) */
  isStreaming?: boolean;
  /** Attachments (citation FileRefs) that were sent with this user message */
  sentAttachments?: FileRef[];
  /** Search filter that was active when the user sent this message */
  searchFilter?: SearchFilter;
  // --- Message tree fields ---
  /** ID of the parent message in the tree; null = root of session */
  parentId?: string | null;
  /** Sibling order under the same parent (0-based) */
  branchIndex?: number;
  /** Total sibling count at this level (computed by useChatMessages from the tree) */
  siblingCount?: number;
}
