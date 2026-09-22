import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const spaces = sqliteTable('spaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
  deletedAt: text('deleted_at'),
});
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title'),
  content: text('content').notNull(),
  contentFormat: text('content_format').notNull(),
  spaceId: text('space_id'),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  archivedAt: text('archived_at'),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  dueAt: text('due_at'),
  timezone: text('timezone'),
  priority: text('priority').notNull(),
  completedAt: text('completed_at'),
  repeatRule: text('repeat_rule'),
  parentSeriesId: text('parent_series_id'),
  spaceId: text('space_id'),
  relatedNoteId: text('related_note_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
  deletedAt: text('deleted_at'),
});
export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  scheduledAt: text('scheduled_at').notNull(),
  timezone: text('timezone').notNull(),
  repeatRule: text('repeat_rule'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  completedAt: text('completed_at'),
  snoozedUntil: text('snoozed_until'),
  notificationId: text('notification_id'),
  notificationStatus: text('notification_status').notNull(),
  relatedItemId: text('related_item_id'),
  relatedItemType: text('related_item_type'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export const itemTags = sqliteTable('item_tags', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  itemType: text('item_type').notNull(),
  tagId: text('tag_id').notNull(),
});
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  itemType: text('item_type').notNull(),
  type: text('type').notNull(),
  originalName: text('original_name'),
  localPath: text('local_path').notNull(),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  thumbnailPath: text('thumbnail_path'),
  durationMs: integer('duration_ms'),
  createdAt: text('created_at').notNull(),
  deletedAt: text('deleted_at'),
});
export const inboxItems = sqliteTable('inbox_items', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  itemType: text('item_type').notNull(),
  rawText: text('raw_text'),
  createdAt: text('created_at').notNull(),
  organizedAt: text('organized_at'),
  deletedAt: text('deleted_at'),
});
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});
