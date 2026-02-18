import { UIMessage } from '@/types/chat';
import { Citation } from '@/lib/api/chat';

/**
 * Extracts all citations from messages
 */
export function extractCitations(messages: UIMessage[]): Citation[] {
  const allCitations = messages
    .filter((m) => m.citations)
    .flatMap((m) => m.citations || []);

  // Unique citations by ID
  const seenIds = new Set<string>();
  return allCitations.filter((citation) => {
    if (seenIds.has(citation.id)) return false;
    seenIds.add(citation.id);
    return true;
  });
}

