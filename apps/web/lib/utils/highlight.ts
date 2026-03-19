export type Segment = { text: string; match: boolean };

/**
 * Splits `text` into plain/matched segments for rendering highlighted
 * search results. Zero dependencies — works in any JS/TS runtime.
 */
export function highlightSegments(text: string, query: string): Segment[] {
  if (!query) return [{ text, match: false }];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const qLower = query.toLowerCase();
  return parts
    .filter((p) => p !== '')
    .map((part) => ({ text: part, match: part.toLowerCase() === qLower }));
}
