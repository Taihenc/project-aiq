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
  id: string;
  title: string;
  platform: string;
  content?: string;
}

// Search-flow attachment types (matching SearchChatRequest schema)
export interface ChunkMetadata {
  chunk_number: number;
  page_number: number;
  score?: number;
}

export interface FileRef {
  file_path: string;
  chunks: ChunkMetadata[];
  /** Display-only: chunk content for hover preview */
  content?: string;
}

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
}

