export type ChunkState = 'cited-attached' | 'cited' | 'attached' | 'none';

/**
 * Pure classifier: maps a chunk number + two Set<number> lookups to a
 * 4-state discriminant used for styling and tooltip logic.
 */
export function cellState(
  chunkNumber: number,
  cited: Set<number>,
  attached: Set<number>,
): ChunkState {
  const isCited = cited.has(chunkNumber);
  const isAttached = attached.has(chunkNumber);
  if (isCited && isAttached) return 'cited-attached';
  if (isCited) return 'cited';
  if (isAttached) return 'attached';
  return 'none';
}
