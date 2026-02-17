import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DRIZZLE } from '../database/drizzle.module';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { chatSessions, chatMessages, users } from '../database/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { encode } from 'gpt-tokenizer';

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name);

  constructor(@Inject(DRIZZLE) private db: BetterSQLite3Database) {}

  async getHistory(userId: string) {
    this.logger.debug(`Fetching history for user: ${userId}`);
    return this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt))
      .all();
  }

  async getSession(sessionId: string, userId: string) {
    this.logger.debug(`Fetching session: ${sessionId} for user: ${userId}`);
    const session = this.db
      .select()
      .from(chatSessions)
      .where(
        and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)),
      )
      .get();

    if (!session) {
      this.logger.warn(`Session not found: ${sessionId}`);
      throw new NotFoundException('Session not found');
    }

    const messages = this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt)
      .all();

    return { session, messages };
  }

  async createSession(userId: string, title: string = 'New Chat') {
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
    content: string,
    citations?: any,
  ) {
    this.logger.debug(`Adding message to session ${sessionId}. Role: ${role}`);
    // Verify ownership first
    const session = this.db
      .select()
      .from(chatSessions)
      .where(
        and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)),
      )
      .get();

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
    this.db
      .insert(chatMessages)
      .values({
        id,
        sessionId,
        role,
        content,
        citations: citations ? JSON.stringify(citations) : null,
        createdAt: Date.now(),
      })
      .run();

    this.db
      .update(chatSessions)
      .set({ updatedAt: Date.now() })
      .where(eq(chatSessions.id, sessionId))
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
        summary,
        lastSummarizedMessageId: lastMessageId,
        updatedAt: Date.now(),
      })
      .where(eq(chatSessions.id, sessionId))
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
