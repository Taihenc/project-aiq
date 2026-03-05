/**
 * Trims `content` to a window of `maxLen` characters centred around
 * the first occurrence of `query`, adding ellipsis where truncated.
 * Falls back to a simple head-truncation if the query is not found.
 */
export function extractExcerpt(
  content: string,
  query: string,
  maxLen = 260,
  ctxBefore = 80,
  ctxAfter = 180,
): string {
  if (content.length <= maxLen) return content;
  const qLower = query.toLowerCase();
  const idx = content.toLowerCase().indexOf(qLower);
  if (idx === -1) return content.slice(0, maxLen) + '\u2026';
  const start = Math.max(0, idx - ctxBefore);
  const end = Math.min(content.length, idx + qLower.length + ctxAfter);
  return (
    (start > 0 ? '\u2026' : '') +
    content.slice(start, end) +
    (end < content.length ? '\u2026' : '')
  );
}
