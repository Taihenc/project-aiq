import { client } from './client';
import type { ChunkMetadata, FilterOptions, SourceFile } from '@/types/api';

export const sharePointApi = {
  listFiles: async (path?: string) => {
    const response = await client.get('/sharepoint/files', {
      params: { path },
    });
    return response.data;
  },

  /** Returns all unique files that have been indexed in the embedding service. */
  getIndexedFiles: async (): Promise<SourceFile[]> => {
    const response = await client.get('/sharepoint/indexed-files');
    return response.data as SourceFile[];
  },
  uploadFile: async (file: File, path?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post('/sharepoint/upload', formData, {
      params: { path },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getFileStatus: async (sourceId: string) => {
    const response = await client.get(`/sharepoint/status/${sourceId}`);
    return response.data;
  },
  ingestFile: async (sourceId: string) => {
    const response = await client.post(`/sharepoint/ingest/${sourceId}`);
    return response.data;
  },
  deleteFile: async (sourceId: string) => {
    const response = await client.delete(`/sharepoint/${sourceId}`);
    return response.data;
  },
  /** Fetch a short-lived SSE token from the authenticated NestJS endpoint. */
  getSSEToken: async () => {
    const response = await client.get('/sharepoint/sse-token');
    return response.data as { token: string };
  },

  /**
   * Fetch all indexed chunks for a specific file from the embedding service
   * (proxied through NestJS).
   */
  getFileChunks: async (filePath: string): Promise<ChunkMetadata[]> => {
    const response = await client.get('/sharepoint/file-chunks', {
      params: { file_path: filePath },
    });
    const raw: Record<string, unknown>[] = Array.isArray(response.data) ? (response.data as Record<string, unknown>[]) : [];
    // Normalise embedding-service document records → ChunkMetadata
    // Actual shape: { id, text, metadata: { order, file, file_path, pages: number[], … } }
    return raw.map((doc, i) => {
      const meta = (doc.metadata ?? {}) as Record<string, unknown>;
      const pages = Array.isArray(meta.pages) ? (meta.pages as number[]) : [];
      return {
        chunk_number: (meta.order as number) ?? (doc.chunk_number as number) ?? i,
        page_number: pages[0] ?? (meta.page_number as number) ?? 0,
        score: doc.score as number | undefined,
        content: (doc.text ?? doc.content ?? meta.content) as string | undefined,
      };
    });
  },

  /** Return indexed chunk count for a file. */
  getFileChunkCount: async (
    filePath: string,
  ): Promise<{ chunk_count: number; indexed: boolean }> => {
    const response = await client.get('/sharepoint/file-chunk-count', {
      params: { file_path: filePath },
    });
    return response.data;
  },

  /**
   * Get a short-lived presigned download URL for a file.
   * `sourceId` is the file_path from SourceFile (matches the FSS source ID).
   */
  getFileDownloadUrl: async (
    sourceId: string,
  ): Promise<{ url: string; file_name: string }> => {
    const response = await client.get(`/sharepoint/download/${encodeURIComponent(sourceId)}`);
    return response.data as { url: string; file_name: string };
  },

  /**
   * Fetch the file as a Blob via the NestJS proxy stream endpoint.
   * Uses the authenticated axios client so Bearer auth headers are sent.
   */
  getFileBlob: async (sourceId: string): Promise<Blob> => {
    const response = await client.get(
      `/sharepoint/stream/${encodeURIComponent(sourceId)}`,
      { responseType: 'blob' },
    );
    return response.data as Blob;
  },

  /**
   * Return distinct metadata values for all filter dimensions.
   * Backed by GET /api/v1/sharepoint/filter-options → embedding service /v1/filter-options.
   */
  getFilterOptions: async (): Promise<FilterOptions> => {
    const response = await client.get('/sharepoint/filter-options');
    return response.data as FilterOptions;
  },
};
