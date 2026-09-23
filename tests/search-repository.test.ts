import { getTableName, type SQL, type Table } from 'drizzle-orm';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { db } from '@/database/database';
import { searchAll } from '@/database/repositories';

jest.mock('@/database/database', () => ({ db: { select: jest.fn() } }));

type CapturedJoin = { tableName: string; on: SQL | undefined };
type CapturedQuery = {
  tableName: string;
  joins: CapturedJoin[];
  where: SQL | undefined;
};

const mockedDb = db as unknown as { select: jest.Mock };
const dialect = new SQLiteSyncDialect();
const capturedQueries: CapturedQuery[] = [];

const at = '2026-09-23T12:00:00.000Z';
const note = {
  id: 'note-1',
  title: 'Meeting notes',
  content: 'A note body',
  contentFormat: 'blocks-v1' as const,
  spaceId: 'space-1',
  pinned: true,
  archivedAt: null,
  deletedAt: null,
  createdAt: at,
  updatedAt: at,
};
const task = {
  id: 'task-1',
  title: 'Prepare review',
  description: 'Searchable task description',
  dueAt: at,
  timezone: 'UTC',
  priority: 'high',
  completedAt: null,
  repeatRule: null,
  parentSeriesId: null,
  spaceId: 'space-1',
  relatedNoteId: null,
  createdAt: at,
  updatedAt: at,
  archivedAt: null,
  deletedAt: null,
};
const reminder = {
  id: 'reminder-1',
  title: 'Follow up',
  description: 'Searchable reminder description',
  scheduledAt: at,
  timezone: 'UTC',
  repeatRule: null,
  enabled: true,
  completedAt: null,
  snoozedUntil: null,
  notificationId: null,
  notificationStatus: 'not_scheduled',
  relatedItemId: null,
  relatedItemType: null,
  createdAt: at,
  updatedAt: at,
  deletedAt: null,
};
const inbox = {
  id: 'inbox-1',
  itemId: 'inbox-item-1',
  itemType: 'quick_capture',
  rawText: 'Inbox capture',
  createdAt: at,
  organizedAt: null,
  deletedAt: null,
};

const rowsByTable: Record<string, unknown[]> = {
  notes: [
    { item: note, spaceName: 'Research' },
    { item: note, spaceName: 'Research' },
  ],
  tasks: [
    { item: task, spaceName: 'Research' },
    { item: task, spaceName: 'Research' },
  ],
  reminders: [{ item: reminder }, { item: reminder }],
  inbox_items: [inbox],
};

function compile(expression: SQL | undefined): string {
  return expression ? dialect.sqlToQuery(expression).sql.replace(/"/g, '').replace(/\s+/g, ' ').toLowerCase() : '';
}

describe('searchAll repository query', () => {
  beforeEach(() => {
    capturedQueries.length = 0;
    mockedDb.select.mockReset();
    mockedDb.select.mockImplementation(() => ({
      from(table: Table) {
        const query: CapturedQuery = { tableName: getTableName(table), joins: [], where: undefined };
        capturedQueries.push(query);

        const builder = {
          leftJoin(joinedTable: Table, on: SQL | undefined) {
            query.joins.push({ tableName: getTableName(joinedTable), on });
            return builder;
          },
          where(expression: SQL | undefined) {
            query.where = expression;
            return builder;
          },
          all: async () => rowsByTable[query.tableName] ?? [],
        };
        return builder;
      },
    }));
  });

  it('searches descriptions, tags and active spaces, filters deleted records, and deduplicates mapped results', async () => {
    const results = await searchAll('review');

    const queryFor = (name: string) => capturedQueries.find((query) => query.tableName === name)!;
    const notesQuery = queryFor('notes');
    const tasksQuery = queryFor('tasks');
    const remindersQuery = queryFor('reminders');
    const inboxQuery = queryFor('inbox_items');

    expect(compile(notesQuery.where)).toContain('notes.deleted_at is null');
    expect(compile(notesQuery.where)).toContain('notes.content like ?');
    expect(compile(notesQuery.where)).toContain('tags.name like ?');
    expect(compile(notesQuery.where)).toContain('spaces.name like ?');
    expect(compile(tasksQuery.where)).toContain('tasks.deleted_at is null');
    expect(compile(tasksQuery.where)).toContain('tasks.description like ?');
    expect(compile(tasksQuery.where)).toContain('tags.name like ?');
    expect(compile(tasksQuery.where)).toContain('spaces.name like ?');
    expect(compile(remindersQuery.where)).toContain('reminders.deleted_at is null');
    expect(compile(remindersQuery.where)).toContain('reminders.description like ?');
    expect(compile(remindersQuery.where)).toContain('tags.name like ?');
    expect(compile(inboxQuery.where)).toContain('inbox_items.deleted_at is null');
    expect(compile(inboxQuery.where)).toContain('inbox_items.raw_text like ?');

    for (const query of [notesQuery, tasksQuery]) {
      const spaceJoin = query.joins.find((join) => join.tableName === 'spaces');
      expect(compile(spaceJoin?.on)).toContain('spaces.deleted_at is null');
      expect(compile(spaceJoin?.on)).toContain(`${query.tableName}.space_id`);
    }
    for (const [query, itemType] of [
      [notesQuery, 'note'],
      [tasksQuery, 'task'],
      [remindersQuery, 'reminder'],
    ] as const) {
      const itemTagsJoin = query.joins.find((join) => join.tableName === 'item_tags');
      const tagsJoin = query.joins.find((join) => join.tableName === 'tags');
      expect(itemTagsJoin).toBeDefined();
      expect(compile(itemTagsJoin?.on)).toContain('item_tags.item_type = ?');
      expect(itemTagsJoin?.on && dialect.sqlToQuery(itemTagsJoin.on).params).toContain(itemType);
      expect(compile(tagsJoin?.on)).toContain('tags.id = item_tags.tag_id');
    }

    expect(results.map((item) => `${item.type}:${item.id}`)).toEqual([
      'note:note-1',
      'task:task-1',
      'reminder:reminder-1',
      'quick_capture:inbox-1',
    ]);
    expect(results.find((item) => item.type === 'note')).toMatchObject({ spaceName: 'Research', source: note });
    expect(results.find((item) => item.type === 'task')).toMatchObject({ spaceName: 'Research', source: task });
    expect(results.find((item) => item.type === 'reminder')).toMatchObject({ spaceName: null, source: reminder });
    expect(results.find((item) => item.id === inbox.id)).toMatchObject({ source: inbox });
    expect(results.filter((item) => item.id === 'note-1')).toHaveLength(1);
    expect(results.filter((item) => item.id === 'task-1')).toHaveLength(1);
    expect(results.filter((item) => item.id === 'reminder-1')).toHaveLength(1);
  });
});
