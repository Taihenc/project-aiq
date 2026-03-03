-- Custom SQL migration file, put your code below! --
ALTER TABLE `chat_messages` ADD COLUMN `sent_attachments` text;
