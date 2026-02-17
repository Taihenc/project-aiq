import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import {
  ChatRequestDto,
  ChatCompletionsRequestDto,
} from './dto/chat-request.dto';
import {
  ChatResponseDto,
  ChatCompletionsResponseDto,
} from './dto/chat-response.dto';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  // OpenAI-compatible endpoint
  @Post('v1/chat/completions')
  @UseGuards(AuthGuard('jwt'))
  async chatCompletions(
    @Request() req,
    @Body() chatRequest: ChatCompletionsRequestDto,
  ): Promise<ChatCompletionsResponseDto> {
    const aiResponse = await this.chatService
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
    const aiResponse = await this.chatService
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
