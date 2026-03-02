'use client';

import { useEffect, useRef } from 'react';
import type { IngestionStatus } from '@/components/features/sharepoint/file-status-badge';
import { sharePointApi } from '@/lib/api/sharepoint';

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
    const baseUrl = `${backendUrl}/api/v1/sharepoint/events`;

    let es: EventSource;
    let retryTimeout: ReturnType<typeof setTimeout>;

    async function connect() {
      let token: string;
      try {
        const data = await sharePointApi.getSSEToken();
        token = data.token;
      } catch {
        retryTimeout = setTimeout(connect, 5_000);
        return;
      }

      es = new EventSource(
        `${baseUrl}?token=${encodeURIComponent(token)}`,
        { withCredentials: true },
      );

      es.onmessage = (e: MessageEvent<string>) => {
        try {
          const data: FileStatusEvent = JSON.parse(e.data);
          onUpdateRef.current(data);
        } catch {
          // Malformed frame — ignore
        }
      };

      es.onerror = () => {
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
