CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`citations` text,
	`sent_attachments` text,
	`session_id` text NOT NULL,
	`created_at` integer DEFAULT 1772631555685,
	`parent_id` text,
	`branch_index` integer DEFAULT 0 NOT NULL,
	`path_summary` text,
	`path_last_summarized_id` text,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT 1772631555685,
	`updated_at` integer DEFAULT 1772631555685,
	`summary` text,
	`last_summarized_message_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`auth_provider` text DEFAULT 'local' NOT NULL,
	`provider_id` text,
	`display_name` text,
	`refresh_token` text,
	`created_at` integer DEFAULT 1772631555685
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);