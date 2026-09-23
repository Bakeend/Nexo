export const migrations = [
  {
    version: 1,
    name: '0000_initial',
    description: 'Cria as tabelas principais do Nexo e seus índices locais.',
    sql: `
CREATE TABLE IF NOT EXISTS spaces (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, icon TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY NOT NULL, title TEXT, content TEXT NOT NULL, content_format TEXT NOT NULL, space_id TEXT, pinned INTEGER NOT NULL DEFAULT 0, archived_at TEXT, deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, description TEXT, due_at TEXT, timezone TEXT, priority TEXT NOT NULL DEFAULT 'none', completed_at TEXT, repeat_rule TEXT, parent_series_id TEXT, space_id TEXT, related_note_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, description TEXT, scheduled_at TEXT NOT NULL, timezone TEXT NOT NULL, repeat_rule TEXT, enabled INTEGER NOT NULL DEFAULT 1, completed_at TEXT, snoozed_until TEXT, notification_id TEXT, notification_status TEXT NOT NULL DEFAULT 'not_scheduled', related_item_id TEXT, related_item_type TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS item_tags (id TEXT PRIMARY KEY NOT NULL, item_id TEXT NOT NULL, item_type TEXT NOT NULL, tag_id TEXT NOT NULL, UNIQUE(item_id, item_type, tag_id));
CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY NOT NULL, item_id TEXT NOT NULL, item_type TEXT NOT NULL, type TEXT NOT NULL, original_name TEXT, local_path TEXT NOT NULL, mime_type TEXT, size_bytes INTEGER, thumbnail_path TEXT, duration_ms INTEGER, created_at TEXT NOT NULL, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS inbox_items (id TEXT PRIMARY KEY NOT NULL, item_id TEXT NOT NULL, item_type TEXT NOT NULL, raw_text TEXT, created_at TEXT NOT NULL, organized_at TEXT, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS notes_updated_idx ON notes(updated_at);
CREATE INDEX IF NOT EXISTS tasks_due_idx ON tasks(due_at);
CREATE INDEX IF NOT EXISTS reminders_scheduled_idx ON reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS inbox_created_idx ON inbox_items(created_at);
`,
  },
  {
    version: 2,
    name: '0001_global_pins',
    description: 'Adiciona fixação global para tarefas, arquivos e espaços.',
    sql: `
ALTER TABLE tasks ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attachments ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE spaces ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
`,
  },
];
