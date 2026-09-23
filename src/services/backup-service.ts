import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';
import { db } from '@/database/database';
import { attachments, inboxItems, itemTags, notes, reminders, settings, spaces, tags, tasks } from '@/database/schema';
import { readMediaForBackup, removeRestoredMedia, restoreBackupMedia } from '@/services/media-service';
import { Platform } from 'react-native';

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_MEDIA_BYTES = 100 * 1024 * 1024;
const MAX_BACKUP_FILE_BYTES = 160 * 1024 * 1024;
const MAX_BASE64_LENGTH = 4 * Math.ceil(MAX_MEDIA_BYTES / 3);
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const idSchema = z.string().min(1).max(200);
const timestampSchema = z.string().min(1).max(100);
const nullableTimestampSchema = timestampSchema.nullable();
const nullableTextSchema = z.string().max(4096).nullable();
const itemTypeSchema = z.enum(['note', 'task', 'reminder', 'file', 'image', 'audio', 'quick_capture']);
const prioritySchema = z.enum(['none', 'low', 'medium', 'high']);
const notificationStatusSchema = z.enum(['not_scheduled', 'scheduled', 'delivered', 'cancelled', 'permission_denied', 'error']);
const repeatRuleSchema = z.union([
  z.object({ type: z.literal('daily'), interval: z.number().int().positive() }).passthrough(),
  z
    .object({
      type: z.literal('weekly'),
      interval: z.number().int().positive(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)),
    })
    .passthrough(),
  z
    .object({ type: z.literal('monthly'), interval: z.number().int().positive(), dayOfMonth: z.number().int().min(1).max(31) })
    .passthrough(),
  z
    .object({
      type: z.literal('yearly'),
      interval: z.number().int().positive(),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
    })
    .passthrough(),
  z
    .object({
      type: z.literal('custom'),
      interval: z.number().int().positive(),
      unit: z.enum(['day', 'week', 'month']),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    })
    .passthrough(),
]);
const repeatRuleValueSchema = z.union([z.string().max(4096), repeatRuleSchema]).nullable();

const spaceRowSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(200),
    icon: nullableTextSchema,
    pinned: z.boolean().optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    archivedAt: nullableTimestampSchema,
    deletedAt: nullableTimestampSchema,
  })
  .passthrough();

const noteRowSchema = z
  .object({
    id: idSchema,
    title: z.string().max(2000).nullable(),
    content: z.string(),
    contentFormat: z.literal('blocks-v1'),
    spaceId: idSchema.nullable(),
    pinned: z.boolean(),
    archivedAt: nullableTimestampSchema,
    deletedAt: nullableTimestampSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .passthrough();

const taskRowSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(2000),
    description: nullableTextSchema,
    dueAt: nullableTimestampSchema,
    timezone: z.string().max(100).nullable(),
    priority: prioritySchema,
    completedAt: nullableTimestampSchema,
    repeatRule: repeatRuleValueSchema,
    parentSeriesId: idSchema.nullable(),
    spaceId: idSchema.nullable(),
    relatedNoteId: idSchema.nullable(),
    pinned: z.boolean().optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    archivedAt: nullableTimestampSchema,
    deletedAt: nullableTimestampSchema,
  })
  .passthrough();

const reminderRowSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(2000),
    description: nullableTextSchema,
    scheduledAt: timestampSchema,
    timezone: z.string().min(1).max(100),
    repeatRule: repeatRuleValueSchema,
    enabled: z.boolean(),
    completedAt: nullableTimestampSchema,
    snoozedUntil: nullableTimestampSchema,
    notificationId: nullableTextSchema,
    notificationStatus: notificationStatusSchema,
    relatedItemId: idSchema.nullable(),
    relatedItemType: z.enum(['note', 'task']).nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    deletedAt: nullableTimestampSchema,
  })
  .passthrough();

const tagRowSchema = z
  .object({ id: idSchema, name: z.string().min(1).max(200), createdAt: timestampSchema, updatedAt: timestampSchema })
  .passthrough();

const itemTagRowSchema = z
  .object({ id: idSchema, itemId: idSchema, itemType: z.enum(['note', 'task', 'reminder']), tagId: idSchema })
  .passthrough();

