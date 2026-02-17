import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

  getAiServiceBaseUrl(): string {
    return (
      this.configService.get<string>('aiService.baseUrl') ||
      'http://127.0.0.1:8000'
    );
  }

  getAiEngineBaseUrl(): string {
    return (
      this.configService.get<string>('aiService.aiEngineBaseUrl') ||
      'http://127.0.0.1:8001'
    );
  }

  getDefaultCrew(): string {
    return (
      this.configService.get<string>('aiService.defaultCrew') ||
      'aiq_search_crew'
    );
  }
}
