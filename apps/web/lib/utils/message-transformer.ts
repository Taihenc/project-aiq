import { UIMessage } from '@/types/chat';
import { ChatCompletionsResponse, Message } from '@/lib/api/chat';

/**
 * Creates a user message object
 */
export function createUserMessage(content: string): UIMessage {
  return {
    id: Date.now().toString(),
    role: 'user',
    content,
  };
}

/**
 * Creates an error message object
 */
export function createErrorMessage(): UIMessage {
  return {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content:
      'Sorry, I encountered an error processing your request. Please make sure the backend server is running and try again.',
  };
}

/**
 * Generates a demo response message
 */
export function createDemoResponse(hasCitations: boolean = false): UIMessage {
  return {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: hasCitations
      ? 'This is a demo response with citations. The system is in preview mode with sample data.'
      : 'This is a demo response without citations. The system is in preview mode.',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-3.5-turbo',
    finish_reason: 'stop',
    citations: hasCitations
      ? [
          {
            id: 'demo-1',
            title: 'Demo Document',
            platform: 'Preview',
            content: 'This is sample content for demonstration purposes.',
          },
        ]
      : undefined,
    processing_time_ms: 1000,
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };
}

/**
 * Transforms ChatCompletionsResponse to UI Message
 */
export function transformResponseToMessage(
  response: ChatCompletionsResponse
): UIMessage {
  return {
    id: response.id,
    role: 'assistant',
    content: response.choices[0].message.content,
    // Map all fields from ChatCompletionsResponseDto
    object: response.object,
    created: response.created,
    model: response.model,
    finish_reason: response.choices[0].finish_reason,
    session_id: response.session_id,
    request_source: response.request_source,
    citations:
      response.citations && response.citations.length > 0
        ? response.citations
        : undefined,
    processing_time_ms: response.processing_time_ms,
    usage: {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens,
    },
  };
}

/**
 * Converts UI messages to API message format
 */
export function convertMessagesToAPIFormat(messages: UIMessage[]): Message[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

