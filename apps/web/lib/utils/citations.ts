import { UIMessage } from '@/types/chat';
import { Citation } from '@/lib/api/chat';

/**
 * Extracts all citations from messages
 */
export function extractCitations(messages: UIMessage[]): Citation[] {
  return messages
    .filter((m) => m.citations)
    .flatMap((m) => m.citations || []);
}

