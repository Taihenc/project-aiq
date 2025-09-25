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
    const aiServiceUrl = 'http://localhost:8000/chat'; // Assuming AI service runs on port 8000
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
