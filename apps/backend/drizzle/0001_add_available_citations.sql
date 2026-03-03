-- Migration: add available_citations column to chat_messages
ALTER TABLE `chat_messages` ADD COLUMN `available_citations` text;
