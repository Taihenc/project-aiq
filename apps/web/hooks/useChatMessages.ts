import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { UIMessage, UseChatMessagesOptions, BackendMessage, FileRef } from '@/types';
import type { SearchMode, SearchFilter } from '@/types/api';
import type { Citation } from '@/lib/api/chat';
import { PAGINATION } from '@/constants/pagination';
import { CHAT_TEMPERATURE, CHAT_MAX_TOKENS } from '@/constants/chat';
import { streamChatCompletions } from '@/lib/api/chat';
import { historyApi } from '@/lib/api/history';
import { useChatStore } from '@/lib/store/chat-store';
import { useExcludeStore } from './useExcludeStore';
import { useSearchFilterStore } from './useSearchFilterStore';
import { useAuth } from '@/lib/auth/auth-context';
import {
  createUserMessage,
  createErrorMessage,
  convertMessagesToAPIFormat,
} from '@/lib/utils/message-transformer';
import { StreamingTextGuard } from '@/lib/utils/streaming-parser';

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

function parseBackendMessageToUI(msg: BackendMessage): UIMessage {
  return {
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
        : (msg.citations as unknown as Citation[]),
    sentAttachments: msg.sentAttachments
      ? typeof msg.sentAttachments === 'string'
        ? JSON.parse(msg.sentAttachments as string)
        : (msg.sentAttachments as FileRef[])
      : undefined,
    searchFilter: msg.searchFilter
      ? typeof msg.searchFilter === 'string'
        ? JSON.parse(msg.searchFilter as string)
        : (msg.searchFilter as SearchFilter)
      : undefined,
    parentId: msg.parentId ?? null,
    branchIndex: msg.branchIndex ?? 0,
  };
}

/**
 * Given a flat tree Map and an ordered activePath (IDs root→leaf),
 * returns active messages with siblingCount computed.
 */
function deriveActiveMessages(
  tree: Map<string, UIMessage>,
  activePath: string[],
): UIMessage[] {
  // Pre-compute sibling groups per parentId, sorted stably by branchIndex then created
  const siblingGroups = new Map<string | null, UIMessage[]>();
  for (const m of tree.values()) {
    const key = m.parentId ?? null;
    if (!siblingGroups.has(key)) siblingGroups.set(key, []);
    siblingGroups.get(key)!.push(m);
  }
  for (const group of siblingGroups.values()) {
    group.sort((a, b) => {
      const ai = a.branchIndex ?? 0;
      const bi = b.branchIndex ?? 0;
      if (ai !== bi) return ai - bi;
      return (a.created ?? 0) - (b.created ?? 0); // tiebreak by insertion time
    });
  }

  return activePath
    .map((id) => {
      const msg = tree.get(id);
      if (!msg) return null;
      const group = siblingGroups.get(msg.parentId ?? null) ?? [msg];
      // Use sorted position so the display is correct even when DB branchIndex
      // values are duplicated (e.g. two root msgs both have branchIndex=0)
      const position = group.findIndex((s) => s.id === msg.id);
      return {
        ...msg,
        branchIndex: position >= 0 ? position : (msg.branchIndex ?? 0),
        siblingCount: group.length,
      };
    })
    .filter(Boolean) as UIMessage[];
}

/**
 * Given a full tree map, walk from root always choosing the child with the
 * highest branchIndex to build the default "latest" path.
 */
