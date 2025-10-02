import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  getHello(): string {
    return 'Hello World!';
  }

  chatWithAi(message: string): Observable<string> {
    const aiServiceUrl =
      process.env.AI_SERVICE_URL ??
      (process.env.NODE_ENV === 'production'
        ? 'http://ai:8000/chat'
        : 'http://127.0.0.1:8000/chat');
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
