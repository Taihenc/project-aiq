import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password'), // Nullable for future SSO
  authProvider: text('auth_provider').default('local').notNull(),
  providerId: text('provider_id'),
  displayName: text('display_name'),
  refreshToken: text('refresh_token'),
  createdAt: integer('created_at').default(Date.now()),
});

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(), // UUID
  title: text('title').notNull(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  createdAt: integer('created_at').default(Date.now()),
  updatedAt: integer('updated_at').default(Date.now()),
  summary: text('summary'),
  lastSummarizedMessageId: text('last_summarized_message_id'),
  availableCitations: text('available_citations', { mode: 'json' }), // JSON — accumulated Citation[] for the session citation picker
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(), // UUID
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  citations: text('citations', { mode: 'json' }), // JSON string
  sentAttachments: text('sent_attachments', { mode: 'json' }), // JSON — FileRef[] attached by user when sending
  sessionId: text('session_id')
    .references(() => chatSessions.id)
    .notNull(),
  createdAt: integer('created_at').default(Date.now()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
