import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ChatRequestDto, ChatCompletionsRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto, ChatCompletionsResponseDto } from './dto/chat-response.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('config')
  getConfig(): any {
    return {
      aiServiceBaseUrl: this.appService.getAiServiceBaseUrl(),
    };
  }

  // OpenAI-compatible endpoint
  @Post('v1/chat/completions')
  async chatCompletions(@Body() chatRequest: ChatCompletionsRequestDto): Promise<ChatCompletionsResponseDto> {
    const aiResponse = await this.appService
      .chatWithAiEngine(chatRequest)
      .toPromise();

    if (!aiResponse) {
      throw new HttpException(
        'No response from AI service',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return aiResponse;
  }

  // Legacy endpoint for backward compatibility
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
