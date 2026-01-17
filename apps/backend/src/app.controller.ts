import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';
import {
  ChatRequestDto,
  ChatCompletionsRequestDto,
} from './dto/chat-request.dto';
import {
  ChatResponseDto,
  ChatCompletionsResponseDto,
} from './dto/chat-response.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

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
  @UseGuards(AuthGuard('jwt'))
  async chatCompletions(
    @Request() req,
    @Body() chatRequest: ChatCompletionsRequestDto,
  ): Promise<ChatCompletionsResponseDto> {
    const aiResponse = await this.appService
      .chatWithAiEngine(chatRequest, req.user.userId)
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
  @UseGuards(AuthGuard('jwt'))
  async chat(
    @Request() req,
    @Body() chatRequest: ChatRequestDto
  ): Promise<ChatResponseDto> {
    const aiResponse = await this.appService
      .chatWithAi(chatRequest, req.user.userId)
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
