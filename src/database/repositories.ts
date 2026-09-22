import { and, desc, eq, isNotNull, isNull, like, or } from 'drizzle-orm';
import { db } from './database';
import { attachments, inboxItems, itemTags, notes, reminders, settings, spaces, tags, tasks } from './schema';
import { newId, nowIso } from '@/utils/ids';
import type {
  Attachment,
  InboxItem,
  ItemType,
  Note,
  NoteBlock,
  Reminder,
  RepeatRule,
  Space,
  Task,
  UnifiedItem,
  Priority,
  Tag,
} from '@/types/domain';
import { parseNoteBlocks, serializeNoteBlocks } from '@/utils/note-blocks';

const ruleFromDb = (value: string | null): RepeatRule => {
  if (!value) return null;
  try {
    return JSON.parse(value) as RepeatRule;
  } catch {
    return null;
  }
};
const ruleToDb = (value: RepeatRule) => (value ? JSON.stringify(value) : null);

export async function getSetting(key: string) {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}
export async function setSetting(key: string, value: string) {
  const updatedAt = nowIso();
  await db.insert(settings).values({ key, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } }).run();
}

export async function listNotes(): Promise<Note[]> {
  return (await db
    .select()
    .from(notes)
    .where(and(isNull(notes.deletedAt), isNull(notes.archivedAt)))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt))
    .all()) as Note[];
}
export async function findNote(id: string) {
  return (await db.select().from(notes).where(eq(notes.id, id)).get()) as Note | undefined;
}
export async function createNote(input: { title?: string | null; content?: string; spaceId?: string | null }) {
  const now = nowIso();
  const item = {
    id: newId(),
    title: input.title || null,
    content: input.content || JSON.stringify([{ type: 'text', text: '' }]),
    contentFormat: 'blocks-v1',
    spaceId: input.spaceId ?? null,
    pinned: false,
    archivedAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(notes).values(item).run();
  return item as Note;
}
export async function updateNote(id: string, input: Partial<Pick<Note, 'title' | 'content' | 'spaceId' | 'pinned'>>) {
  const item = { ...input, updatedAt: nowIso() };
  await db.update(notes).set(item).where(eq(notes.id, id)).run();
  return findNote(id);
}
export async function appendNoteBlock(id: string, block: NoteBlock) {
  const note = await findNote(id);
  if (!note) return undefined;
  const blocks = parseNoteBlocks(note.content);
  await updateNote(id, { content: serializeNoteBlocks([...blocks, block]) });
  return block;
}
export async function archiveNote(id: string) {
  await db.update(notes).set({ archivedAt: nowIso(), updatedAt: nowIso() }).where(eq(notes.id, id)).run();
}

export async function unarchiveNote(id: string) {
  await db.update(notes).set({ archivedAt: null, updatedAt: nowIso() }).where(eq(notes.id, id)).run();
}
export async function trashNote(id: string) {
  await db.update(notes).set({ deletedAt: nowIso(), updatedAt: nowIso() }).where(eq(notes.id, id)).run();
}
export async function restoreNote(id: string) {
  await db.update(notes).set({ deletedAt: null, archivedAt: null, updatedAt: nowIso() }).where(eq(notes.id, id)).run();
}

export async function listTasks(filter: 'today' | 'upcoming' | 'all' = 'all'): Promise<Task[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(isNull(tasks.deletedAt), isNull(tasks.archivedAt)))
    .orderBy(desc(tasks.dueAt), desc(tasks.createdAt))
    .all();
  return (rows as Array<typeof tasks.$inferSelect>).map(toTask).filter((task) => {
    if (filter === 'all') return true;
    if (!task.dueAt) return filter === 'today';
    const day = new Date(task.dueAt);
    const now = new Date();
    if (filter === 'today') return day.toDateString() === now.toDateString() || day < now;
    return day > now;
  });
}
const toTask = (row: typeof tasks.$inferSelect): Task =>
  ({ ...row, priority: row.priority as Priority, repeatRule: ruleFromDb(row.repeatRule) }) as Task;
