import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { UIMessage, UseChatMessagesOptions, BackendMessage, FileRef } from '@/types';
import { PAGINATION } from '@/lib/config/pagination';
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
      if (cached && cached.messages.length > 0) return cached.messages;
    }
    return initialMessages;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(chatId);
  const sessionIdRef = useRef(sessionId);

  // Pagination state for loading older messages
  const [messagesNextCursor, setMessagesNextCursor] = useState<string | null>(() => {
    if (chatId) {
      const cached = useChatStore.getState().getTransitionalMessages(chatId);
      return cached?.cursor ?? null;
    }
    return null;
  });
  const [hasOlderMessages, setHasOlderMessages] = useState<boolean>(() => {
    if (chatId) {
      const cached = useChatStore.getState().getTransitionalMessages(chatId);
      return cached?.hasMore ?? false;
    }
    return false;
  });
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const setTransitionalMessages = useChatStore(
    (state) => state.setTransitionalMessages,
  );

  useEffect(() => {
    if (chatId) {
      setSessionId(chatId);
      sessionIdRef.current = chatId;

      // Wait for auth to be ready
      if (isAuthLoading || !isAuthenticated) return;

      const cachedEntry = useChatStore.getState().getTransitionalMessages(chatId);
      if (cachedEntry && cachedEntry.messages.length > 0) {
        // Already initialized from cache in useState, just refresh from backend silently
        loadMessages(chatId, false);
      } else {
        loadMessages(chatId);
      }
    } else {
      // Guard: if sessionIdRef has a value, we're inside or just after a sendMessage
      // that created a new session. The router.push('/c/{id}') is imminent.
      // Clearing messages here would flash the welcome screen for ~100ms.
      if (!sessionIdRef.current) {
        setSessionId(undefined);
        setMessages([]);
        setMessagesNextCursor(null);
        setHasOlderMessages(false);
      }
    }
  }, [chatId, isAuthenticated, isAuthLoading]);

  const parseBackendMessage = (msg: BackendMessage): UIMessage => ({
    id: msg.id,
    role: msg.role,
    content:
      typeof msg.content === 'string'
        ? msg.content
        : JSON.stringify(msg.content || ''),
    created: msg.createdAt,
    citations:
      typeof msg.citations === 'string'
        ? JSON.parse(msg.citations)
        : msg.citations,
    sentAttachments: msg.sentAttachments
      ? typeof msg.sentAttachments === 'string'
        ? JSON.parse(msg.sentAttachments)
        : msg.sentAttachments
      : undefined,
  });

  const loadMessages = async (id: string, showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    try {
      const { messages: historyMessages, nextCursor, hasMore } =
        await historyApi.getSession(id, { limit: PAGINATION.MESSAGES_PAGE_SIZE });
      const uiMessages = (historyMessages as unknown as BackendMessage[]).map(
        parseBackendMessage,
      );
      setMessages(uiMessages);
      setMessagesNextCursor(nextCursor);
      setHasOlderMessages(hasMore);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOlderMessages = useCallback(async () => {
    if (!sessionId || !messagesNextCursor || isLoadingOlder || !hasOlderMessages) return;

    setIsLoadingOlder(true);
    try {
      const { messages: olderMsgs, nextCursor, hasMore } =
        await historyApi.getSession(sessionId, {
          limit: PAGINATION.MESSAGES_PAGE_SIZE,
          before: messagesNextCursor,
        });
      const olderUiMessages = (olderMsgs as unknown as BackendMessage[]).map(
        parseBackendMessage,
      );
      setMessages((prev) => [...olderUiMessages, ...prev]);
      setMessagesNextCursor(nextCursor);
      setHasOlderMessages(hasMore);
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [sessionId, messagesNextCursor, isLoadingOlder, hasOlderMessages]);

  const sendMessage = async (content: string, attachments?: FileRef[]) => {
    const userMessage: UIMessage = {
      ...createUserMessage(content),
      ...(attachments && attachments.length > 0 ? { sentAttachments: attachments } : {}),
    };
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

        // Collect all statuses from this chunk before calling setMessages
        // React batches synchronous setState calls, so we must do ONE update per chunk.
        const pendingStatuses: string[] = [];

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
            console.log(
              '[SSE] Parsed event:',
              event.type,
              typeof event.content === 'string'
                ? event.content.substring(0, 50)
                : event.content,
            );

            if (event.type === 'status') {
              const statusContent =
                typeof event.content === 'string'
                  ? event.content
                  : JSON.stringify(event.content);
              console.log(
                '[SSE] Setting status:',
                statusContent.substring(0, 80),
              );
              pendingStatuses.push(statusContent);
            } else if (event.type === 'error') {
              console.error('[SSE] AI Error Event:', event.content);
              const errorContent =
                event.content || 'An unexpected error occurred.';

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                      ...m,
                      content: `⚠️ **Failure**: ${errorContent}`,
                      status: undefined,
                    }
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

              const isEmptyResponse = !finalContent || finalContent.trim() === '';

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                      ...m,
                      content: finalContent,
                      citations: Array.isArray(citations) && citations.length > 0 ? citations : undefined,
                      status: undefined,
                      isEmpty: isEmptyResponse,
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

        // Flush all status updates from this chunk in one setMessages call.
        // This prevents React's automatic batching from dropping intermediate statuses.
        if (pendingStatuses.length > 0) {
          const lastStatus = pendingStatuses[pendingStatuses.length - 1];
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                  ...m,
                  status: lastStatus,
                  statusHistory: [...(m.statusHistory || []), ...pendingStatuses],
                }
                : m,
            ),
          );
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
    sessionIdRef.current = undefined;
    setMessagesNextCursor(null);
    setHasOlderMessages(false);
  };

  // Cache latest messages per session to avoid flicker on navigation
  useEffect(() => {
    if (sessionIdRef.current && messages.length > 0) {
      setTransitionalMessages(sessionIdRef.current, {
        messages,
        cursor: messagesNextCursor,
        hasMore: hasOlderMessages,
      });
    }
  }, [messages, messagesNextCursor, hasOlderMessages, setTransitionalMessages]);

  return {
    messages,
    isLoading,
    sessionId,
    sendMessage,
    clearMessages,
    hasOlderMessages,
    loadOlderMessages,
    isLoadingOlder,
  };
}