const attachmentRowSchema = z
  .object({
    id: idSchema,
    itemId: idSchema,
    itemType: itemTypeSchema,
    type: z.enum(['image', 'audio', 'file']),
    originalName: nullableTextSchema,
    localPath: z.string().min(1).max(4096),
    mimeType: z.string().max(255).nullable(),
    sizeBytes: z.number().int().nonnegative().nullable(),
    thumbnailPath: z.string().max(4096).nullable(),
    durationMs: z.number().int().nonnegative().nullable(),
    pinned: z.boolean().optional(),
    createdAt: timestampSchema,
    deletedAt: nullableTimestampSchema,
  })
  .passthrough();

const inboxRowSchema = z
  .object({
    id: idSchema,
    itemId: idSchema,
    itemType: itemTypeSchema,
    rawText: nullableTextSchema,
    createdAt: timestampSchema,
    organizedAt: nullableTimestampSchema,
    deletedAt: nullableTimestampSchema,
  })
  .passthrough();

const settingRowSchema = z.object({ key: z.string().min(1).max(255), value: z.string(), updatedAt: timestampSchema }).passthrough();

const entityRowsShape = {
  notes: z.array(noteRowSchema),
  tasks: z.array(taskRowSchema),
  reminders: z.array(reminderRowSchema),
  spaces: z.array(spaceRowSchema).default([]),
  inbox: z.array(inboxRowSchema).default([]),
  tags: z.array(tagRowSchema).default([]),
  itemTags: z.array(itemTagRowSchema).default([]),
  attachments: z.array(attachmentRowSchema).default([]),
  settings: z.array(settingRowSchema).default([]),
};

type EntityRows = {
  notes: z.infer<typeof noteRowSchema>[];
  tasks: z.infer<typeof taskRowSchema>[];
  reminders: z.infer<typeof reminderRowSchema>[];
  spaces: z.infer<typeof spaceRowSchema>[];
  inbox: z.infer<typeof inboxRowSchema>[];
  tags: z.infer<typeof tagRowSchema>[];
  itemTags: z.infer<typeof itemTagRowSchema>[];
  attachments: z.infer<typeof attachmentRowSchema>[];
  settings: z.infer<typeof settingRowSchema>[];
};

function validateEntityReferences(payload: EntityRows, context: z.RefinementCtx) {
  const noteIds = new Set(payload.notes.map((row) => row.id));
  const taskIds = new Set(payload.tasks.map((row) => row.id));
  const reminderIds = new Set(payload.reminders.map((row) => row.id));
  const spaceIds = new Set(payload.spaces.map((row) => row.id));
  const tagIds = new Set(payload.tags.map((row) => row.id));
  const inboxKeys = new Set(payload.inbox.map((row) => `${row.itemType}\u0000${row.itemId}`));

  for (const [index, row] of payload.notes.entries()) {
    if (row.spaceId && !spaceIds.has(row.spaceId)) {
      context.addIssue({ code: 'custom', path: ['notes', index, 'spaceId'], message: 'A nota referencia um espaço inexistente.' });
    }
  }
  for (const [index, row] of payload.tasks.entries()) {
    if (row.spaceId && !spaceIds.has(row.spaceId)) {
      context.addIssue({ code: 'custom', path: ['tasks', index, 'spaceId'], message: 'A tarefa referencia um espaço inexistente.' });
    }
    if (row.relatedNoteId && !noteIds.has(row.relatedNoteId)) {
      context.addIssue({ code: 'custom', path: ['tasks', index, 'relatedNoteId'], message: 'A tarefa referencia uma nota inexistente.' });
    }
    if (row.parentSeriesId && !taskIds.has(row.parentSeriesId)) {
      context.addIssue({ code: 'custom', path: ['tasks', index, 'parentSeriesId'], message: 'A tarefa referencia uma série inexistente.' });
    }
  }
  for (const [index, row] of payload.reminders.entries()) {
    if ((row.relatedItemId === null) !== (row.relatedItemType === null)) {
      context.addIssue({ code: 'custom', path: ['reminders', index], message: 'A referência do lembrete está incompleta.' });
    } else if (row.relatedItemId && !(row.relatedItemType === 'note' ? noteIds : taskIds).has(row.relatedItemId)) {
      context.addIssue({
        code: 'custom',
        path: ['reminders', index, 'relatedItemId'],
        message: 'O lembrete referencia um item inexistente.',
      });
    }
  }
  for (const [index, row] of payload.itemTags.entries()) {
    if (!tagIds.has(row.tagId)) {
      context.addIssue({ code: 'custom', path: ['itemTags', index, 'tagId'], message: 'A relação referencia uma tag inexistente.' });
    }
    const matchingItems = row.itemType === 'note' ? noteIds : row.itemType === 'task' ? taskIds : reminderIds;
    if (!matchingItems.has(row.itemId)) {
      context.addIssue({ code: 'custom', path: ['itemTags', index, 'itemId'], message: 'A relação referencia um item inexistente.' });
    }
  }
  for (const [index, row] of payload.attachments.entries()) {
    const exists =
      row.itemType === 'note'
        ? noteIds.has(row.itemId)
        : row.itemType === 'task'
          ? taskIds.has(row.itemId)
          : row.itemType === 'reminder'
            ? reminderIds.has(row.itemId)
            : inboxKeys.has(`${row.itemType}\u0000${row.itemId}`);
    if (!exists) {
      context.addIssue({
        code: 'custom',
        path: ['attachments', index, 'itemId'],
        message: 'O anexo referencia um item inexistente ou incompatível.',
      });
    }
  }
}

