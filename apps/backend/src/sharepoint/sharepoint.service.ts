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

  /** Returns a deduplicated list of every file that has been indexed in the embedding service. */
  async getIndexedFiles(): Promise<{ file_path: string; name: string; ext: string }[]> {
    try {
      const docs = await this.fetchAllDocuments();

      const seen = new Set<string>();
      const files: { file_path: string; name: string; ext: string }[] = [];
      for (const doc of docs) {
        const filePath: string = doc.file_path ?? doc.metadata?.file_path ?? '';
        if (!filePath || seen.has(filePath)) continue;
        seen.add(filePath);
        const name: string = doc.metadata?.file ?? filePath.split('/').pop() ?? filePath;
        const ext: string = name.split('.').pop()?.toLowerCase() ?? '';
        files.push({ file_path: filePath, name, ext });
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
   * Fetch all chunks for a given file_path from the embedding service.
   * Paginates through GET /v1/documents (max 1000 per page) and filters by file_path.
   */
  async getFileChunks(filePath: string): Promise<any[]> {
    try {
      const docs = await this.fetchAllDocuments();
      return docs.filter(
        (d) => d.file_path === filePath || d.metadata?.file_path === filePath,
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
   * Resolution order:
   *   1. Try FSS GET /files/source/{sourceId} (works for SharePoint files where source_id is set)
   *   2. Fall back to FSS GET /files/by-name/{basename} (works for directly-uploaded files
   *      where file_path from the embedding service is a temp path like /tmp/xxx/name.pdf)
   */
  async getFileDownloadUrl(sourceId: string): Promise<{ url: string; file_name: string }> {
    try {
      // Step 1: try resolved source_id
      let fileId: string | undefined;
      const statusRes = await firstValueFrom(
        this.httpService.get(`${this.fileStorageUrl}/files/source/${sourceId}`),
      ).catch((err) => {
        if (err.response?.status === 404) return { data: null };
        throw err;
      });
      fileId = statusRes.data?.file_id;

      // Step 2: fall back to lookup by basename (handles temp-path file_paths)
      if (!fileId) {
        const basename = sourceId.split('/').filter(Boolean).pop() ?? sourceId;
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

      // Step 3: get presigned download URL
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