export async function findTask(id: string) {
  const row = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  return row ? toTask(row) : undefined;
}
export async function createTask(input: {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  priority?: Priority;
  spaceId?: string | null;
  relatedNoteId?: string | null;
  repeatRule?: RepeatRule;
}) {
  const now = nowIso();
  const item = {
    id: newId(),
    title: input.title.trim(),
    description: input.description ?? null,
    dueAt: input.dueAt ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    priority: input.priority ?? 'none',
    completedAt: null,
    repeatRule: ruleToDb(input.repeatRule ?? null),
    parentSeriesId: null,
    spaceId: input.spaceId ?? null,
    relatedNoteId: input.relatedNoteId ?? null,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
  };
  await db.insert(tasks).values(item).run();
  return toTask(item as typeof tasks.$inferSelect);
}
export async function updateTask(
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    dueAt: string | null;
    priority: Priority;
    spaceId: string | null;
    repeatRule: RepeatRule;
  }>,
) {
  const data: Record<string, unknown> = { ...input, updatedAt: nowIso() };
  if (input.repeatRule !== undefined) data.repeatRule = ruleToDb(input.repeatRule);
  await db
    .update(tasks)
    .set(data as never)
    .where(eq(tasks.id, id))
    .run();
  return findTask(id);
}
export async function toggleTask(id: string, completed?: boolean) {
  await db
    .update(tasks)
    .set({ completedAt: (completed ?? true) ? nowIso() : null, updatedAt: nowIso() })
    .where(eq(tasks.id, id))
    .run();
  return findTask(id);
}
export async function trashTask(id: string) {
  await db.update(tasks).set({ deletedAt: nowIso(), updatedAt: nowIso() }).where(eq(tasks.id, id)).run();
}

const toReminder = (row: typeof reminders.$inferSelect): Reminder =>
  ({
    ...row,
    repeatRule: ruleFromDb(row.repeatRule),
    notificationStatus: row.notificationStatus as Reminder['notificationStatus'],
    relatedItemType: row.relatedItemType as Reminder['relatedItemType'],
  }) as Reminder;
export async function listReminders(): Promise<Reminder[]> {
  const rows = await db.select().from(reminders).where(isNull(reminders.deletedAt)).orderBy(reminders.scheduledAt).all();
  return rows.map(toReminder);
}
export async function findReminder(id: string) {
  const row = await db.select().from(reminders).where(eq(reminders.id, id)).get();
  return row ? toReminder(row) : undefined;
}
export async function createReminder(input: { title: string; description?: string | null; scheduledAt: string; repeatRule?: RepeatRule }) {
  const now = nowIso();
  const item = {
    id: newId(),
    title: input.title.trim(),
    description: input.description ?? null,
    scheduledAt: input.scheduledAt,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    repeatRule: ruleToDb(input.repeatRule ?? null),
    enabled: true,
    completedAt: null,
    snoozedUntil: null,
    notificationId: null,
    notificationStatus: 'not_scheduled',
    relatedItemId: null,
    relatedItemType: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.insert(reminders).values(item).run();
  return toReminder(item as typeof reminders.$inferSelect);
}
export async function updateReminder(
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    scheduledAt: string;
    enabled: boolean;
    completedAt: string | null;
    repeatRule: RepeatRule;
    notificationId: string | null;
    notificationStatus: Reminder['notificationStatus'];
    snoozedUntil: string | null;
  }>,
) {
  const data: Record<string, unknown> = { ...input, updatedAt: nowIso() };
  if (input.repeatRule !== undefined) data.repeatRule = ruleToDb(input.repeatRule);
  await db
    .update(reminders)
    .set(data as never)
    .where(eq(reminders.id, id))
    .run();
  return findReminder(id);
}
export async function completeReminder(id: string) {
  await db.update(reminders).set({ completedAt: nowIso(), enabled: false, updatedAt: nowIso() }).where(eq(reminders.id, id)).run();
  return findReminder(id);
}
export async function trashReminder(id: string) {
  await db.update(reminders).set({ deletedAt: nowIso(), enabled: false, updatedAt: nowIso() }).where(eq(reminders.id, id)).run();
}

