import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  chatWithAi(chatRequest: ChatRequestDto): Observable<ChatResponseDto> {
    const aiServiceBaseUrl =
      this.configService.get<string>('aiService.baseUrl');
    const aiServiceUrl = `${aiServiceBaseUrl}/chat`;
    return this.httpService
      .post<ChatResponseDto>(aiServiceUrl, chatRequest)
      .pipe(
        map(
          (axiosResponse: AxiosResponse<ChatResponseDto>) => axiosResponse.data,
        ),
      );
  }
}
