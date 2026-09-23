export type TaskListFilter = 'today' | 'overdue' | 'upcoming' | 'no-date' | 'all';
export type TaskDateCategory = Exclude<TaskListFilter, 'all'> | 'invalid';

/** Classifies timed tasks against the current time and the next local calendar-day boundary. Invalid dates remain uncategorized. */
export function classifyTaskDueDate(dueAt: string | null, now = new Date()): TaskDateCategory {
  if (dueAt === null) return 'no-date';

  const dueDate = new Date(dueAt);
  if (!Number.isFinite(dueDate.getTime()) || !Number.isFinite(now.getTime())) return 'invalid';

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (dueDate < startOfToday) return 'overdue';

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  if (dueDate < startOfTomorrow) return 'today';
  return 'upcoming';
}

export function matchesTaskDateFilter(dueAt: string | null, filter: TaskListFilter, now = new Date()): boolean {
  return filter === 'all' || classifyTaskDueDate(dueAt, now) === filter;
}
