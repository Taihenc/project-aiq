// OpenAI-compatible API client for chat functionality

// OpenAI-compatible message structure
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

// OpenAI-compatible choice structure
export interface Choice {
  index: number;
  message: Message;
  finish_reason?: string;
}

// OpenAI-compatible usage structure
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Citation structure
export interface Citation {
  id: string;
  title: string;
  platform: string;
  content?: string;
}

// OpenAI-compatible chat completions request
export interface ChatCompletionsRequest {
  messages: Message[];
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// OpenAI-compatible API function
export async function sendChatCompletions(
  messages: Message[],
  options?: {
    sessionId?: string;
    requestSource?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }
): Promise<ChatCompletionsResponse> {
  const requestBody: ChatCompletionsRequest = {
    messages,
    session_id: options?.sessionId,
    request_source: options?.requestSource || 'frontend',
    model: options?.model,
    temperature: options?.temperature,
    max_tokens: options?.maxTokens,
    stream: options?.stream,
  };

  const response = await fetch(`${BACKEND_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json();
}

// Legacy API function for backward compatibility
export async function sendChatMessage(message: string, sessionId?: string): Promise<ChatResponse> {
  const requestBody: ChatRequest = {
    chat_box: {
      message,
    },
    session_id: sessionId,
  };

  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json();
}
