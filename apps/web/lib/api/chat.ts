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
  FileRef,
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

import { client, streamFetch } from '@/lib/api/client';

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

  const response = await client.post<ChatCompletionsResponse>('/chat/completions', requestBody);
  return response.data;
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

  const response = await client.post<ChatResponse>('/chat', requestBody);
  return response.data;
}

/**
 * Send chat completions request with streaming (SSE)
 */
export async function streamChatCompletions(
  messages: APIMessage[],
  options?: {
    sessionId?: string;
    requestSource?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    attachments?: FileRef[];
  },
): Promise<ReadableStream<Uint8Array>> {
  const requestBody: ChatCompletionsRequest = {
    messages,
    session_id: options?.sessionId,
    request_source: options?.requestSource || 'frontend',
    model: options?.model,
    temperature: options?.temperature,
    max_tokens: options?.maxTokens,
    stream: true,
    attachments: options?.attachments,
  };

  const stream = await streamFetch('/chat/completions/stream', requestBody);
  if (!stream) {
    throw new Error('No stream returned');
  }
  return stream;
}