export async function listSpaces(): Promise<Space[]> {
  return (await db
    .select()
    .from(spaces)
    .where(and(isNull(spaces.deletedAt), isNull(spaces.archivedAt)))
    .orderBy(spaces.name)
    .all()) as Space[];
}
export async function findSpace(id: string) {
  return (await db.select().from(spaces).where(eq(spaces.id, id)).get()) as Space | undefined;
}
export async function createSpace(name: string, icon = 'folder') {
  const now = nowIso();
  const item = { id: newId(), name: name.trim(), icon, createdAt: now, updatedAt: now, archivedAt: null, deletedAt: null };
  await db.insert(spaces).values(item).run();
  return item as Space;
}
export async function updateSpace(id: string, name: string, icon?: string | null) {
  await db.update(spaces).set({ name: name.trim(), icon, updatedAt: nowIso() }).where(eq(spaces.id, id)).run();
  return findSpace(id);
}
export async function trashSpace(id: string) {
  await db.update(spaces).set({ deletedAt: nowIso(), updatedAt: nowIso() }).where(eq(spaces.id, id)).run();
}

export type TrashEntry = { id: string; type: 'note' | 'task' | 'reminder' | 'space' | 'inbox'; title: string; deletedAt: string };

export async function listTrash(): Promise<TrashEntry[]> {
  const [noteRows, taskRows, reminderRows, spaceRows, inboxRows] = await Promise.all([
    db.select({ id: notes.id, deletedAt: notes.deletedAt, title: notes.title }).from(notes).where(isNotNull(notes.deletedAt)).all(),
    db.select({ id: tasks.id, deletedAt: tasks.deletedAt, title: tasks.title }).from(tasks).where(isNotNull(tasks.deletedAt)).all(),
    db
      .select({ id: reminders.id, deletedAt: reminders.deletedAt, title: reminders.title })
      .from(reminders)
      .where(isNotNull(reminders.deletedAt))
      .all(),
    db.select({ id: spaces.id, deletedAt: spaces.deletedAt, title: spaces.name }).from(spaces).where(isNotNull(spaces.deletedAt)).all(),
    db
      .select({ id: inboxItems.id, deletedAt: inboxItems.deletedAt, title: inboxItems.rawText })
      .from(inboxItems)
      .where(isNotNull(inboxItems.deletedAt))
      .all(),
  ]);
  return [
    ...noteRows.map((row) => ({
      ...row,
      type: 'note' as const,
      title: row.title || 'Nota sem título',
      deletedAt: row.deletedAt as string,
    })),
    ...taskRows.map((row) => ({ ...row, type: 'task' as const, title: row.title, deletedAt: row.deletedAt as string })),
    ...reminderRows.map((row) => ({ ...row, type: 'reminder' as const, title: row.title, deletedAt: row.deletedAt as string })),
    ...spaceRows.map((row) => ({ ...row, type: 'space' as const, title: row.title, deletedAt: row.deletedAt as string })),
    ...inboxRows.map((row) => ({
      ...row,
      type: 'inbox' as const,
      title: row.title || 'Captura rápida',
      deletedAt: row.deletedAt as string,
    })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function restoreTrashItem(item: TrashEntry) {
  const updatedAt = nowIso();
  if (item.type === 'note') await db.update(notes).set({ deletedAt: null, archivedAt: null, updatedAt }).where(eq(notes.id, item.id)).run();
  if (item.type === 'task') await db.update(tasks).set({ deletedAt: null, archivedAt: null, updatedAt }).where(eq(tasks.id, item.id)).run();
  if (item.type === 'reminder') await db.update(reminders).set({ deletedAt: null, updatedAt }).where(eq(reminders.id, item.id)).run();
  if (item.type === 'space')
    await db.update(spaces).set({ deletedAt: null, archivedAt: null, updatedAt }).where(eq(spaces.id, item.id)).run();
  if (item.type === 'inbox') await db.update(inboxItems).set({ deletedAt: null }).where(eq(inboxItems.id, item.id)).run();
}

export async function createTag(name: string) {
  const normalized = name.trim().replace(/^#/, '').toLowerCase();
  const existing = await db.select().from(tags).where(eq(tags.name, normalized)).get();
  if (existing) return existing;
  const now = nowIso();
  const tag = { id: newId(), name: normalized, createdAt: now, updatedAt: now };
  await db.insert(tags).values(tag).run();
  return tag;
}

export async function listTags(): Promise<Tag[]> {
  return (await db.select().from(tags).orderBy(tags.name).all()) as Tag[];
}

export async function listTagsForItem(itemId: string, itemType: 'note' | 'task' | 'reminder'): Promise<Tag[]> {
  const rows = await db
    .select({ id: tags.id, name: tags.name, createdAt: tags.createdAt, updatedAt: tags.updatedAt })
    .from(itemTags)
    .innerJoin(tags, eq(itemTags.tagId, tags.id))
    .where(and(eq(itemTags.itemId, itemId), eq(itemTags.itemType, itemType)))
    .orderBy(tags.name)
    .all();
  return rows as Tag[];
}

export async function addTagToItem(itemId: string, itemType: 'note' | 'task' | 'reminder', tagName: string) {
  const tag = await createTag(tagName);
  await db.insert(itemTags).values({ id: newId(), itemId, itemType, tagId: tag.id }).onConflictDoNothing().run();
  return tag;
}

export async function removeTagFromItem(itemId: string, itemType: 'note' | 'task' | 'reminder', tagId: string) {
  await db
    .delete(itemTags)
    .where(and(eq(itemTags.itemId, itemId), eq(itemTags.itemType, itemType), eq(itemTags.tagId, tagId)))
    .run();
}

export async function createAttachment(input: {
  itemId: string;
  itemType: ItemType;
  type: Attachment['type'];
  localPath: string;
  originalName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  thumbnailPath?: string | null;
  durationMs?: number | null;
}) {
  const item = {
    id: newId(),
    itemId: input.itemId,
    itemType: input.itemType,
    type: input.type,
    originalName: input.originalName ?? null,
    localPath: input.localPath,
    mimeType: input.mimeType ?? null,
    sizeBytes: input.sizeBytes ?? null,
    thumbnailPath: input.thumbnailPath ?? null,
    durationMs: input.durationMs ?? null,
    createdAt: nowIso(),
    deletedAt: null,
  };
  await db.insert(attachments).values(item).run();
  return item as Attachment;
}

export async function listAttachments(itemId: string): Promise<Attachment[]> {
  return (await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.itemId, itemId), isNull(attachments.deletedAt)))
    .orderBy(desc(attachments.createdAt))
    .all()) as Attachment[];
}

export async function findAttachment(id: string): Promise<Attachment | undefined> {
  return (await db.select().from(attachments).where(eq(attachments.id, id)).get()) as Attachment | undefined;
}

export async function trashAttachment(id: string) {
  await db.update(attachments).set({ deletedAt: nowIso() }).where(eq(attachments.id, id)).run();
}

export async function createInboxCapture(
  rawText: string,
  itemType: 'quick_capture' | 'task' | 'reminder' | 'file' | 'image' | 'audio' = 'quick_capture',
) {
  const now = nowIso();
  const item = { id: newId(), itemId: newId(), itemType, rawText: rawText.trim(), createdAt: now, organizedAt: null, deletedAt: null };
  await db.insert(inboxItems).values(item).run();
  return item as InboxItem;
}
export async function listInbox(): Promise<InboxItem[]> {
  return (await db
    .select()
    .from(inboxItems)
    .where(and(isNull(inboxItems.organizedAt), isNull(inboxItems.deletedAt)))
    .orderBy(desc(inboxItems.createdAt))
    .all()) as InboxItem[];
}
export async function organizeInbox(id: string) {
  await db.update(inboxItems).set({ organizedAt: nowIso() }).where(eq(inboxItems.id, id)).run();
}
export async function restoreInbox(id: string) {
  await db.update(inboxItems).set({ deletedAt: null, organizedAt: null }).where(eq(inboxItems.id, id)).run();
}
export async function deleteInbox(id: string) {
  await db.update(inboxItems).set({ deletedAt: nowIso() }).where(eq(inboxItems.id, id)).run();
}

export async function searchAll(query: string): Promise<UnifiedItem[]> {
  const q = `%${query.trim()}%`;
  if (!query.trim()) return [];
  const [noteRows, taskRows, reminderRows, inboxRows] = await Promise.all([
    db
      .select()
      .from(notes)
      .where(and(isNull(notes.deletedAt), or(like(notes.title, q), like(notes.content, q))))
      .all(),
    db
      .select()
      .from(tasks)
      .where(and(isNull(tasks.deletedAt), like(tasks.title, q)))
      .all(),
    db
      .select()
      .from(reminders)
      .where(and(isNull(reminders.deletedAt), like(reminders.title, q)))
      .all(),
    db
      .select()
      .from(inboxItems)
      .where(and(isNull(inboxItems.deletedAt), like(inboxItems.rawText, q)))
      .all(),
  ]);
  return [
    ...noteRows.map((n) => ({
      id: n.id,
      type: 'note' as const,
      title: n.title || 'Nota sem título',
      subtitle: 'Nota',
      date: n.updatedAt,
      spaceName: null,
      pinned: n.pinned,
      source: n as unknown as Note,
    })),
    ...taskRows.map((t) => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      subtitle: 'Tarefa',
      date: t.dueAt,
      spaceName: null,
      pinned: false,
      source: toTask(t),
    })),
    ...reminderRows.map((r) => ({
      id: r.id,
      type: 'reminder' as const,
      title: r.title,
      subtitle: 'Lembrete',
      date: r.scheduledAt,
      spaceName: null,
      pinned: false,
      source: toReminder(r),
    })),
    ...inboxRows.map((i) => ({
      id: i.id,
      type: i.itemType as InboxItem['itemType'],
      title: i.rawText || 'Captura rápida',
      subtitle: 'Caixa de entrada',
      date: i.createdAt,
      spaceName: null,
      pinned: false,
      source: i as unknown as InboxItem,
    })),
  ];
}

