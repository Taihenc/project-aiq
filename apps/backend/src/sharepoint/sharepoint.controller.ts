import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SharePointService } from './sharepoint.service';

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
}
