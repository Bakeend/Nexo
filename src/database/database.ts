import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { migrations } from './migrations';

type AsyncDatabase = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

let webDatabasePromise: Promise<AsyncDatabase> | undefined;

function getWebDatabase() {
  webDatabasePromise ??= SQLite.openDatabaseAsync('nexo.db');
  return webDatabasePromise;
}

const webDb = drizzleProxy(async (sql, params, method) => {
  const database = await getWebDatabase();
  const statement = await database.prepareAsync(sql);

  try {
    const result = await statement.executeForRawResultAsync(params);

    if (method === 'get') {
      const row = await result.getFirstAsync();
      return { rows: row ? [row] : [] };
    }

    if (method === 'all' || method === 'values') {
      return { rows: await result.getAllAsync() };
    }

    return { rows: [] };
  } finally {
    await statement.finalizeAsync();
  }
});

const sqlite = Platform.OS === 'web' ? null : SQLite.openDatabaseSync('nexo.db');
export const db = (Platform.OS === 'web' ? webDb : drizzle(sqlite!)) as ReturnType<typeof drizzle>;
let initialized = false;

export async function getDatabaseSizeBytes(): Promise<number> {
  if (Platform.OS === 'web') return (await (await getWebDatabase()).serializeAsync()).byteLength;
  const directory = SQLite.defaultDatabaseDirectory.replace(/\/$/, '');
  const uriDirectory = directory.startsWith('file://') ? directory : `file://${directory}`;
  const files = await Promise.all(
    ['nexo.db', 'nexo.db-wal', 'nexo.db-shm'].map((name) => FileSystem.getInfoAsync(`${uriDirectory}/${name}`)),
  );
  return files.reduce((total, info) => total + (info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0), 0);
}

export async function initializeDatabase() {
  if (initialized) return;
  const database = Platform.OS === 'web' ? await getWebDatabase() : sqlite!;
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await database.execAsync(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL);',
  );
  for (const migration of migrations) {
    const applied = await database.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_migrations WHERE version = ?',
      migration.version,
    );
    if (applied) continue;
    await database.execAsync(migration.sql);
    await database.runAsync(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
      migration.version,
      migration.name,
      new Date().toISOString(),
    );
  }
  initialized = true;
}
