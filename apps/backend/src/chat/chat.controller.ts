import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
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

@ApiTags('chat')
@ApiBearerAuth()
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // OpenAI-compatible endpoint
  @ApiOperation({
    summary: 'OpenAI-compatible chat completions',
    description:
      'Supports standard OpenAI request/response format for easy integration.',
  })
  @ApiResponse({ status: 200, type: ChatCompletionsResponseDto })
  @Post('completions')
  @UseGuards(AuthGuard('jwt'))
  async chatCompletions(
    @Request() req,
    @Body() chatRequest: ChatCompletionsRequestDto,
  ): Promise<ChatCompletionsResponseDto> {
    const aiResponse = await this.chatService.chatWithAiEngine(
      chatRequest,
      req.user.userId,
    );

    if (!aiResponse) {
      throw new HttpException(
        'No response from AI service',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return aiResponse;
  }

  // Legacy endpoint for backward compatibility
  @ApiOperation({
    summary: 'Legacy chat endpoint',
    description: 'Maintained for backward compatibility with older components.',
  })
  @ApiResponse({ status: 200, type: ChatResponseDto })
  @Post()
  @UseGuards(AuthGuard('jwt'))
  async chat(
    @Request() req,
    @Body() chatRequest: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const aiResponse = await this.chatService.chatWithAi(
      chatRequest,
      req.user.userId,
    );

    if (!aiResponse) {
      throw new HttpException(
        'No response from AI service',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return aiResponse;
  }
}