function buildDefaultActivePath(tree: Map<string, UIMessage>): string[] {
  if (tree.size === 0) return [];
  const byParent = new Map<string | null, UIMessage[]>();
  for (const m of tree.values()) {
    const key = m.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(m);
  }
  const roots = byParent.get(null) ?? [];
  if (roots.length === 0) return [];
  // Pick root with highest branchIndex (latest branch); tiebreak by latest created
  const root = roots.reduce((a, b) => {
    const ai = a.branchIndex ?? 0;
    const bi = b.branchIndex ?? 0;
    if (ai !== bi) return ai >= bi ? a : b;
    return (a.created ?? 0) >= (b.created ?? 0) ? a : b;
  });

  const path: string[] = [];
  let current: UIMessage | undefined = root;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    path.push(current.id);
    const children: UIMessage[] = byParent.get(current.id) ?? [];
    if (children.length === 0) break;
    // Pick child with highest branchIndex; tiebreak by latest created
    current = children.reduce((a, b) => {
      const ai = a.branchIndex ?? 0;
      const bi = b.branchIndex ?? 0;
      if (ai !== bi) return ai >= bi ? a : b;
      return (a.created ?? 0) >= (b.created ?? 0) ? a : b;
    });
  }
  return path;
}

/**
 * Walk from a tip message upward to the root, building a root→tip path.
 */
function buildPathToTip(tree: Map<string, UIMessage>, tipId: string): string[] {
  const path: string[] = [];
  let current = tree.get(tipId);
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    path.unshift(current.id);
    current = current.parentId ? tree.get(current.parentId) : undefined;
  }
  return path;
}

/**
 * From a node, walk downward always choosing the latest-branchIndex child.
 */
