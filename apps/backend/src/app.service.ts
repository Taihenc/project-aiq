import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  chatWithAi(message: string): Observable<string> {
    const aiServiceBaseUrl =
      this.configService.get<string>('aiService.baseUrl');
    const aiServiceUrl = `${aiServiceBaseUrl}/chat`;
    return this.httpService
      .post(aiServiceUrl, { text: message })
      .pipe(
        map(
          (axiosResponse: AxiosResponse) =>
            axiosResponse.data.response || 'No response from AI service.',
        ),
      );
  }
}
