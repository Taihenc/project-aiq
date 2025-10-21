import { useEffect, useRef } from 'react';

/**
 * Custom hook to auto-scroll to bottom when dependency changes
 */
export function useAutoScroll<T>(dependency: T) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dependency]);

  return scrollRef;
}