const backupV1Schema = z.object({
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

const attachmentMediaSchema = z.object({
  attachmentId: z.string().min(1).max(200),
  field: z.enum(['localPath', 'thumbnailPath']),
  fileName: z
    .string()
    .min(1)
    .max(255)
    .refine((name) => name !== '.' && name !== '..' && !/[\\/\u0000]/.test(name), 'Nome de arquivo inválido'),
  mimeType: z.string().max(255).nullable(),
  sizeBytes: z.number().int().min(0).max(MAX_MEDIA_BYTES),
  contentBase64: z.string().max(MAX_BASE64_LENGTH).regex(BASE64_PATTERN, 'Conteúdo Base64 inválido'),
});

const backupV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    exportedAt: timestampSchema,
    ...entityRowsShape,
    attachments: z.array(attachmentRowSchema),
    attachmentMedia: z.array(attachmentMediaSchema),
  })
  .superRefine((payload, context) => {
    validateEntityReferences(payload, context);

    const attachmentById = new Map<string, z.infer<typeof attachmentRowSchema>>();
    for (const attachment of payload.attachments) {
      if (attachmentById.has(attachment.id)) {
        context.addIssue({ code: 'custom', message: 'Há anexos com identificadores repetidos.' });
      }
      attachmentById.set(attachment.id, attachment);
    }

    const referencedMedia = new Set<string>();
    let aggregateBytes = 0;
    for (const media of payload.attachmentMedia) {
      const key = `${media.attachmentId}:${media.field}`;
      if (referencedMedia.has(key)) {
        context.addIssue({ code: 'custom', message: 'Um arquivo de anexo está duplicado.' });
      }
      referencedMedia.add(key);

      const attachment = attachmentById.get(media.attachmentId);
      if (!attachment || (media.field === 'thumbnailPath' && !attachment.thumbnailPath)) {
        context.addIssue({ code: 'custom', message: 'Há um arquivo sem anexo correspondente.' });
      }
      const padding = media.contentBase64.endsWith('==') ? 2 : media.contentBase64.endsWith('=') ? 1 : 0;
      const decodedSize = (media.contentBase64.length / 4) * 3 - padding;
      if (decodedSize !== media.sizeBytes) {
        context.addIssue({ code: 'custom', message: 'O tamanho de um arquivo de anexo não corresponde ao conteúdo.' });
      }
      aggregateBytes += media.sizeBytes;
    }

    if (aggregateBytes > MAX_TOTAL_MEDIA_BYTES) {
      context.addIssue({ code: 'custom', message: 'Os anexos ultrapassam o limite total de 100 MB.' });
    }

    for (const attachment of payload.attachments) {
      if (!referencedMedia.has(`${attachment.id}:localPath`)) {
        context.addIssue({ code: 'custom', message: 'Um anexo não contém o arquivo original.' });
      }
      if (attachment.thumbnailPath && !referencedMedia.has(`${attachment.id}:thumbnailPath`)) {
        context.addIssue({ code: 'custom', message: 'Uma miniatura de anexo não contém seu arquivo.' });
      }
    }
  });

export const backupSchema = z.union([backupV1Schema, backupV2Schema]);
export type BackupPayload = z.infer<typeof backupSchema>;

type BackupAttachment = z.infer<typeof attachmentRowSchema>;
type BackupAttachmentMedia = z.infer<typeof attachmentMediaSchema>;

