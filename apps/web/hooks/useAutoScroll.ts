import { useEffect, useRef } from 'react';
import { AUTO_SCROLL_DEBOUNCE_MS } from '@/constants/chat';

/**
 * Custom hook to auto-scroll to bottom with debounce + smooth scroll.
 *
 * - Debounced: rapid-fire state updates (status, citations) only trigger
 *   a single scroll after things settle down.
 * - Smooth: uses `scrollIntoView({ behavior: 'smooth' })` for a
 *   natural sliding feel instead of jumping.
 * - Only scrolls when meaningful changes happen (new message or content arrived).
 */
export function useAutoScroll<T>(dependency: T, enabled: boolean = true) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCountRef = useRef(0);
  const prevLastContentRef = useRef('');
  const prevLastIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const messages = Array.isArray(dependency) ? dependency[0] : dependency;
    const msgArray = Array.isArray(messages) ? messages : [];
    const count = msgArray.length;
    const lastMsg = msgArray[count - 1];
    const lastContent = lastMsg?.content || '';
    const lastId = lastMsg?.id;

    const isNewMessage = count !== prevCountRef.current;
    const isContentArrived =
      lastContent.length > 0 && prevLastContentRef.current.length === 0;

    // Detect initial load: messages jump from 0 to many (e.g. opening old chat)
    const isInitialLoad = prevCountRef.current === 0 && count > 1;

    // Detect prepend: count increased but the last message ID hasn't changed
    // This means older messages were added to the top, not new messages at the bottom
    const isPrepend =
      isNewMessage &&
      count > prevCountRef.current &&
      lastId !== undefined &&
      lastId === prevLastIdRef.current;

    prevCountRef.current = count;
    prevLastContentRef.current = lastContent;
    prevLastIdRef.current = lastId;

    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Skip scroll when older messages are prepended to the top
    if (isPrepend) return;

    if (!isNewMessage && !isContentArrived) return;

    // Clear any pending scroll — this is the debounce
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (isInitialLoad) {
      // Instant scroll for history load — no animation, no delay
      requestAnimationFrame(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'instant' });
      });
    } else {
      // Smooth debounced scroll for live conversation
      timerRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      }, AUTO_SCROLL_DEBOUNCE_MS);
    }
  }, [dependency, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return scrollRef;
}
