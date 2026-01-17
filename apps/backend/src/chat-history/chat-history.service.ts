import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/drizzle.module';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { chatSessions, chatMessages, users } from '../database/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatHistoryService {
  constructor(@Inject(DRIZZLE) private db: BetterSQLite3Database) { }

  async getHistory(userId: string) {
    return this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt))
      .all();
  }

  async getSession(sessionId: string, userId: string) {
    const session = this.db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
      .get();

    if (!session) {
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
    this.db.insert(chatSessions).values({
      id,
      title,
      userId,
      createdAt: Date.now(),
    }).run();
    return this.db.select().from(chatSessions).where(eq(chatSessions.id, id)).get();
  }

  async addMessage(sessionId: string, userId: string, role: string, content: string, citations?: any) {
    // Verify ownership first
    const session = this.db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
      .get();

    if (!session) {
      throw new NotFoundException('Session not found or search ownership failed');
    }

    const id = uuidv4();
    this.db.insert(chatMessages).values({
      id,
      sessionId,
      role,
      content,
      citations: citations ? JSON.stringify(citations) : null,
      createdAt: Date.now(),
    }).run();

    this.db.update(chatSessions)
      .set({ updatedAt: Date.now() })
      .where(eq(chatSessions.id, sessionId))
      .run();

    return this.db.select().from(chatMessages).where(eq(chatMessages.id, id)).get();
  }

  async deleteSession(sessionId: string, userId: string) {
    const session = this.db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
      .get();

    if (!session) return false;

    this.db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId)).run();
    this.db.delete(chatSessions).where(eq(chatSessions.id, sessionId)).run();
    return true;
  }
}