export function mapRestoredAttachmentRows(rows: BackupAttachment[], mediaPaths: Map<string, string>) {
  return rows.map((row) => {
    const localPath = mediaPaths.get(`${row.id}:localPath`);
    if (!localPath) throw new Error('Um arquivo original do anexo não foi restaurado.');

    if (row.thumbnailPath) {
      const thumbnailPath = mediaPaths.get(`${row.id}:thumbnailPath`);
      if (!thumbnailPath) throw new Error('Uma miniatura de anexo não foi restaurada.');
      return { ...row, localPath, thumbnailPath };
    }

    return { ...row, localPath, ...(row.thumbnailPath === undefined ? {} : { thumbnailPath: null }) };
  });
}

function getSafeFileName(value: unknown, fallback: string) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const leaf = value.replace(/\\/g, '/').split('/').pop()?.trim();
  if (!leaf || leaf === '.' || leaf === '..') return fallback;
  return leaf.slice(0, 255);
}

function getStoredFileSize(base64: string) {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

async function collectAttachmentMedia(rows: unknown[]) {
  const files: BackupAttachmentMedia[] = [];
  let aggregateBytes = 0;

  for (const rawRow of rows) {
    const row = attachmentRowSchema.parse(rawRow);
    const fields: Array<{ field: 'localPath' | 'thumbnailPath'; path: string; fileName: string; mimeType: string | null }> = [
      {
        field: 'localPath',
        path: row.localPath,
        fileName: getSafeFileName((rawRow as Record<string, unknown>).originalName, `attachment-${row.id}.bin`),
        mimeType:
          typeof (rawRow as Record<string, unknown>).mimeType === 'string'
            ? ((rawRow as Record<string, unknown>).mimeType as string)
            : null,
      },
    ];
    if (row.thumbnailPath) {
      fields.push({
        field: 'thumbnailPath',
        path: row.thumbnailPath,
        fileName: `thumbnail-${row.id}.jpg`,
        mimeType: 'image/jpeg',
      });
    }

    for (const field of fields) {
      const content = await readMediaForBackup(field.path);
      if (!BASE64_PATTERN.test(content.base64) || getStoredFileSize(content.base64) !== content.sizeBytes) {
        throw new Error('Não foi possível verificar completamente o conteúdo físico de um anexo.');
      }
      aggregateBytes += content.sizeBytes;
      if (aggregateBytes > MAX_TOTAL_MEDIA_BYTES) throw new Error('Os anexos ultrapassam o limite total de backup de 100 MB.');
      files.push({
        attachmentId: row.id,
        field: field.field,
        fileName: field.fileName,
        mimeType: field.mimeType,
        sizeBytes: content.sizeBytes,
        contentBase64: content.base64,
      });
    }
  }

  return files;
}

export async function createBackup() {
  const [noteRows, taskRows, reminderRows, spaceRows, inboxRows, tagRows, itemTagRows, attachmentRows, settingRows] = await Promise.all([
    db.select().from(notes).all(),
    db.select().from(tasks).all(),
    db.select().from(reminders).all(),
    db.select().from(spaces).all(),
    db.select().from(inboxItems).all(),
    db.select().from(tags).all(),
    db.select().from(itemTags).all(),
    db.select().from(attachments).all(),
    db.select().from(settings).all(),
  ]);
  const attachmentMedia = await collectAttachmentMedia(attachmentRows);
  const payload = {
    schemaVersion: 2 as const,
    exportedAt: new Date().toISOString(),
    notes: noteRows,
    tasks: taskRows,
    reminders: reminderRows,
    spaces: spaceRows,
    inbox: inboxRows,
    tags: tagRows,
    itemTags: itemTagRows,
    attachments: attachmentRows,
    attachmentMedia,
    settings: settingRows,
  };
  const serialized = JSON.stringify(payload, null, 2);
  if (new Blob([serialized]).size > MAX_BACKUP_FILE_BYTES) throw new Error('O backup ultrapassa o limite de arquivo de 160 MB.');

  const uri = `${FileSystem.documentDirectory}nexo-backup-${Date.now()}.nexo-backup`;
  await FileSystem.writeAsStringAsync(uri, serialized);
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(uri, { mimeType: 'application/octet-stream', dialogTitle: 'Exportar backup do Nexo' });
  return uri;
}

export async function validateBackup(uri: string): Promise<BackupPayload> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > MAX_BACKUP_FILE_BYTES) {
      throw new Error('O arquivo de backup ultrapassa o limite de 160 MB.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('limite')) throw error;
    // Some document picker URIs cannot be inspected with getInfoAsync; the read below remains authoritative.
  }

  let raw: string;
  try {
    raw = await FileSystem.readAsStringAsync(uri);
  } catch {
    throw new Error('Não foi possível ler o arquivo de backup.');
  }
  if (new Blob([raw]).size > MAX_BACKUP_FILE_BYTES) throw new Error('O arquivo de backup ultrapassa o limite de 160 MB.');

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('O arquivo de backup não contém JSON válido.');
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) throw new Error('Backup inválido ou incompleto. Verifique os arquivos dos anexos e tente novamente.');
  return parsed.data;
}

