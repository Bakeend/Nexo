import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrations } from './migrations';

const sqlite = SQLite.openDatabaseSync('nexo.db');
export const db = drizzle(sqlite);
let initialized = false;

export async function initializeDatabase() {
  if (initialized) return;
  await sqlite.execAsync('PRAGMA foreign_keys = ON;');
  await sqlite.execAsync(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL);',
  );
  for (const migration of migrations) {
    const applied = await sqlite.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_migrations WHERE version = ?',
      migration.version,
    );
    if (applied) continue;
    await sqlite.execAsync(migration.sql);
    await sqlite.runAsync(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
      migration.version,
      migration.name,
      new Date().toISOString(),
    );
  }
  initialized = true;
}
