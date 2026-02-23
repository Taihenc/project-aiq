'use client';

import { useEffect, useRef } from 'react';
import type { IngestionStatus } from '@/components/features/sharepoint/file-status-badge';

export interface FileStatusEvent {
  file_id: string;
  source_id: string;
  status: IngestionStatus;
  file_name?: string;
}

/**
 * Subscribe to live file-status events pushed by the NestJS backend via
 * Server-Sent Events (SSE).  The FSS calls POST /sharepoint/webhook/status
 * on every status change; NestJS fans that out over this SSE endpoint.
 *
 * We connect directly to the NestJS backend URL instead of going through
 * the Next.js rewrite proxy to avoid response-buffering issues with SSE.
 */
export function useFileStatusEvents(
  onUpdate: (event: FileStatusEvent) => void,
) {
  // Keep a stable ref so the effect doesn't re-run when the consumer
  // creates a new inline callback on every render.
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    const url = `${backendUrl}/api/v1/sharepoint/events`;

    let es: EventSource;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(url, { withCredentials: true });

      es.onmessage = (e: MessageEvent<string>) => {
        try {
          const data: FileStatusEvent = JSON.parse(e.data);
          onUpdateRef.current(data);
        } catch {
          // Malformed frame — ignore
        }
      };

      es.onerror = () => {
        // EventSource automatically tries to reconnect for transient errors.
        // For a persistent failure we do a manual back-off reconnect.
        es.close();
        retryTimeout = setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      es?.close();
    };
  }, []); // Empty dep array: connect once, cleanup on unmount
}
