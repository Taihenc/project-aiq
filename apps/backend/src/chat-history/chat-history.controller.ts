import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatHistoryService } from './chat-history.service';

@Controller('history')
@UseGuards(AuthGuard('jwt'))
export class ChatHistoryController {
  constructor(private readonly historyService: ChatHistoryService) { }

  @Get()
  async getHistory(@Request() req) {
    return this.historyService.getHistory(req.user.userId);
  }

  @Get(':id/context')
  async getContext(@Request() req, @Param('id') id: string, @Query('limit') limit: number, @Query('tokenLimit') tokenLimit: number) {
    const limitNum = limit ? parseInt(limit.toString()) : 20;
    const tokenLimitNum = tokenLimit ? parseInt(tokenLimit.toString()) : undefined;
    return this.historyService.getRecentMessages(id, limitNum, tokenLimitNum);
  }

  @Get(':id')
  async getSession(@Request() req, @Param('id') id: string) {
    return this.historyService.getSession(id, req.user.userId);
  }

  @Post()
  async createSession(@Request() req, @Body() body: { title?: string }) {
    return this.historyService.createSession(req.user.userId, body.title);
  }

  @Post(':id/message')
  async addMessage(@Request() req, @Param('id') id: string, @Body() body: { role: string; content: string; citations?: any }) {
    return this.historyService.addMessage(id, req.user.userId, body.role, body.content, body.citations);
  }

  @Delete(':id')
  async deleteSession(@Request() req, @Param('id') id: string) {
    return this.historyService.deleteSession(id, req.user.userId);
  }
}
