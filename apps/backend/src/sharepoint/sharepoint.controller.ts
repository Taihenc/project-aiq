import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
  Param,
  Body,
  Sse,
  MessageEvent,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { SharePointService, StatusEvent } from './sharepoint.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class SharePointController {
  constructor(private readonly sharePointService: SharePointService) { }

  @Get('files')
  async listFiles(@Query('path') path?: string) {
    return this.sharePointService.listFiles(path);
  }

  /** Returns all unique files ingested into the embedding service. */
  @Get('indexed-files')
  async getIndexedFiles() {
    return this.sharePointService.getIndexedFiles();
  }

  /** Fetch all indexed chunks for a specific file_path from the embedding service. */
  @Get('file-chunks')
  async getFileChunks(@Query('file_path') filePath: string) {
    return this.sharePointService.getFileChunks(filePath);
  }

  /** Return indexed chunk count for a file. */
  @Get('file-chunk-count')
  async getFileChunkCount(@Query('file_path') filePath: string) {
    return this.sharePointService.getFileChunkCount(filePath);
  }

  /** Return distinct metadata values for all filter dimensions (department, team, project, tags, file_type). */
  @Get('filter-options')
  async getFilterOptions() {
    return this.sharePointService.getFilterOptions();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Query('path') path?: string,
  ) {
    return this.sharePointService.uploadFile(file, path);
  }

  @Get('status/:sourceId')
  async getFileStatus(@Param('sourceId') sourceId: string) {
    return this.sharePointService.getFileStatus(sourceId);
  }

  /** Return a short-lived presigned download URL for a file, resolved via source ID. */
  @Get('download/:sourceId')
  async getFileDownloadUrl(@Param('sourceId') sourceId: string) {
    return this.sharePointService.getFileDownloadUrl(sourceId);
  }

  /** Proxy-stream the actual file content with the correct MIME type. */
  @Get('stream/:sourceId')
  async streamFile(
    @Param('sourceId') sourceId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { data, mimeType, fileName } = await this.sharePointService.streamFile(sourceId);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    });
    return new StreamableFile(data);
  }

  @Post('ingest/:sourceId')
  async triggerIngest(@Param('sourceId') sourceId: string) {
    return this.sharePointService.triggerIngest(sourceId);
  }

  @Delete(':sourceId')
  async deleteFile(@Param('sourceId') sourceId: string) {
    return this.sharePointService.deleteFile(sourceId);
  }

  // ── Real-time status feed ──────────────────────────────────────

  /**
   * Issue a short-lived one-time token for SSE. Requires normal JWT auth.
   * The token is passed as a query param on the EventSource URL because
   * EventSource cannot send Authorization headers.
   */
  @Get('sse-token')
  getSSEToken() {
    return { token: this.sharePointService.issueSSEToken() };
  }

  /** SSE stream — frontend clients subscribe here for live status events. */
  @Public()
  @Sse('events')
  streamEvents(@Query('token') token: string): Observable<MessageEvent> {
    if (!this.sharePointService.validateSSEToken(token)) {
      throw new UnauthorizedException('Invalid or expired SSE token');
    }
    return this.sharePointService.getStatusStream();
  }

  /**
   * Webhook receiver called by FSS whenever a file status changes.
   * Lightly validate and forward to the SSE bus.
   * Marked public — caller is the internal FSS service, not a browser client.
   */
  @Public()
  @Post('webhook/status')
  receiveStatusWebhook(@Body() body: StatusEvent) {
    this.sharePointService.handleStatusWebhook(body);
    return { received: true };
  }
}
