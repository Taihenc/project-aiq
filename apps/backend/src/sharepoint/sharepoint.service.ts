import { Injectable, HttpException, HttpStatus, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, ReplaySubject, Observable, map } from 'rxjs';
import { randomUUID } from 'crypto';
import { AxiosResponse } from 'axios';

export interface StatusEvent {
  file_id: string;
  source_id: string;
  status: string;
  file_name?: string;
}

type IndexedDocument = {
  file_path?: string;
  file_id?: string;
  source_id?: string;
  metadata?: {
    file_path?: string;
    file_id?: string;
    source_id?: string;
    file?: string;
  };
};

@Injectable()
export class SharePointService implements OnModuleDestroy {
  private readonly webhookUrl: string;
  private readonly fileStorageUrl: string;
  private readonly embeddingServiceUrl: string;
  private readonly statusEvents$ = new ReplaySubject<StatusEvent>(50, 60_000);
  private readonly sseTokens = new Map<string, number>();
  private readonly sseTokenCleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.webhookUrl = this.configService.get<string>('sharepoint.webhookServiceUrl') || 'http://127.0.0.1:8000';
    this.fileStorageUrl = this.configService.get<string>('sharepoint.fileStorageUrl') || 'http://127.0.0.1:8007';    this.embeddingServiceUrl = this.configService.get<string>('aiService.embeddingServiceUrl') || 'http://127.0.0.1:8003';    this.sseTokenCleanupInterval = setInterval(() => this.purgeExpiredTokens(), 60_000);
  }

  onModuleDestroy(): void {
    clearInterval(this.sseTokenCleanupInterval);
  }

  private purgeExpiredTokens(): void {
    const now = Date.now();
    for (const [token, expiresAt] of this.sseTokens) {
      if (now >= expiresAt) this.sseTokens.delete(token);
    }
  }

  async listFiles(path?: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.webhookUrl}/files`, {
          params: { path },
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to list SharePoint files');
    }
  }

  async uploadFile(file: any, path?: string): Promise<any> {
    try {
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('file', blob, file.originalname);

      const response = await firstValueFrom(
        this.httpService.post(`${this.webhookUrl}/upload`, formData, {
          params: { path },
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to upload file to SharePoint');
    }
  }

  async getFileStatus(sourceId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.fileStorageUrl}/files/source/${sourceId}`),
      ).catch(err => {
        if (err.response?.status === 404) {
          return { data: { status: 'NOT_UPLOADED' } };
        }
        throw err;
      });
      return response.data;
    } catch (error: any) {
      // If it's the catch from above that re-threw or a different error
      if (error.status === 'NOT_UPLOADED' || error.data?.status === 'NOT_UPLOADED') {
        return error;
      }
      this.handleError(error, 'Failed to get file status');
    }
  }

  async triggerIngest(sourceId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.webhookUrl}/ingest/${sourceId}`, {}),
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to trigger ingestion');
    }
  }

  async deleteFile(sourceId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`${this.fileStorageUrl}/files/source/${sourceId}`),
      );
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Failed to delete file');
    }
  }

  private getDocumentFilePath(doc: IndexedDocument): string {
    return doc.file_path ?? doc.metadata?.file_path ?? '';
  }

  private getDocumentFileId(doc: IndexedDocument): string | undefined {
    return doc.file_id ?? doc.metadata?.file_id;
  }

  private getDocumentSourceId(doc: IndexedDocument): string | undefined {
    return doc.source_id ?? doc.metadata?.source_id;
  }

  private matchesDocumentIdentifier(
    doc: IndexedDocument,
    identifier: string,
  ): boolean {
    const filePath = this.getDocumentFilePath(doc);
    const fileId = this.getDocumentFileId(doc);
    const sourceId = this.getDocumentSourceId(doc);
    return (
      filePath === identifier ||
      fileId === identifier ||
      sourceId === identifier
    );
  }

  private async resolveDocumentIdentity(identifier: string): Promise<{
    filePath?: string;
    fileId?: string;
    sourceId?: string;
  }> {
    const docs = await this.fetchAllDocuments();
    const match = docs.find((doc) =>
      this.matchesDocumentIdentifier(doc as IndexedDocument, identifier),
    ) as IndexedDocument | undefined;

    if (!match) {
      return {};
    }

    return {
      filePath: this.getDocumentFilePath(match) || undefined,
      fileId: this.getDocumentFileId(match),
      sourceId: this.getDocumentSourceId(match),
    };
  }

  /** Returns a deduplicated list of every file that has been indexed in the embedding service. */
  async getIndexedFiles(): Promise<{
    file_path: string;
    file_id?: string;
    name: string;
    ext: string;
  }[]> {
    try {
      const docs = await this.fetchAllDocuments();

      const seen = new Set<string>();
      const files: {
        file_path: string;
        file_id?: string;
        name: string;
        ext: string;
      }[] = [];
      for (const doc of docs) {
        const indexedDoc = doc as IndexedDocument;
        const filePath = this.getDocumentFilePath(indexedDoc);
        const fileId = this.getDocumentFileId(indexedDoc);
        const dedupeKey = fileId ?? filePath;
        if (!filePath || !dedupeKey || seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        const name: string = indexedDoc.metadata?.file ?? filePath.split('/').pop() ?? filePath;
        const ext: string = name.split('.').pop()?.toLowerCase() ?? '';
        files.push({ file_path: filePath, ...(fileId ? { file_id: fileId } : {}), name, ext });
      }
      return files;
    } catch (error) {
      this.handleError(error, 'Failed to list indexed files');
      return [];
    }
  }

  /**
   * Paginate through GET /v1/documents (max 1000 per page) and return all records.
   * @private
   */
  private async fetchAllDocuments(): Promise<any[]> {
    const PAGE = 1000;
    const all: any[] = [];
    let offset = 0;
    while (true) {
      const response = await firstValueFrom(
        this.httpService.get(`${this.embeddingServiceUrl}/v1/documents`, {
          params: { limit: PAGE, offset },
        }),
      );
      const page: any[] = Array.isArray(response.data)
        ? response.data
        : (response.data?.documents ?? response.data?.items ?? []);
      all.push(...page);
      if (page.length < PAGE) break; // last page
      offset += PAGE;
    }
    return all;
  }

  /**
   * Fetch all chunks for a given file identifier from the embedding service.
   * Accepts file_path, file_id, or source_id.
   */
  async getFileChunks(identifier: string): Promise<any[]> {
    try {
      const docs = await this.fetchAllDocuments();
      return docs.filter((doc) =>
        this.matchesDocumentIdentifier(doc as IndexedDocument, identifier),
      );
    } catch (error) {
      this.handleError(error, 'Failed to fetch file chunks');
      return [];
    }
  }

  /** Proxy the file bytes with the correct MIME type — used by GET stream/:sourceId. */
  async streamFile(sourceId: string): Promise<{ data: import('stream').Readable; mimeType: string; fileName: string }> {
    const { url, file_name } = await this.getFileDownloadUrl(sourceId);
    const response = await firstValueFrom(
      this.httpService.get<import('stream').Readable>(url, { responseType: 'stream' }),
    );
    const ext = file_name.split('.').pop()?.toLowerCase() ?? '';
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return {
      data: response.data,
      mimeType: mimeMap[ext] ?? 'application/octet-stream',
      fileName: file_name,
    };
  }

  /**
   * Get a presigned download URL for a file.
   * Accepts file_id, source_id, or file_path.
   */
  async getFileDownloadUrl(identifier: string): Promise<{ url: string; file_name: string }> {
    try {
      // Step 1: direct file_id lookup.
      const directDownload = await firstValueFrom(
        this.httpService.get(`${this.fileStorageUrl}/files/${identifier}/download`),
      ).catch((err) => {
        if (err.response?.status === 404) return { data: null };
        throw err;
      });

      if (directDownload.data?.download_url) {
        return {
          url: directDownload.data.download_url as string,
          file_name: directDownload.data.file_name as string,
        };
      }

      const { filePath, sourceId } = await this.resolveDocumentIdentity(identifier);

      // Step 2: try resolved source_id.
      let fileId: string | undefined;
      if (sourceId) {
        const statusRes = await firstValueFrom(
          this.httpService.get(`${this.fileStorageUrl}/files/source/${sourceId}`),
        ).catch((err) => {
          if (err.response?.status === 404) return { data: null };
          throw err;
        });
        fileId = statusRes.data?.file_id;
      }

      // Step 3: fall back to lookup by basename (handles temp-path file_paths)
      if (!fileId) {
        const basename = (filePath ?? identifier).split('/').filter(Boolean).pop() ?? identifier;
        const nameRes = await firstValueFrom(
          this.httpService.get(`${this.fileStorageUrl}/files/by-name/${encodeURIComponent(basename)}`),
        ).catch((err) => {
          if (err.response?.status === 404) return { data: null };
          throw err;
        });
        fileId = nameRes.data?.file_id;
      }

      if (!fileId) {
        throw new HttpException('File not found in storage', HttpStatus.NOT_FOUND);
      }

      // Step 4: get presigned download URL
      const dlRes = await firstValueFrom(
        this.httpService.get(`${this.fileStorageUrl}/files/${fileId}/download`),
      );
      return {
        url: dlRes.data.download_url as string,
        file_name: dlRes.data.file_name as string,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.handleError(error, 'Failed to get file download URL');
      throw error; // handleError always throws; this satisfies the TS return-type check
    }
  }

  /** Returns indexed chunk count for a file. */
  async getFileChunkCount(filePath: string): Promise<{ chunk_count: number; indexed: boolean }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.embeddingServiceUrl}/v1/file-status`, {
          params: { file_name: filePath },
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to fetch file status');
      return { chunk_count: 0, indexed: false };
    }
  }

  // ── SSE / Webhook ───────────────────────────────────────────────

  /**
   * Return distinct metadata values for all filterable dimensions from the embedding service.
   * Proxies GET {embeddingServiceUrl}/v1/filter-options.
   */
  async getFilterOptions(): Promise<{
    department: string[];
    team: string[];
    project: string[];
    tags: string[];
    file_type: string[];
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.embeddingServiceUrl}/v1/filter-options`),
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to fetch filter options');
      return { department: [], team: [], project: [], tags: [], file_type: [] };
    }
  }

  /** Returns an Observable that emits SSE MessageEvent frames. */
  getStatusStream(): Observable<MessageEvent> {
    return this.statusEvents$.asObservable().pipe(
      map((payload) => ({ data: payload }) as unknown as MessageEvent),
    );
  }

  /** Called by the webhook receiver endpoint when FSS pushes a status update. */
  handleStatusWebhook(payload: StatusEvent): void {
    this.statusEvents$.next(payload);
  }

  /** Issue a one-time token valid for one SSE connection for 60 seconds. */
  issueSSEToken(): string {
    const token = randomUUID();
    this.sseTokens.set(token, Date.now() + 60_000);
    return token;
  }

  /** Validate and consume a single-use SSE token. Returns false if expired/unknown. */
  validateSSEToken(token: string): boolean {
    const expiresAt = this.sseTokens.get(token);
    if (expiresAt === undefined) return false;
    this.sseTokens.delete(token);
    return Date.now() < expiresAt;
  }

  private handleError(error: any, defaultMessage: string) {
    const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error.response?.data?.error || defaultMessage;
    throw new HttpException(message, status);
  }
}
