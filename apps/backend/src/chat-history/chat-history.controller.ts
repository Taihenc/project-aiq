import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  Query,
  Logger,
} from '@nestjs/common';
import { ChatHistoryService } from './chat-history.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateSessionDto, AddMessageDto } from './dto/chat-history.dto';

@ApiTags('history')
@ApiBearerAuth()
@Controller()
export class ChatHistoryController {
  private readonly logger = new Logger(ChatHistoryController.name);

  constructor(private readonly historyService: ChatHistoryService) { }

  @Get()
  @ApiOperation({
    summary: 'Get chat history',
    description: 'Returns all chat sessions for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of sessions.' })
  async getHistory(@Request() req) {
    this.logger.debug(`GET /history hit for user: ${req.user.userId}`);
    return this.historyService.getHistory(req.user.userId);
  }

  @Get(':id/context')
  @ApiOperation({
    summary: 'Get session context',
    description: 'Returns recent messages for a session with token limiting.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'tokenLimit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent messages.' })
  async getContext(
    @Request() req,
    @Param('id') id: string,
    @Query('limit') limit: number,
    @Query('tokenLimit') tokenLimit: number,
  ) {
    const limitNum = limit ? parseInt(limit.toString()) : 20;
    const tokenLimitNum = tokenLimit
      ? parseInt(tokenLimit.toString())
      : undefined;
    return this.historyService.getRecentMessages(id, limitNum, tokenLimitNum);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get session details',
    description: 'Returns a single session and its messages.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session data.' })
  async getSession(@Request() req, @Param('id') id: string) {
    this.logger.debug(`GET /history/${id} hit for user: ${req.user.userId}`);
    return this.historyService.getSession(id, req.user.userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create session',
    description: 'Creates a new chat session.',
  })
  @ApiResponse({ status: 201, description: 'The created session.' })
  async createSession(
    @Request() req,
    @Body() createSessionDto: CreateSessionDto,
  ) {
    this.logger.debug(
      `POST /history hit for user: ${req.user.userId}, title: ${createSessionDto.title}`,
    );
    return this.historyService.createSession(
      req.user.userId,
      createSessionDto.title,
    );
  }

  @Post(':id/message')
  @ApiOperation({
    summary: 'Add message',
    description: 'Adds a message to a session.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 201, description: 'The added message.' })
  async addMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() addMessageDto: AddMessageDto,
  ) {
    this.logger.debug(
      `POST /history/${id}/message hit for user: ${req.user.userId}, role: ${addMessageDto.role}`,
    );
    return this.historyService.addMessage(
      id,
      req.user.userId,
      addMessageDto.role,
      addMessageDto.content,
      addMessageDto.citations,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete session',
    description: 'Deletes a chat session.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Deletion status.' })
  async deleteSession(@Request() req, @Param('id') id: string) {
    this.logger.debug(`DELETE /history/${id} hit for user: ${req.user.userId}`);
    return this.historyService.deleteSession(id, req.user.userId);
  }
}
