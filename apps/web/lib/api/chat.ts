// API client for chat functionality

export interface ChatRequest {
  chat_box: {
    message: string;
    context?: Record<string, any>;
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
    context?: Record<string, any>;
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
