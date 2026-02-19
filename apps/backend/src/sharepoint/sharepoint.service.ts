import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class SharePointService {
  private readonly webhookUrl: string;
  private readonly fileStorageUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.webhookUrl = this.configService.get<string>('sharepoint.webhookServiceUrl') || 'http://127.0.0.1:8000';
    this.fileStorageUrl = this.configService.get<string>('sharepoint.fileStorageUrl') || 'http://127.0.0.1:8007';
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

  private handleError(error: any, defaultMessage: string) {
    const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error.response?.data?.error || defaultMessage;
    throw new HttpException(message, status);
  }
}
