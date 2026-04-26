import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Request,
  Sse,
  MessageEvent,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  ChatRequestDto,
  ChatCompletionsRequestDto,
} from './dto/chat-request.dto';
import {
  ChatResponseDto,
  ChatCompletionsResponseDto,
} from './dto/chat-response.dto';
import { Observable } from 'rxjs';

@ApiTags('chat')
@ApiBearerAuth()
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  // OpenAI-compatible endpoint
  @ApiOperation({
    summary: 'OpenAI-compatible chat completions',
    description:
      'Supports standard OpenAI request/response format for easy integration.',
  })
  @ApiResponse({ status: 200, type: ChatCompletionsResponseDto })
  @Post('completions')
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

  @ApiOperation({
    summary: 'OpenAI-compatible chat completions with streaming',
    description:
      'Provides real-time status updates and incremental results via SSE.',
  })
  @Post('completions/stream')
  async chatCompletionsStream(
    @Request() req,
    @Body() chatRequest: ChatCompletionsRequestDto,
    @Res() res: any,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const observable = await this.chatService.chatWithAiEngineStream(
      chatRequest,
      req.user.userId,
    );

    const subscription = observable.subscribe({
      next: (event) => {
        res.write(`data: ${event.data}\n\n`);
      },
      error: (err) => {
        res.end();
      },
      complete: () => {
        res.end();
      },
    });

    req.on('close', () => {
      subscription.unsubscribe();
    });
  }

  // Legacy endpoint for backward compatibility
  @ApiOperation({
    summary: 'Legacy chat endpoint',
    description: 'Maintained for backward compatibility with older components.',
  })
  @ApiResponse({ status: 200, type: ChatResponseDto })
  @Post()
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