function serializeRepeatRule(row: unknown) {
  const value = row as { repeatRule?: unknown };
  if (value.repeatRule === undefined || value.repeatRule === null || typeof value.repeatRule === 'string') return row;
  return { ...value, repeatRule: JSON.stringify(value.repeatRule) };
}

function buildRestoreOperations(transaction: Parameters<Parameters<typeof db.transaction>[0]>[0], payload: BackupPayload) {
  const operations: Array<() => unknown> = [
    () => transaction.delete(itemTags).run(),
    () => transaction.delete(attachments).run(),
    () => transaction.delete(inboxItems).run(),
    () => transaction.delete(reminders).run(),
    () => transaction.delete(tasks).run(),
    () => transaction.delete(notes).run(),
    () => transaction.delete(spaces).run(),
    () => transaction.delete(tags).run(),
    () => transaction.delete(settings).run(),
  ];
  if (payload.spaces.length)
    operations.push(() =>
      transaction
        .insert(spaces)
        .values(payload.spaces as never)
        .run(),
    );
  if (payload.notes.length)
    operations.push(() =>
      transaction
        .insert(notes)
        .values(payload.notes as never)
        .run(),
    );
  if (payload.tasks.length) {
    operations.push(() =>
      transaction
        .insert(tasks)
        .values(payload.tasks.map(serializeRepeatRule) as never)
        .run(),
    );
  }
  if (payload.reminders.length) {
    operations.push(() =>
      transaction
        .insert(reminders)
        .values(
          payload.reminders.map((reminder) => ({
            ...(serializeRepeatRule(reminder) as object),
            notificationId: null,
            notificationStatus: 'not_scheduled',
          })) as never,
        )
        .run(),
    );
  }
  if (payload.inbox.length)
    operations.push(() =>
      transaction
        .insert(inboxItems)
        .values(payload.inbox as never)
        .run(),
    );
  if (payload.tags.length)
    operations.push(() =>
      transaction
        .insert(tags)
        .values(payload.tags as never)
        .run(),
    );
  if (payload.itemTags.length)
    operations.push(() =>
      transaction
        .insert(itemTags)
        .values(payload.itemTags as never)
        .run(),
    );
  if (payload.attachments.length)
    operations.push(() =>
      transaction
        .insert(attachments)
        .values(payload.attachments as never)
        .run(),
    );
  if (payload.settings.length)
    operations.push(() =>
      transaction
        .insert(settings)
        .values(payload.settings as never)
        .run(),
    );
  return operations;
}

async function commitRestore(payload: BackupPayload) {
  if (Platform.OS === 'web') {
    await db.transaction(async (transaction) => {
      for (const operation of buildRestoreOperations(transaction, payload)) await operation();
    });
    return;
  }

  db.transaction((transaction) => {
    for (const operation of buildRestoreOperations(transaction, payload)) operation();
  });
}

export async function restoreBackup(input: BackupPayload) {
  const parsed = backupSchema.safeParse(input);
  if (!parsed.success) throw new Error('Backup inválido ou incompleto. Verifique os arquivos dos anexos e tente novamente.');
  const payload = parsed.data;
  const restoredUris: string[] = [];
  const legacyAttachmentsOmitted = payload.schemaVersion === 1 ? payload.attachments.length : 0;

  try {
    let attachmentRows: unknown[] = [];
    if (payload.schemaVersion === 2) {
      const mediaPaths = new Map<string, string>();
      for (const media of payload.attachmentMedia) {
        const uri = await restoreBackupMedia(media.contentBase64, media.fileName, media.mimeType);
        restoredUris.push(uri);
        mediaPaths.set(`${media.attachmentId}:${media.field}`, uri);
      }
      attachmentRows = mapRestoredAttachmentRows(payload.attachments, mediaPaths);
    }

    await commitRestore({ ...payload, attachments: attachmentRows } as BackupPayload);
  } catch (error) {
    await Promise.allSettled(restoredUris.map((uri) => removeRestoredMedia(uri)));
    throw error;
  }

  return { legacyAttachmentsOmitted };
}