const defaultSpaces = [
  ['Pessoal', 'user'],
  ['Faculdade', 'book'],
  ['Trabalho', 'briefcase'],
  ['Projetos', 'layers'],
  ['Finanças', 'wallet'],
] as const;

let seedDefaultsPromise: Promise<void> | null = null;

export async function seedDefaults() {
  if (seedDefaultsPromise) return seedDefaultsPromise;

  seedDefaultsPromise = (async () => {
    const [seeded, normalized, existingSpaces] = await Promise.all([
      getSetting('seeded'),
      getSetting('seed_defaults_normalized'),
      listSpaces(),
    ]);

    if (!seeded && existingSpaces.length === 0) {
      for (const [name, icon] of defaultSpaces) await createSpace(name, icon);
    }

    if (!normalized) {
      const currentSpaces = await listSpaces();
      const seen = new Set<string>();
      for (const space of [...currentSpaces].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        if (!defaultSpaces.some(([name]) => name === space.name)) continue;
        if (seen.has(space.name)) await trashSpace(space.id);
        else seen.add(space.name);
      }
      await setSetting('seed_defaults_normalized', 'true');
    }

    await setSetting('seeded', 'true');
  })();

  try {
    await seedDefaultsPromise;
  } finally {
    seedDefaultsPromise = null;
  }
}
