/**
 * API Type Definitions
 * OpenAI-compatible types for API communication
 *
 * These types mirror the backend API contracts and should be kept in sync
 */

// OpenAI-compatible message structure (for API requests)
export interface APIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

// OpenAI-compatible choice structure
export interface Choice {
  index: number;
  message: APIMessage;
  finish_reason?: string;
}

// OpenAI-compatible usage structure
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Citation structure (custom extension)
export interface Citation {
  id: string; // = file_path for FileRef citations
  title: string;
  platform: string;
  content?: string;
  /** Chunks carried from the backend for re-attaching */
  chunks?: ChunkMetadata[];
}

// Search-flow attachment types (matching SearchChatRequest schema)
export interface ChunkMetadata {
  chunk_number: number;
  page_number: number;
  score?: number;
  /** Per-chunk text content, populated by backend enrichment */
  content?: string;
}

export interface FileRef {
  file_path: string;
  chunks: ChunkMetadata[];
  /** Display-only: chunk content for hover preview */
  content?: string;
}

/** A file that has been ingested into the knowledge base */
export interface SourceFile {
  /** Canonical path / identifier — matches Citation.id and FileRef.file_path */
  file_path: string;
  /** Human-readable filename */
  name: string;
  /** File extension (pdf, docx, …) */
  ext?: string;
  /** Platform/source label (SharePoint, Upload, …) */
  platform?: string;
  /** Last modified ISO string */
  updated_at?: string;
}

// Search mode for the search-flow service
export type SearchMode = 'auto' | 'search' | 'lookup' | 'chat';

// OpenAI-compatible chat completions request
export interface ChatCompletionsRequest {
  messages: APIMessage[];
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  stop?: string[];
  seed?: number;
  // Additional fields for our system
  session_id?: string;
  request_source?: string;
  provider?: string;
  top_k?: number;
  attachments?: FileRef[];
  /** Search mode forwarded to search-flow service */
  mode?: SearchMode;
  /**
   * ID of the parent message when branching.
   * Set to the message BEFORE the edited/regenerated point so the new messages
   * are attached as siblings in the tree.
   */
  parent_message_id?: string;
  /**
   * ID of the assistant message to regenerate.
   * Frontend sets this so the UI can track which bubble triggered the regen.
   */
  regenerate_from_id?: string;
}

// OpenAI-compatible chat completions response
export interface ChatCompletionsResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
  // Additional fields for our system
  session_id?: string;
  request_source?: string;
  citations?: Citation[];
  processing_time_ms?: number;
}

// Legacy interfaces for backward compatibility
/**
 * @deprecated Use ChatCompletionsRequest instead
 */
export interface ChatRequest {
  chat_box: {
    message: string;
    context?: Record<string, unknown>;
  };
  session_id?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * @deprecated Use ChatCompletionsResponse instead
 */
export interface ChatResponse {
  chat_box: {
    message: string;
    context?: Record<string, unknown>;
  };
  model_used: string;
  timestamp: string;
  processing_time_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  session_id: string;
  chat_id: string;
}

// Type aliases for convenience
// Type aliases for convenience
export type Message = APIMessage;

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackendMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  citations?: string;
  sentAttachments?: string | unknown[];
  /** ID of the parent message in the tree; null = this is the session root */
  parentId?: string | null;
  /** Sibling order under the same parent (0-based) */
  branchIndex?: number;
}

// Paginated responses
export interface PaginatedHistoryResponse {
  sessions: ChatSession[];
  nextCursor: string | null;
}

export interface PaginatedMessagesResponse {
  session: ChatSession;
  messages: BackendMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

