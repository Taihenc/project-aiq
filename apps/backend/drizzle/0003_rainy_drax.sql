PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`citations` text,
	`sent_attachments` text,
	`session_id` text NOT NULL,
	`created_at` integer DEFAULT 1772498835235,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_chat_messages`("id", "role", "content", "citations", "sent_attachments", "session_id", "created_at") SELECT "id", "role", "content", "citations", "sent_attachments", "session_id", "created_at" FROM `chat_messages`;--> statement-breakpoint
DROP TABLE `chat_messages`;--> statement-breakpoint
ALTER TABLE `__new_chat_messages` RENAME TO `chat_messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT 1772498835235,
	`updated_at` integer DEFAULT 1772498835235,
	`summary` text,
	`last_summarized_message_id` text,
	`available_citations` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_chat_sessions`("id", "title", "user_id", "created_at", "updated_at", "summary", "last_summarized_message_id", "available_citations") SELECT "id", "title", "user_id", "created_at", "updated_at", "summary", "last_summarized_message_id", "available_citations" FROM `chat_sessions`;--> statement-breakpoint
DROP TABLE `chat_sessions`;--> statement-breakpoint
ALTER TABLE `__new_chat_sessions` RENAME TO `chat_sessions`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`auth_provider` text DEFAULT 'local' NOT NULL,
	`provider_id` text,
	`display_name` text,
	`refresh_token` text,
	`created_at` integer DEFAULT 1772498835234
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password", "auth_provider", "provider_id", "display_name", "refresh_token", "created_at") SELECT "id", "email", "password", "auth_provider", "provider_id", "display_name", "refresh_token", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);