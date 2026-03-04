import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DRIZZLE } from '../database/drizzle.module';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { chatSessions, chatMessages, users } from '../database/schema';
import { eq, desc, asc, and, lt, isNull, sql } from 'drizzle-orm';
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

  /**
   * Computes available citations for a specific branch path by walking
   * the active path from root to tip and merging per-message citations.
   * This replaces the old session-level available_citations column.
   */
  getPathAvailableCitations(sessionId: string, tipMessageId?: string): any[] {
    const pathIds = this.getActivePath(sessionId, tipMessageId);
    if (pathIds.length === 0) return [];

    // Fetch all messages on the path in one query
    const allMessages = this.db
      .select({ id: chatMessages.id, citations: chatMessages.citations })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .all();

    const pathIdSet = new Set(pathIds);
    const pathMessages = allMessages.filter((m) => pathIdSet.has(m.id));

    // Merge/deduplicate citations from all messages on the path
    const byId = new Map<string, any>();
    for (const msg of pathMessages) {
      const citations = Array.isArray(msg.citations) ? msg.citations : [];
      for (const c of citations) {
        if (!c?.id) continue;
        const prev = byId.get(c.id);
        if (!prev) {
          byId.set(c.id, { ...c, chunks: c.chunks ? [...c.chunks] : [] });
        } else {
          if (c.chunks?.length) {
            const seen = new Set(
              (prev.chunks as any[]).map((ch: any) => ch.chunk_number),
            );
            const novel = c.chunks.filter(
              (ch: any) => !seen.has(ch.chunk_number),
            );
            prev.chunks = [...prev.chunks, ...novel].sort(
              (a: any, b: any) => a.chunk_number - b.chunk_number,
            );
          }
          if (!prev.content && c.content) prev.content = c.content;
        }
      }
    }
    return Array.from(byId.values());
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
    parentId?: string | null,
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

    // Compute branch index: count existing siblings with the same parent
    // Must handle parentId=null (root-level messages) as well.
    const siblingCountRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.sessionId, sessionId),
          parentId
            ? eq(chatMessages.parentId, parentId)
            : isNull(chatMessages.parentId),
        ),
      )
      .get();
    const branchIndex = siblingCountRow?.count ?? 0;

    const id = uuidv4();
    this.logger.verbose(`Inserting message ${id} into session ${sessionId}, parentId=${parentId ?? 'root'}, branchIndex=${branchIndex}`);
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
          parentId: parentId ?? null,
          branchIndex,
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
        title: chatSessions.title,
        summary: chatSessions.summary,
        lastSummarizedMessageId: chatSessions.lastSummarizedMessageId,
      })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .get();
    return session;
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    this.logger.log(`Auto-titling session ${sessionId}: "${title}"`);
    this.db
      .update(chatSessions)
      .set({ title, updatedAt: Date.now() })
      .where(eq(chatSessions.id, sessionId || ''))
      .run();
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
    activePath?: string[],
  ) {
    let allMessages: (typeof chatMessages.$inferSelect)[];

    if (activePath !== undefined) {
      // activePath was explicitly provided — respect it strictly.
      if (activePath.length === 0) {
        // Root-level branch or fresh session: no ancestor messages exist for this
        // branch. Return an empty list so no other branch's history leaks in.
        return [];
      }
      // Load only messages that are on the specified path
      allMessages = this.db
        .select()
        .from(chatMessages)
        .where(and(eq(chatMessages.sessionId, sessionId)))
        .orderBy(asc(chatMessages.createdAt))
        .all()
        .filter((m) => activePath!.includes(m.id));
      // Maintain path order
      allMessages.sort((a, b) => activePath!.indexOf(a.id) - activePath!.indexOf(b.id));
    } else {
      // No activePath — legacy / session-level fallback: load everything
      allMessages = this.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(asc(chatMessages.createdAt))
        .all();
    }

    if (!lastSummarizedId) return allMessages;

    const index = allMessages.findIndex((m) => m.id === lastSummarizedId);
    if (index === -1) return allMessages;

    return allMessages.slice(index + 1);
  }

  /**
   * Returns ALL messages for a session as a flat list (for tree building on the frontend).
   * Each message has parentId and branchIndex populated.
   */
  getMessageTree(sessionId: string) {
    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt))
      .all();
  }

  /**
   * Returns the ordered list of message IDs from root to the given tip.
   * If tipMessageId is not provided, resolves to the "latest" leaf by choosing
   * the highest branchIndex child at every fork.
   */
  getActivePath(sessionId: string, tipMessageId?: string): string[] {
    const all = this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt))
      .all();

    if (all.length === 0) return [];

    if (tipMessageId) {
      // Walk from tip back to root, then reverse
      const byId = new Map(all.map((m) => [m.id, m]));
      const path: string[] = [];
      let current: (typeof all)[0] | undefined = byId.get(tipMessageId);
      const visited = new Set<string>();
      while (current) {
        if (visited.has(current.id)) break;
        visited.add(current.id);
        path.unshift(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return path;
    }

    // Default: traverse from roots always picking the LAST child (highest branchIndex)
    const byParent = new Map<string | null, (typeof all)[0][]>();
    for (const m of all) {
      const key = m.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(m);
    }

    const rootMessages = byParent.get(null) ?? [];
    if (rootMessages.length === 0) return [];

    // Pick root with highest branchIndex (latest branch); tiebreak by createdAt desc
    const root = rootMessages.reduce((a, b) => {
      if (a.branchIndex !== b.branchIndex) return a.branchIndex >= b.branchIndex ? a : b;
      return (a.createdAt ?? 0) >= (b.createdAt ?? 0) ? a : b;
    });

    const path: string[] = [];
    let current: (typeof all)[0] | undefined = root;
    const visited = new Set<string>();
    while (current) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      path.push(current.id);
      const children = byParent.get(current.id) ?? [];
      if (children.length === 0) break;
      // Always pick the child with the highest branchIndex; tiebreak by createdAt
      current = children.reduce((a, b) => {
        if (a.branchIndex !== b.branchIndex) return a.branchIndex >= b.branchIndex ? a : b;
        return (a.createdAt ?? 0) >= (b.createdAt ?? 0) ? a : b;
      });
    }
    return path;
  }

  /**
   * Returns direct children ordered by branchIndex (siblings at a given parent).
   */
  getChildMessages(parentId: string) {
    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.parentId, parentId))
      .orderBy(asc(chatMessages.branchIndex))
      .all();
  }

  /**
   * Persists per-path rolling summary on the tip message node of a branch.
   */
  async updatePathSummary(
    tipMessageId: string,
    summary: string,
    lastSummarizedId: string,
  ) {
    this.logger.log(`Updating path summary for tip message: ${tipMessageId}`);
    this.db
      .update(chatMessages)
      .set({
        pathSummary: summary,
        pathLastSummarizedId: lastSummarizedId,
      })
      .where(eq(chatMessages.id, tipMessageId))
      .run();
  }

  /**
   * Retrieves path summary stored on a specific tip message.
   */
  getPathSummary(tipMessageId: string) {
    return this.db
      .select({
        pathSummary: chatMessages.pathSummary,
        pathLastSummarizedId: chatMessages.pathLastSummarizedId,
      })
      .from(chatMessages)
      .where(eq(chatMessages.id, tipMessageId))
      .get();
  }
}
