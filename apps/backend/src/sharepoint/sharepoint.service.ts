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
  private readonly statusEvents$ = new ReplaySubject<StatusEvent>(50, 60_000);
  private readonly sseTokens = new Map<string, number>();
  private readonly sseTokenCleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.webhookUrl = this.configService.get<string>('sharepoint.webhookServiceUrl') || 'http://127.0.0.1:8000';
    this.fileStorageUrl = this.configService.get<string>('sharepoint.fileStorageUrl') || 'http://127.0.0.1:8007';
    this.sseTokenCleanupInterval = setInterval(() => this.purgeExpiredTokens(), 60_000);
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
