import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DRIZZLE } from '../database/drizzle.module';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { chatSessions, chatMessages, users } from '../database/schema';
import { eq, desc, and, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { encode } from 'gpt-tokenizer';
import {
  DEFAULT_HISTORY_PAGE_LIMIT,
  DEFAULT_MESSAGES_PAGE_LIMIT,
  DEFAULT_SESSION_TITLE,
} from '../constants/chat.constants';

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name);

  constructor(@Inject(DRIZZLE) private db: BetterSQLite3Database) {}

  async getHistory(userId: string, limit: number = DEFAULT_HISTORY_PAGE_LIMIT, cursor?: string) {
    this.logger.debug(
      `Fetching history for user: ${userId}, limit: ${limit}, cursor: ${cursor}`,
    );

    const conditions = [eq(chatSessions.userId, userId || '')];
    if (cursor) {
      conditions.push(lt(chatSessions.updatedAt, parseInt(cursor)));
    }

    const results = this.db
      .select()
      .from(chatSessions)
      .where(and(...conditions))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit + 1)
      .all();

    const hasMore = results.length > limit;
    const sessions = hasMore ? results.slice(0, limit) : results;
    const nextCursor =
      hasMore && sessions.length > 0
        ? String(sessions[sessions.length - 1].updatedAt)
        : null;

    return { sessions, nextCursor };
  }

  async getSession(
    sessionId: string,
    userId: string,
    limit: number = DEFAULT_MESSAGES_PAGE_LIMIT,
    before?: string,
  ) {
    this.logger.debug(
      `Fetching session: ${sessionId} for user: ${userId}, limit: ${limit}, before: ${before}`,
    );
    const session = this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId || ''),
          eq(chatSessions.userId, userId || ''),
        ),
      )
      .get();

    if (!session) {
      this.logger.warn(`Session not found: ${sessionId}`);
      throw new NotFoundException('Session not found');
    }

    const messageConditions = [eq(chatMessages.sessionId, sessionId)];
    if (before) {
      messageConditions.push(lt(chatMessages.createdAt, parseInt(before)));
    }

    const results = this.db
      .select()
      .from(chatMessages)
      .where(and(...messageConditions))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit + 1)
      .all();

    const hasMore = results.length > limit;
    const messagesDesc = hasMore ? results.slice(0, limit) : results;
    const messages = messagesDesc.reverse();
    const nextCursor =
      hasMore && messages.length > 0
        ? String(messages[0].createdAt)
        : null;

    return { session, messages, nextCursor, hasMore };
  }

  async createSession(userId: string, title: string = DEFAULT_SESSION_TITLE) {
    const id = uuidv4();
    this.logger.log(`Creating new session: ${id} for user: ${userId}`);
    this.db
      .insert(chatSessions)
      .values({
        id,
        title,
        userId,
        createdAt: Date.now(),
      })
      .run();
    return this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, id))
      .get();
  }

  async addMessage(
    sessionId: string,
    userId: string,
    role: string,
    content: any,
    citations?: any,
    sentAttachments?: any,
  ) {
    this.logger.debug(
      `Adding message to session ${sessionId}. Role: ${role}, User: ${userId}`,
    );

    // Defensive check to ensure content is a string
    const stringContent =
      typeof content === 'string' ? content : JSON.stringify(content || '');

    this.logger.verbose(
      `Message content type: ${typeof content}, length: ${stringContent.length}`,
    );

    if (!sessionId || !userId) {
      this.logger.error(
        `Invalid parameters for addMessage: sessionId=${sessionId}, userId=${userId}`,
      );
      throw new Error('sessionId and userId are required');
    }

    // Verify ownership first
    let session;
    try {
      session = this.db
        .select()
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.id, sessionId || ''),
            eq(chatSessions.userId, userId || ''),
          ),
        )
        .get();
    } catch (err: any) {
      this.logger.error(`Ownership verification query failed: ${err.message}`, {
        sessionId,
        userId,
      });
      throw err;
    }

    if (!session) {
      this.logger.error(
        `Failed to add message: Session ${sessionId} not found or ownership failed for user ${userId}`,
      );
      throw new NotFoundException(
        'Session not found or search ownership failed',
      );
    }

    const id = uuidv4();
    this.logger.verbose(`Inserting message ${id} into session ${sessionId}`);
    try {
      this.db
        .insert(chatMessages)
        .values({
          id,
          sessionId,
          role,
          content: stringContent,
          citations: citations || null,
          sentAttachments: sentAttachments || null,
          createdAt: Date.now(),
        })
        .run();
    } catch (err: any) {
      this.logger.error(`Message insertion failed: ${err.message}`, {
        id,
        sessionId,
        role,
        contentType: typeof content,
      });
      throw err;
    }

    this.db
      .update(chatSessions)
      .set({ updatedAt: Date.now() })
      .where(eq(chatSessions.id, sessionId || ''))
      .run();

    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, id))
      .get();
  }

  async deleteSession(sessionId: string, userId: string) {
    this.logger.log(`Deleting session: ${sessionId} for user: ${userId}`);
    const session = this.db
      .select()
      .from(chatSessions)
      .where(
        and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)),
      )
      .get();

    if (!session) {
      this.logger.warn(
        `Delete failed: Session ${sessionId} not found for user ${userId}`,
      );
      return false;
    }

    this.db
      .delete(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .run();
    this.db.delete(chatSessions).where(eq(chatSessions.id, sessionId)).run();
    this.logger.verbose(
      `Session ${sessionId} and its messages deleted successfully`,
    );
    return true;
  }

  async checkSession(
    sessionId: string,
    userId: string,
  ): Promise<{ exists: boolean }> {
    const session = this.db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId || ''),
          eq(chatSessions.userId, userId || ''),
        ),
      )
      .get();
    return { exists: !!session };
  }

  async getRecentMessages(
    sessionId: string,
    limit: number,
    tokenLimit?: number,
  ) {
    const messages = this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .all();

    if (!tokenLimit) {
      // Reverse to return in chronological order (oldest -> newest)
      return messages.reverse();
    }

    const messagesToReturn: typeof messages = [];
    let currentTokens = 0;

    for (const msg of messages) {
      const content = msg.content || '';
      const tokens = encode(content).length;

      if (currentTokens + tokens <= tokenLimit) {
        messagesToReturn.push(msg);
        currentTokens += tokens;
      } else {
        // Stop if adding this message exceeds the token limit
        break;
      }
    }
    return messagesToReturn.reverse();
  }

  async getSessionSummary(sessionId: string) {
    const session = this.db
      .select({
        summary: chatSessions.summary,
        lastSummarizedMessageId: chatSessions.lastSummarizedMessageId,
      })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .get();
    return session;
  }

  async updateSessionSummary(
    sessionId: string,
    summary: string,
    lastMessageId: string,
  ) {
    this.logger.log(`Updating summary for session: ${sessionId}`);
    this.logger.verbose(`New summary: ${summary.substring(0, 100)}...`);
    this.db
      .update(chatSessions)
      .set({
        summary: summary || '',
        lastSummarizedMessageId: lastMessageId || null,
        updatedAt: Date.now(),
      })
      .where(eq(chatSessions.id, sessionId || ''))
      .run();
  }

  async getUnsummarizedMessages(
    sessionId: string,
    lastSummarizedId?: string | null,
  ) {
    const allMessages = this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt)
      .all();

    if (!lastSummarizedId) return allMessages;

    const index = allMessages.findIndex((m) => m.id === lastSummarizedId);
    if (index === -1) return allMessages;

    return allMessages.slice(index + 1);
  }
}
