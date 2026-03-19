import type { Citation, FileRef } from '@/types/api';

export interface FileCounts {
  citedCount: number;
  attachedCount: number;
}

/**
 * Builds a Map<filePath, FileCounts> from citation and attachment lists.
 * Extracted from the duplicated `fileCountMap` useMemo in the explorer variants.
 */
export function buildFileCountMap(
  citations: Citation[],
  attachments: FileRef[],
): Map<string, FileCounts> {
  const out = new Map<string, FileCounts>();
  for (const c of citations) {
    const cur = out.get(c.id) ?? { citedCount: 0, attachedCount: 0 };
    out.set(c.id, { ...cur, citedCount: c.chunks?.length ?? 0 });
  }
  for (const a of attachments) {
    const cur = out.get(a.file_path) ?? { citedCount: 0, attachedCount: 0 };
    out.set(a.file_path, { ...cur, attachedCount: a.chunks.length });
  }
  return out;
}
