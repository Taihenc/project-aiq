import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { UIMessage, UseChatMessagesOptions, BackendMessage, FileRef } from '@/types';
import { streamChatCompletions } from '@/lib/api/chat';
import { historyApi } from '@/lib/api/history';
import { useChatStore } from '@/lib/store/chat-store';
import { useAuth } from '@/lib/auth/auth-context';
import {
  createUserMessage,
  createErrorMessage,
  convertMessagesToAPIFormat,
} from '@/lib/utils/message-transformer';

export function useChatMessages(options: UseChatMessagesOptions = {}) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isDemoMode = false, initialMessages = [], chatId } = options;

  // Initialize messages from cache immediately to avoid flash on navigation
  const [messages, setMessages] = useState<UIMessage[]>(() => {
    if (chatId) {
      const cached = useChatStore.getState().getTransitionalMessages(chatId);
      if (cached && cached.length > 0) return cached;
    }
    return initialMessages;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(chatId);
  const sessionIdRef = useRef(sessionId);
  const setTransitionalMessages = useChatStore(
    (state) => state.setTransitionalMessages,
  );

  useEffect(() => {
    if (chatId) {
      setSessionId(chatId);
      sessionIdRef.current = chatId;

      const store = useChatStore.getState();

      // Wait for auth and history to be ready
      if (isAuthLoading || !isAuthenticated || store.isLoadingHistory) return;

      // Verify the chat exists in the local history before attempting to fetch
      // This prevents 404 errors in the console for non-existent/unauthorized chats
      const chatExists = store.history.some(h => h.id === chatId);
      if (!chatExists) return;

      const cachedMessages = store.getTransitionalMessages(chatId);
      if (cachedMessages && cachedMessages.length > 0) {
        // Already initialized from cache in useState, just refresh from backend silently
        loadMessages(chatId, false);
      } else {
        loadMessages(chatId);
      }
    } else {
      setSessionId(undefined);
      sessionIdRef.current = undefined;
      setMessages([]);
    }
  }, [chatId, isAuthenticated, isAuthLoading]);

  const loadMessages = async (id: string, showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    try {
      const { messages: historyMessages } = await historyApi.getSession(id);
      const uiMessages: UIMessage[] = (
        historyMessages as unknown as BackendMessage[]
      ).map((msg) => ({
        id: msg.id,
        role: msg.role,
        content:
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content || ''),
        timestamp: new Date(msg.createdAt),
        citations:
          typeof msg.citations === 'string'
            ? JSON.parse(msg.citations)
            : msg.citations,
      }));
      setMessages(uiMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string, attachments?: FileRef[]) => {
    const userMessage = createUserMessage(content);
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    let currentSessionId = sessionId;
    let assistantMessageId: string | undefined;

    try {
      if (!currentSessionId && !isDemoMode) {
        try {
          const newSession = await historyApi.createSession(
            content.slice(0, 30) + '...',
          );
          currentSessionId = newSession.id;
          setSessionId(currentSessionId);
          sessionIdRef.current = currentSessionId;
        } catch (e) {
          console.error('Failed to create session', e);
        }
      }

      // Convert current messages to OpenAI format
      const apiMessages = convertMessagesToAPIFormat(messages);

      // Add the new user message
      apiMessages.push({
        role: 'user',
        content: content,
      });

      // Add a placeholder message for the assistant
      assistantMessageId = (Date.now() + 2).toString();
      const initialAiMessage: UIMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        status: 'initializing',
      };
      setMessages((prev) => [...prev, initialAiMessage]);

      // Start streaming from backend
      const stream = await streamChatCompletions(apiMessages, {
        sessionId: currentSessionId,
        requestSource: 'frontend',
        temperature: 0.7,
        maxTokens: 1000,
        attachments,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[SSE] Stream done. Remaining buffer:', lineBuffer);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('[SSE] Raw chunk received:', chunk.substring(0, 200));
        lineBuffer += chunk;
        const lines = lineBuffer.split('\n');

        // Keep the last partial line in the buffer
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          console.log('[SSE] Processing line:', trimmedLine.substring(0, 150));

          if (!trimmedLine.startsWith('data: ')) {
            console.log('[SSE] Skipping non-data line');
            continue;
          }

          const rawData = trimmedLine.slice(6);
          try {
            const event = JSON.parse(rawData);
            console.log('[SSE] Parsed event:', event.type, typeof event.content === 'string' ? event.content.substring(0, 50) : event.content);

            if (event.type === 'status') {
              const statusContent =
                typeof event.content === 'string'
                  ? event.content
                  : JSON.stringify(event.content);
              console.log('[SSE] Setting status:', statusContent.substring(0, 80));
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, status: statusContent }
                    : m,
                ),
              );
            } else if (event.type === 'result') {
              console.log('[SSE] AI Result Received');

              let finalContent = '';
              let citations = event.sources_used;

              // Parse content if it's an object
              if (typeof event.content === 'object' && event.content !== null) {
                // Formatting for OLD AI Engine
                if ('final_answer' in event.content) {
                  finalContent = event.content.final_answer;
                  // Handle file_path as citations if present
                  if (Array.isArray(event.content.file_path)) {
                    citations = event.content.file_path.map((path: string, index: number) => ({
                      id: `citation-${index}`,
                      title: path.split('/').pop() || path,
                      platform: 'File',
                      content: '',
                    }));
                  }
                }
                // Formatting for NEW Search Flow
                else if ('response' in event.content) {
                  finalContent = event.content.response;
                  // Pass through enriched citations directly from backend
                  if (Array.isArray(event.content.citations)) {
                    citations = event.content.citations;
                  }
                }
                else {
                  finalContent = JSON.stringify(event.content);
                }
              } else {
                finalContent = event.content;
              }

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                      ...m,
                      content: finalContent,
                      citations: Array.isArray(citations) && citations.length > 0 ? citations : undefined,
                      status: undefined,
                    }
                    : m,
                ),
              );

              // Trigger history refresh and navigation after full result
              if (sessionIdRef.current === currentSessionId) {
                useChatStore.getState().fetchHistory();
                if (!sessionId && currentSessionId) {
                  // Delay navigation slightly to ensure cache is written first
                  // This prevents the flash of empty messages on re-mount
                  setTimeout(() => {
                    router.push(`/c/${currentSessionId}`);
                  }, 100);
                }
              }
            }
          } catch (e) {
            console.warn('[SSE] JSON parse error:', e, 'Raw data:', rawData.substring(0, 100));
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Only show error if we are still on the same session
      if (sessionIdRef.current === currentSessionId) {
        const errorMessage = createErrorMessage();
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== assistantMessageId),
          errorMessage,
        ]);
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