function buildPathFromNodeToLatestLeaf(
  tree: Map<string, UIMessage>,
  nodeId: string,
): string[] {
  const byParent = new Map<string, UIMessage[]>();
  for (const m of tree.values()) {
    if (m.parentId) {
      if (!byParent.has(m.parentId)) byParent.set(m.parentId, []);
      byParent.get(m.parentId)!.push(m);
    }
  }
  const path: string[] = [];
  let current = tree.get(nodeId);
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    path.push(current.id);
    const children: UIMessage[] = byParent.get(current.id) ?? [];
    if (children.length === 0) break;
    current = children.reduce((a, b) => {
      const ai = a.branchIndex ?? 0;
      const bi = b.branchIndex ?? 0;
      if (ai !== bi) return ai >= bi ? a : b;
      return (a.created ?? 0) >= (b.created ?? 0) ? a : b;
    });
  }
  return path;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatMessages(options: UseChatMessagesOptions = {}) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isDemoMode = false, initialMessages = [], chatId } = options;

  // Core tree state
  const [messageTree, setMessageTree] = useState<Map<string, UIMessage>>(() => {
    if (chatId) {
      const cached = useChatStore.getState().getTransitionalMessages(chatId);
      if (cached && cached.messages.length > 0) {
        const tree = new Map(cached.messages.map((m) => [m.id, m]));
        return tree;
      }
    }
    if (initialMessages.length > 0) {
      return new Map(initialMessages.map((m) => [m.id, m]));
    }
    return new Map();
  });

  const [activePath, setActivePath] = useState<string[]>(() => {
    if (chatId) {
      const cached = useChatStore.getState().getTransitionalMessages(chatId);
      if (cached && cached.messages.length > 0) {
        const tree = new Map(cached.messages.map((m) => [m.id, m]));
        return buildDefaultActivePath(tree);
      }
    }
    if (initialMessages.length > 0) {
      const tree = new Map(initialMessages.map((m) => [m.id, m]));
      return buildDefaultActivePath(tree);
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(chatId);
  const sessionIdRef = useRef(sessionId);

  // Available citations for the current branch path
  const [sessionAvailableCitations, setSessionAvailableCitations] = useState<Citation[]>([]);

  const setTransitionalMessages = useChatStore((state) => state.setTransitionalMessages);

  // Helper: fetch branch-scoped citations from the backend
  const fetchBranchCitations = useCallback(async (sid: string, tipId?: string) => {
    try {
      const resp = await historyApi.getPathCitations(sid, tipId);
      setSessionAvailableCitations(Array.isArray(resp.citations) ? resp.citations : []);
    } catch (err) {
      console.error('Failed to fetch branch citations:', err);
    }
  }, []);

  // Derived: flat messages array from active path (what components consume)
  const messages = useMemo(
    () => deriveActiveMessages(messageTree, activePath),
    [messageTree, activePath],
  );

  // ---------------------------------------------------------------------------
  // Load / refresh tree from backend
  // ---------------------------------------------------------------------------

  const loadMessages = useCallback(async (id: string, showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    try {
      const { messages: rawMessages, activePath: serverPath } =
        await historyApi.getSessionTree(id);

      const tree = new Map(
        rawMessages.map((m) => [m.id, parseBackendMessageToUI(m)]),
      );
      setMessageTree(tree);
      const resolvedPath = serverPath.length > 0 ? serverPath : buildDefaultActivePath(tree);
      setActivePath(resolvedPath);

      // Fetch branch-scoped citations for the active path tip
      const tipId = resolvedPath[resolvedPath.length - 1];
      if (tipId) {
        await fetchBranchCitations(id, tipId);
      } else {
        setSessionAvailableCitations([]);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (chatId) {
      setSessionId(chatId);
      sessionIdRef.current = chatId;
      if (isAuthLoading || !isAuthenticated) return;

      const cachedEntry = useChatStore.getState().getTransitionalMessages(chatId);
      if (cachedEntry && cachedEntry.messages.length > 0) {
        loadMessages(chatId, false);
      } else {
        loadMessages(chatId);
      }
    } else {
      if (!sessionIdRef.current) {
        setSessionId(undefined);
        setMessageTree(new Map());
        setActivePath([]);
      }
    }
  }, [chatId, isAuthenticated, isAuthLoading, loadMessages]);

  // Cache active messages per session for seamless navigation
  useEffect(() => {
    if (sessionIdRef.current && messages.length > 0) {
      setTransitionalMessages(sessionIdRef.current, {
        messages,
        cursor: null,
        hasMore: false,
      });
    }
  }, [messages, setTransitionalMessages]);

  // ---------------------------------------------------------------------------
  // Core sendMessage (internal) — accepts an optional parentMessageId
  // ---------------------------------------------------------------------------

  const sendMessageInternal = useCallback(async (
    content: string,
    attachments?: FileRef[],
    mode?: SearchMode,
    parentMessageId?: string | null,
    filter?: SearchFilter,
  ) => {
    // Optimistic user message
    const tempUserId = `__temp_user_${Date.now()}`;
    const tempAsstId = `__temp_asst_${Date.now() + 1}`;

    const userMsg: UIMessage = {
      ...createUserMessage(content),
      id: tempUserId,
      parentId: parentMessageId ?? (activePath[activePath.length - 1] ?? null),
      branchIndex: 0,
      ...(attachments && attachments.length > 0 ? { sentAttachments: attachments } : {}),
      ...(filter ? { searchFilter: filter } : {}),
    };

    const asstMsg: UIMessage = {
      id: tempAsstId,
      role: 'assistant',
      content: '',
      status: 'initializing',
      parentId: tempUserId,
      branchIndex: 0,
    };

    // Compute the effective parent for the tree insertion
    const effectiveParent = parentMessageId !== undefined
      ? parentMessageId
      : (activePath[activePath.length - 1] ?? null);

    // Build new optimistic active path
    const pathToParent = effectiveParent
      ? buildPathToTip(messageTree, effectiveParent)
      : [];
    const newActivePath = [...pathToParent, tempUserId, tempAsstId];

    setMessageTree((prev) => {
      const next = new Map(prev);
      next.set(tempUserId, userMsg);
      next.set(tempAsstId, asstMsg);
      return next;
    });
    setActivePath(newActivePath);
    setIsLoading(true);

    let currentSessionId = sessionId;
    let assistantMessageId = tempAsstId;

    try {
      if (!currentSessionId && !isDemoMode) {
        try {
          const newSession = await historyApi.createSession(content.slice(0, 30) + '...');
          currentSessionId = newSession.id;
          setSessionId(currentSessionId);
          sessionIdRef.current = currentSessionId;
        } catch (e) {
          console.error('Failed to create session', e);
        }
      }

      // Build context messages from the path up to the effective parent
      const pathMessages = pathToParent
        .map((id) => messageTree.get(id))
        .filter(Boolean) as UIMessage[];
      const apiMessages = convertMessagesToAPIFormat(pathMessages);
      apiMessages.push({ role: 'user', content });

      const stream = await streamChatCompletions(apiMessages, {
        sessionId: currentSessionId,
        requestSource: 'frontend',
        temperature: CHAT_TEMPERATURE,
        maxTokens: CHAT_MAX_TOKENS,
        attachments,
        mode,
        filter,
        parentMessageId: effectiveParent ?? undefined,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';
      const tokenGuard = new StreamingTextGuard();
      tokenGuard.reset();
      let resultReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        const pendingStatuses: string[] = [];

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const rawData = trimmedLine.slice(6);
          try {
            const event = JSON.parse(rawData);

            if (event.type === 'status') {
              const sc = typeof event.content === 'string' ? event.content : JSON.stringify(event.content);
              pendingStatuses.push(sc);
            } else if (event.type === 'token') {
              const rawToken = typeof event.content === 'string' ? event.content : '';
              const safeToken = tokenGuard.feed(rawToken);
              if (safeToken) {
                setMessageTree((prev) => {
                  const next = new Map(prev);
                  const m = next.get(assistantMessageId);
                  if (m) next.set(assistantMessageId, { ...m, content: m.content + safeToken, isStreaming: true });
                  return next;
                });
              }
            } else if (event.type === 'error') {
              const errorContent = event.content || 'An unexpected error occurred.';
              setMessageTree((prev) => {
                const next = new Map(prev);
                const m = next.get(assistantMessageId);
                if (m) next.set(assistantMessageId, { ...m, content: errorContent, isError: true, status: undefined, isStreaming: false });
                return next;
              });
            } else if (event.type === 'result') {
              resultReceived = true;
              let finalContent = '';
              let citations = event.sources_used;

              if (typeof event.content === 'object' && event.content !== null) {
                if ('final_answer' in event.content) {
                  finalContent = event.content.final_answer;
                  if (Array.isArray(event.content.file_path)) {
                    citations = event.content.file_path.map((path: string, index: number) => ({
                      id: `citation-${index}`, title: path.split('/').pop() || path, platform: 'File', content: '',
                    }));
                  }
                } else if ('response' in event.content) {
                  finalContent = event.content.response;
                  if (Array.isArray(event.content.citations)) citations = event.content.citations;
                  tokenGuard.reset();
                } else {
                  finalContent = JSON.stringify(event.content);
                }
              } else {
                finalContent = event.content;
              }

              // Note: citations_updated signal from backend is handled by
              // loadMessages() which re-fetches branch citations after DB writes complete.

              setMessageTree((prev) => {
                const next = new Map(prev);
                const m = next.get(assistantMessageId);
                if (m) {
                  next.set(assistantMessageId, {
                    ...m,
                    content: finalContent,
                    citations: Array.isArray(citations) && citations.length > 0 ? citations : undefined,
                    status: undefined,
                    isEmpty: !finalContent || finalContent.trim() === '',
                    isStreaming: false,
                  });
                }
                return next;
              });

              // Refresh tree from backend to get real IDs
              if (currentSessionId && sessionIdRef.current === currentSessionId) {
                useChatStore.getState().fetchHistory();
                // Reload tree after a brief delay to ensure DB writes are done
                setTimeout(async () => {
                  if (currentSessionId) {
                    await loadMessages(currentSessionId, false);
                  }
                }, 300);

                if (!sessionId && currentSessionId) {
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

        if (pendingStatuses.length > 0) {
          const lastStatus = pendingStatuses[pendingStatuses.length - 1];
          setMessageTree((prev) => {
            const next = new Map(prev);
            const m = next.get(assistantMessageId);
            if (m) {
              next.set(assistantMessageId, {
                ...m,
                status: lastStatus,
                statusHistory: [...(m.statusHistory || []), ...pendingStatuses],
              });
            }
            return next;
          });
        }
      }

      // If the stream ended without delivering a result event (e.g. abrupt close,
      // empty body) and the assistant message is not already in an error/done state,
      // mark it as an error so the user sees the Retry button.
      if (!resultReceived) {
        setMessageTree((prev) => {
          const next = new Map(prev);
          const m = next.get(assistantMessageId);
          if (m && !m.isError && (!m.content || m.status !== undefined)) {
            next.set(assistantMessageId, {
              ...m,
              content: m.content || 'The response stream ended unexpectedly. Please try again.',
              isError: true,
              status: undefined,
              isStreaming: false,
            });
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      if (sessionIdRef.current === currentSessionId) {
        // Keep the user's message so the prompt is not lost; replace the
        // temporary assistant placeholder with an error response instead.
        const errorMsgId = `__error_${Date.now()}`;
        const errorMsg: UIMessage = {
          id: errorMsgId,
          role: 'assistant',
          content:
            'Sorry, I encountered an error processing your request. Please make sure the backend server is running and try again.',
          parentId: tempUserId,
          branchIndex: 0,
          isError: true,
        };
        setMessageTree((prev) => {
          const next = new Map(prev);
          next.delete(tempAsstId);
          next.set(errorMsgId, errorMsg);
          return next;
        });
        setActivePath((prev) => {
          const filtered = prev.filter((id) => id !== tempAsstId);
          return [...filtered, errorMsgId];
        });
      }
    } finally {
      if (sessionIdRef.current === currentSessionId) {
        setIsLoading(false);
      }
    }
  }, [sessionId, activePath, messageTree, isDemoMode, loadMessages, router]);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Send a new message at the end of the current active path */
  const sendMessage = useCallback(
    (content: string, attachments?: FileRef[], mode?: SearchMode, filter?: SearchFilter) => {
      return sendMessageInternal(content, attachments, mode, undefined, filter);
    },
    [sendMessageInternal],
  );

  /**
   * Edit a user message — creates a new branch sibling from the same parent.
   * @param messageId  ID of the user message being edited
   * @param newContent New text content
   * @param attachments Optional attachments for the new turn
   * @param mode Search mode
   */
  const editUserMessage = useCallback(
    (messageId: string, newContent: string, attachments?: FileRef[], mode?: SearchMode) => {
      const msg = messageTree.get(messageId);
      if (!msg) return;
      // The new message pair is a sibling of `messageId`, so parent = messageId's parent
      const parentOfEdit = msg.parentId ?? null;
      return sendMessageInternal(newContent, attachments, mode, parentOfEdit);
    },
    [messageTree, sendMessageInternal],
  );

  /**
   * Regenerate an assistant response — re-sends the parent user message content
   * so a new user+assistant pair is created as siblings of the original.
   * @param assistantMessageId ID of the assistant message to regenerate
   */
  const regenerateResponse = useCallback(
    (assistantMessageId: string) => {
      const asstMsg = messageTree.get(assistantMessageId);
      if (!asstMsg) return;
      const userMsg = asstMsg.parentId ? messageTree.get(asstMsg.parentId) : undefined;
      if (!userMsg) return;
      // Parent of new pair = grandparent of the assistant message
      const parentOfRegen = userMsg.parentId ?? null;

      // Build the current active filter from both stores
      const { excludedPaths, excludedFileIds } = useExcludeStore.getState();
      const { department, team, project, tags, file_type } = useSearchFilterStore.getState();
      const metaFilter: Partial<SearchFilter> = {
        ...((excludedPaths.length > 0 || excludedFileIds.length > 0)
          ? {
              ...(excludedPaths.length > 0 ? { exclude: excludedPaths } : {}),
              ...(excludedFileIds.length > 0
                ? { exclude_file_ids: excludedFileIds }
                : {}),
            }
          : {}),
        ...(file_type ? { file_type } : {}),
        ...(department ? { department } : {}),
        ...(team ? { team } : {}),
        ...(project ? { project } : {}),
        ...(tags.length > 0 ? { tags } : {}),
      };
      const filter: SearchFilter | undefined =
        Object.keys(metaFilter).length > 0 ? metaFilter : undefined;

      return sendMessageInternal(
        userMsg.content,
        userMsg.sentAttachments,
        undefined,
        parentOfRegen,
        filter,
      );
    },
    [messageTree, sendMessageInternal],
  );

  /**
   * Navigate to a sibling branch of a given message.
   * @param messageId  ID of the message whose siblings to navigate
   * @param direction  'prev' | 'next'
   */
  const navigateBranch = useCallback(
    (messageId: string, direction: 'prev' | 'next') => {
      const msg = messageTree.get(messageId);
      if (!msg) return;
      const parentId = msg.parentId ?? null;

      // Collect siblings (same parent), sort stably by branchIndex then created
      const siblings = Array.from(messageTree.values())
        .filter((m) => (m.parentId ?? null) === parentId)
        .sort((a, b) => {
          const ai = a.branchIndex ?? 0;
          const bi = b.branchIndex ?? 0;
          if (ai !== bi) return ai - bi;
          return (a.created ?? 0) - (b.created ?? 0);
        });

      if (siblings.length <= 1) return;

      const currentIdx = siblings.findIndex((s) => s.id === messageId);
      if (currentIdx === -1) return;

      const targetIdx = direction === 'prev' ? currentIdx - 1 : currentIdx + 1;
      if (targetIdx < 0 || targetIdx >= siblings.length) return;

      const targetSibling = siblings[targetIdx];

      // Build new active path: path from root to parent + target sibling's subtree
      const pathToParent = parentId ? buildPathToTip(messageTree, parentId) : [];
      const pathDown = buildPathFromNodeToLatestLeaf(messageTree, targetSibling.id);
      const newPath = [...pathToParent, ...pathDown];
      setActivePath(newPath);

      // Re-fetch citations for the new branch tip
      const sid = sessionIdRef.current;
      if (sid) {
        const tipId = newPath[newPath.length - 1];
        fetchBranchCitations(sid, tipId);
      }
    },
    [messageTree, fetchBranchCitations],
  );

  /**
   * Navigate the active path so that it passes through `messageId`.
   * Builds root→messageId, then extends to the latest leaf below it.
   */
  const navigateToMessage = useCallback(
    (messageId: string) => {
      if (!messageTree.has(messageId)) return;
      const pathToNode = buildPathToTip(messageTree, messageId);
      const pathDown = buildPathFromNodeToLatestLeaf(messageTree, messageId);
      // pathToNode already ends at messageId; pathDown starts at messageId — merge
      const merged = [...pathToNode, ...pathDown.slice(1)];
      setActivePath(merged);

      // Re-fetch citations for the new branch tip
      const sid = sessionIdRef.current;
      if (sid) {
        const tipId = merged[merged.length - 1];
        fetchBranchCitations(sid, tipId);
      }
    },
    [messageTree, fetchBranchCitations],
  );

  const clearMessages = () => {
    setMessageTree(new Map());
    setActivePath([]);
    setSessionId(undefined);
    sessionIdRef.current = undefined;
  };

  // Kept for backward compat — with tree loading all messages at once, this is a no-op
  const loadOlderMessages = useCallback(async () => {
    if (sessionIdRef.current) {
      await loadMessages(sessionIdRef.current, false);
    }
  }, [loadMessages]);

  return {
    messages,
    messageTree,
    activePath,
    isLoading,
    sessionId,
    sendMessage,
    editUserMessage,
    regenerateResponse,
    navigateBranch,
    navigateToMessage,
    clearMessages,
    // kept for backward compat (tree loads everything at once)
    hasOlderMessages: false,
    loadOlderMessages,
    isLoadingOlder: false,
    sessionAvailableCitations,
  };
}
