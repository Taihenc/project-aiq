import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { UIMessage, UseChatMessagesOptions, BackendMessage } from '@/types';
import { sendChatCompletions } from '@/lib/api/chat';
import { historyApi } from '@/lib/api/history';
import { useChatStore } from '@/lib/store/chat-store';
import {
  createUserMessage,
  createErrorMessage,
  transformResponseToMessage,
  convertMessagesToAPIFormat,
} from '@/lib/utils/message-transformer';

export function useChatMessages(options: UseChatMessagesOptions = {}) {
  const router = useRouter();
  const { isDemoMode = false, initialMessages = [], chatId } = options;

  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(chatId);
  const sessionIdRef = useRef(sessionId);
  const setTransitionalMessages = useChatStore((state) => state.setTransitionalMessages);

  useEffect(() => {
    if (chatId) {
      setSessionId(chatId);
      sessionIdRef.current = chatId;

      const cachedMessages = useChatStore.getState().getTransitionalMessages(chatId);
      if (cachedMessages && cachedMessages.length > 0) {
        setMessages(cachedMessages);
        loadMessages(chatId, false);
      } else {
        loadMessages(chatId);
      }
    } else {
      setSessionId(undefined);
      sessionIdRef.current = undefined;
      setMessages([]);
    }
  }, [chatId]);

  const loadMessages = async (id: string, showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    try {
      const { messages: historyMessages } = await historyApi.getSession(id);
      const uiMessages: UIMessage[] = (historyMessages as unknown as BackendMessage[]).map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        citations: msg.citations ? JSON.parse(msg.citations) : undefined,
      }));
      setMessages(uiMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    const userMessage = createUserMessage(content);
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    let currentSessionId = sessionId;
    try {
      if (!currentSessionId && !isDemoMode) {
        try {
          const newSession = await historyApi.createSession(content.slice(0, 30) + '...');
          currentSessionId = newSession.id;
          setSessionId(currentSessionId);
          sessionIdRef.current = currentSessionId;

        } catch (e) {
          console.error("Failed to create session", e);
        }
      }

      // Convert current messages to OpenAI format
      const apiMessages = convertMessagesToAPIFormat(messages);

      // Add the new user message
      apiMessages.push({
        role: 'user',
        content: content,
      });

      // Send message to backend
      const response = await sendChatCompletions(apiMessages, {
        sessionId: currentSessionId,
        requestSource: 'frontend',
        temperature: 0.7,
        maxTokens: 1000,
      });

      // Transform and add AI response
      const aiMessage = transformResponseToMessage(response);

      if (sessionIdRef.current === currentSessionId) {
        setMessages((prev) => [...prev, aiMessage]);

        useChatStore.getState().fetchHistory();

        // If this was a newly created session (and we are still on it), navigate now
        // This ensures the messages are persisted in DB before the new page loads them
        if (!sessionId && currentSessionId) {
          router.push(`/c/${currentSessionId}`);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Only show error if we are still on the same session
      if (sessionIdRef.current === currentSessionId) {
        const errorMessage = createErrorMessage();
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      if (sessionIdRef.current === currentSessionId) {
        setIsLoading(false);
      }
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setSessionId(undefined);
  };

  // Cache latest messages per session to avoid flicker on navigation
  useEffect(() => {
    if (sessionIdRef.current && messages.length > 0) {
      setTransitionalMessages(sessionIdRef.current, messages);
    }
  }, [messages, setTransitionalMessages]);

  return {
    messages,
    isLoading,
    sessionId,
    sendMessage,
    clearMessages,
  };
}
