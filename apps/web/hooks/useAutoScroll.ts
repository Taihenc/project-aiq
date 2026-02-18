import { useEffect, useRef } from 'react';

const DEBOUNCE_MS = 300;

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

  useEffect(() => {
    const messages = Array.isArray(dependency) ? dependency[0] : dependency;
    const msgArray = Array.isArray(messages) ? messages : [];
    const count = msgArray.length;
    const lastMsg = msgArray[count - 1];
    const lastContent = lastMsg?.content || '';

    const isNewMessage = count !== prevCountRef.current;
    const isContentArrived =
      lastContent.length > 0 && prevLastContentRef.current.length === 0;

    prevCountRef.current = count;
    prevLastContentRef.current = lastContent;

    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (!isNewMessage && !isContentArrived) return;

    // Clear any pending scroll — this is the debounce
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }, DEBOUNCE_MS);
  }, [dependency, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return scrollRef;
}
