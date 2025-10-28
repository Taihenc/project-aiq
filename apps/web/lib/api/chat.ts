/**
 * Chat API Client
 * Functions for communicating with the chat backend
 */

import type {
  APIMessage,
  ChatCompletionsRequest,
  ChatCompletionsResponse,
  ChatRequest,
  ChatResponse,
} from '@/types/api';

// Re-export types for backward compatibility
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

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

/**
 * Send chat completions request (OpenAI-compatible)
 */
export async function sendChatCompletions(
  messages: APIMessage[],
  options?: {
    sessionId?: string;
    requestSource?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  },
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

/**
 * Send chat message (Legacy API)
 * @deprecated Use sendChatCompletions instead
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
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
