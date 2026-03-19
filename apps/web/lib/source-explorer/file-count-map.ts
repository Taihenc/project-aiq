import type { Citation, FileRef } from '@/types/api';
import { getAttachmentFileId, getCitationFileId } from '@/lib/utils/file-identity';

export interface FileCounts {
  citedCount: number;
  attachedCount: number;
}

/**
 * Builds a Map<fileId, FileCounts> from citation and attachment lists.
 * Extracted from the duplicated `fileCountMap` useMemo in the explorer variants.
 */
export function buildFileCountMap(
  citations: Citation[],
  attachments: FileRef[],
): Map<string, FileCounts> {
  const out = new Map<string, FileCounts>();
  for (const c of citations) {
    const fileId = getCitationFileId(c);
    const cur = out.get(fileId) ?? { citedCount: 0, attachedCount: 0 };
    out.set(fileId, { ...cur, citedCount: c.chunks?.length ?? 0 });
  }
  for (const a of attachments) {
    const fileId = getAttachmentFileId(a);
    const cur = out.get(fileId) ?? { citedCount: 0, attachedCount: 0 };
    out.set(fileId, { ...cur, attachedCount: a.chunks.length });
  }
  return out;
}
