import type { Citation, FileRef, SourceFile } from '@/types/api';

export function decodeForDisplay(value: string | undefined): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function basename(value: string | undefined): string {
  if (!value) return '';
  const normalized = value.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

export function getCitationFileId(citation: Pick<Citation, 'id' | 'file_id'>): string {
  return citation.file_id ?? citation.id;
}

export function getSourceFileId(file: Pick<SourceFile, 'file_path' | 'file_id'>): string {
  return file.file_id ?? file.file_path;
}

export function getAttachmentFileId(fileRef: Pick<FileRef, 'file_path' | 'file_id'>): string {
  return fileRef.file_id ?? fileRef.file_path ?? '';
}

export function getCitationDisplayName(citation: Pick<Citation, 'title' | 'id' | 'file_id'>): string {
  return (
    decodeForDisplay(citation.title) ||
    decodeForDisplay(basename(citation.id)) ||
    decodeForDisplay(citation.file_id) ||
    decodeForDisplay(citation.id)
  );
}

export function getSourceFileDisplayName(file: Pick<SourceFile, 'name' | 'file_path' | 'file_id'>): string {
  return (
    decodeForDisplay(file.name) ||
    decodeForDisplay(basename(file.file_path)) ||
    decodeForDisplay(file.file_id) ||
    decodeForDisplay(file.file_path)
  );
}

export function getAttachmentDisplayName(fileRef: Pick<FileRef, 'file_path'>): string {
  return decodeForDisplay(basename(fileRef.file_path)) || decodeForDisplay(fileRef.file_path);
}

export function hasFileIdentifier(
  identifiers: string[],
  ...candidates: Array<string | undefined>
): boolean {
  return candidates.some((candidate) => !!candidate && identifiers.includes(candidate));
}

export function getPathDisplayName(path: string | undefined): string {
  return decodeForDisplay(basename(path)) || decodeForDisplay(path);
}

export function getFileExtensionFromName(name: string | undefined, fallback: string | undefined = undefined): string | undefined {
  const source = name || fallback;
  if (!source) return undefined;
  const target = basename(source);
  const ext = target.split('.').pop()?.toLowerCase();
  return ext && ext !== target.toLowerCase() ? ext : undefined;
}

export function createAttachmentFileRef(params: {
  fileId: string;
  filePath: string;
  chunks: FileRef['chunks'];
  content?: string;
}): FileRef {
  return {
    file_id: params.fileId,
    file_path: params.filePath,
    chunks: params.chunks,
    ...(params.content ? { content: params.content } : {}),
  };
}
