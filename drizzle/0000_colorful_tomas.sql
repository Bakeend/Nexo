CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`item_type` text NOT NULL,
	`type` text NOT NULL,
	`original_name` text,
	`local_path` text NOT NULL,
	`mime_type` text,
	`size_bytes` integer,
	`thumbnail_path` text,
	`duration_ms` integer,
	`created_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `inbox_items` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`item_type` text NOT NULL,
	`raw_text` text,
	`created_at` text NOT NULL,
	`organized_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `item_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`item_type` text NOT NULL,
	`tag_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`content` text NOT NULL,
	`content_format` text NOT NULL,
	`space_id` text,
	`pinned` integer DEFAULT false NOT NULL,
	`archived_at` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`scheduled_at` text NOT NULL,
	`timezone` text NOT NULL,
	`repeat_rule` text,
	`enabled` integer DEFAULT true NOT NULL,
	`completed_at` text,
	`snoozed_until` text,
	`notification_id` text,
	`notification_status` text NOT NULL,
	`related_item_id` text,
	`related_item_type` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`due_at` text,
	`timezone` text,
	`priority` text NOT NULL,
	`completed_at` text,
	`repeat_rule` text,
	`parent_series_id` text,
	`space_id` text,
	`related_note_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`archived_at` text,
	`deleted_at` text
);
