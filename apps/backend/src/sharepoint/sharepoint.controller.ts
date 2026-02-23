import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Param,
  Body,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { SharePointService, StatusEvent } from './sharepoint.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class SharePointController {
  constructor(private readonly sharePointService: SharePointService) { }

  @Get('files')
  async listFiles(@Query('path') path?: string) {
    return this.sharePointService.listFiles(path);
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

  @Post('ingest/:sourceId')
  async triggerIngest(@Param('sourceId') sourceId: string) {
    return this.sharePointService.triggerIngest(sourceId);
  }

  @Delete(':sourceId')
  async deleteFile(@Param('sourceId') sourceId: string) {
    return this.sharePointService.deleteFile(sourceId);
  }

  // ── Real-time status feed ──────────────────────────────────────

  /** SSE stream — frontend clients subscribe here for live status events. */
  @Public()
  @Sse('events')
  streamEvents(): Observable<MessageEvent> {
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
