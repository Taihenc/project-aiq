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
import { DEFAULT_CONTEXT_LIMIT } from '../constants/chat.constants';
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
    description: 'Returns paginated chat sessions for the authenticated user.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Sessions per page (default: 20)' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'Pagination cursor (updatedAt of last session)' })
  @ApiResponse({ status: 200, description: 'Paginated list of sessions.' })
  async getHistory(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    this.logger.debug(`GET /history hit for user: ${req.user.userId}`);
    const limitNum = limit ? parseInt(limit) : undefined;
    return this.historyService.getHistory(req.user.userId, limitNum, cursor);
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
    const limitNum = limit ? parseInt(limit.toString()) : DEFAULT_CONTEXT_LIMIT;
    const tokenLimitNum = tokenLimit
      ? parseInt(tokenLimit.toString())
      : undefined;
    return this.historyService.getRecentMessages(id, limitNum, tokenLimitNum);
  }

  @Get(':id/tree')
  @ApiOperation({
    summary: 'Get message tree',
    description: 'Returns all messages for a session as a flat list with parentId/branchIndex for tree building, plus the default active path.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiQuery({ name: 'tip', required: false, type: String, description: 'Tip message ID to resolve a specific path from' })
  @ApiResponse({ status: 200, description: 'Message tree + active path.' })
  async getMessageTree(
    @Request() req,
    @Param('id') id: string,
    @Query('tip') tip?: string,
  ) {
    this.logger.debug(`GET /history/${id}/tree hit for user: ${req.user.userId}`);
    const messages = this.historyService.getMessageTree(id);
    const activePath = this.historyService.getActivePath(id, tip);
    return { messages, activePath };
  }

  @Get('check/:id')
  @ApiOperation({
    summary: 'Check session exists',
    description: 'Lightweight check whether a session exists for the authenticated user.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Existence check result.' })
  async checkSession(@Request() req, @Param('id') id: string) {
    return this.historyService.checkSession(id, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get session details',
    description: 'Returns a session and its paginated messages.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Messages per page (default: 30)' })
  @ApiQuery({ name: 'before', required: false, type: String, description: 'Pagination cursor (createdAt of oldest loaded message)' })
  @ApiResponse({ status: 200, description: 'Session data with paginated messages.' })
  async getSession(
    @Request() req,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    this.logger.debug(`GET /history/${id} hit for user: ${req.user.userId}`);
    const limitNum = limit ? parseInt(limit) : undefined;
    return this.historyService.getSession(id, req.user.userId, limitNum, before);
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
