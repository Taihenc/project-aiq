import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('chat')
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    const aiResponse = await this.appService
      .chatWithAi(chatRequest)
      .toPromise();

    if (!aiResponse) {
      throw new HttpException(
        'No response from AI service',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return aiResponse;
  }
}
