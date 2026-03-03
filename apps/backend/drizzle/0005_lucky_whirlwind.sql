PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`citations` text,
	`sent_attachments` text,
	`session_id` text NOT NULL,
	`created_at` integer DEFAULT 1772554305785,
	`parent_id` text,
	`branch_index` integer DEFAULT 0 NOT NULL,
	`path_summary` text,
	`path_last_summarized_id` text,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_chat_messages`("id", "role", "content", "citations", "sent_attachments", "session_id", "created_at", "parent_id", "branch_index", "path_summary", "path_last_summarized_id") SELECT "id", "role", "content", "citations", "sent_attachments", "session_id", "created_at", NULL, 0, NULL, NULL FROM `chat_messages`;--> statement-breakpoint
DROP TABLE `chat_messages`;--> statement-breakpoint
ALTER TABLE `__new_chat_messages` RENAME TO `chat_messages`;--> statement-breakpoint
-- Back-fill parent_id for existing linear message histories.
-- Each message's parent is the message with the immediately preceding created_at in the same session.
UPDATE `chat_messages`
SET `parent_id` = (
  SELECT `id` FROM `chat_messages` AS `prev`
  WHERE `prev`.`session_id` = `chat_messages`.`session_id`
    AND `prev`.`created_at` < `chat_messages`.`created_at`
  ORDER BY `prev`.`created_at` DESC
  LIMIT 1
)
WHERE `parent_id` IS NULL;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT 1772554305784,
	`updated_at` integer DEFAULT 1772554305784,
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
	`created_at` integer DEFAULT 1772554305784
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password", "auth_provider", "provider_id", "display_name", "refresh_token", "created_at") SELECT "id", "email", "password", "auth_provider", "provider_id", "display_name", "refresh_token", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
