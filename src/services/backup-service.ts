import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';
import { db } from '@/database/database';
import { attachments, inboxItems, itemTags, notes, reminders, settings, spaces, tags, tasks } from '@/database/schema';

export type BackupPayload = {
  schemaVersion: 1;
  exportedAt: string;
  notes: unknown[];
  tasks: unknown[];
  reminders: unknown[];
  spaces: unknown[];
  inbox: unknown[];
  tags: unknown[];
  itemTags: unknown[];
  attachments: unknown[];
  settings: unknown[];
};

export const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  notes: z.array(z.unknown()),
  tasks: z.array(z.unknown()),
  reminders: z.array(z.unknown()),
  spaces: z.array(z.unknown()).default([]),
  inbox: z.array(z.unknown()).default([]),
  tags: z.array(z.unknown()).default([]),
  itemTags: z.array(z.unknown()).default([]),
  attachments: z.array(z.unknown()).default([]),
  settings: z.array(z.unknown()).default([]),
});

export async function createBackup() {
  const payload: BackupPayload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    notes: await db.select().from(notes).all(),
    tasks: await db.select().from(tasks).all(),
    reminders: await db.select().from(reminders).all(),
    spaces: await db.select().from(spaces).all(),
    inbox: await db.select().from(inboxItems).all(),
    tags: await db.select().from(tags).all(),
    itemTags: await db.select().from(itemTags).all(),
    attachments: await db.select().from(attachments).all(),
    settings: await db.select().from(settings).all(),
  };
  const uri = `${FileSystem.documentDirectory}nexo-backup-${Date.now()}.nexo-backup`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(uri, { mimeType: 'application/octet-stream', dialogTitle: 'Exportar backup do Nexo' });
  return uri;
}

export async function validateBackup(uri: string) {
  const raw = await FileSystem.readAsStringAsync(uri);
  const parsed = backupSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error('Backup inválido');
  return parsed.data as BackupPayload;
}

export async function restoreBackup(payload: BackupPayload) {
  const serializeRepeatRule = (row: unknown) => {
    const value = row as { repeatRule?: unknown };
    if (value.repeatRule === undefined || value.repeatRule === null || typeof value.repeatRule === 'string') return row;
    return { ...value, repeatRule: JSON.stringify(value.repeatRule) };
  };

  await db.delete(itemTags).run();
  await db.delete(attachments).run();
  await db.delete(inboxItems).run();
  await db.delete(reminders).run();
  await db.delete(tasks).run();
  await db.delete(notes).run();
  await db.delete(spaces).run();
  await db.delete(tags).run();
  await db.delete(settings).run();
  if (payload.spaces.length)
    await db
      .insert(spaces)
      .values(payload.spaces as never)
      .run();
  if (payload.notes.length)
    await db
      .insert(notes)
      .values(payload.notes as never)
      .run();
  if (payload.tasks.length)
    await db
      .insert(tasks)
      .values(payload.tasks.map(serializeRepeatRule) as never)
      .run();
  if (payload.reminders.length)
    await db
      .insert(reminders)
      .values(
        payload.reminders.map((reminder) => ({
          ...(serializeRepeatRule(reminder) as object),
          notificationId: null,
          notificationStatus: 'not_scheduled',
        })) as never,
      )
      .run();
  if (payload.inbox.length)
    await db
      .insert(inboxItems)
      .values(payload.inbox as never)
      .run();
  if (payload.tags.length)
    await db
      .insert(tags)
      .values(payload.tags as never)
      .run();
  if (payload.itemTags.length)
    await db
      .insert(itemTags)
      .values(payload.itemTags as never)
      .run();
  if (payload.attachments.length)
    await db
      .insert(attachments)
      .values(payload.attachments as never)
      .run();
  if (payload.settings.length)
    await db
      .insert(settings)
      .values(payload.settings as never)
      .run();
}
