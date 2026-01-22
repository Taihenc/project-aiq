import { useState } from 'react';
import type { UIMessage, UseChatMessagesOptions } from '@/types';
import { sendChatCompletions } from '@/lib/api/chat';
import {
  createUserMessage,
  createErrorMessage,
  createDemoResponse,
  transformResponseToMessage,
  convertMessagesToAPIFormat,
} from '@/lib/utils/message-transformer';

export function useChatMessages(options: UseChatMessagesOptions = {}) {
  const { isDemoMode = false, initialMessages = [] } = options;

  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const sendMessage = async (content: string) => {
    // Add user message immediately
    const userMessage = createUserMessage(content);
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Demo mode - simulate response
    if (isDemoMode) {
      setTimeout(() => {
        // Simulate different responses - some with citations, some without
        const hasCitations = Math.random() > 0.5; // 50% chance of having citations
        const demoResponse = createDemoResponse(hasCitations);
        setMessages((prev) => [...prev, demoResponse]);
        setIsLoading(false);
      }, 3000);
      return;
    }

    // Real mode - connect to backend
    try {
      // Convert current messages to OpenAI format
      const apiMessages = convertMessagesToAPIFormat(messages);

      // Add the new user message
      apiMessages.push({
        role: 'user',
        content: content,
      });

      // Send message to backend using OpenAI format
      const response = await sendChatCompletions(apiMessages, {
        sessionId: sessionId,
        requestSource: 'frontend',
        temperature: 0.7,
        maxTokens: 1000,
      });

      // Update session ID if it's a new session
      if (!sessionId && response.session_id) {
        setSessionId(response.session_id);
      }

      // Transform and add AI response
      const aiMessage = transformResponseToMessage(response);
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);

      // Add error message
      const errorMessage = createErrorMessage();
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setSessionId(undefined);
  };

  return {
    messages,
    isLoading,
    sessionId,
    sendMessage,
    clearMessages,
  };
}
