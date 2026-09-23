import { classifyTaskDueDate, matchesTaskDateFilter } from '@/features/tasks/task-date-filter';

describe('classifyTaskDueDate', () => {
  const now = new Date(2026, 8, 23, 12, 0, 0);
  const startOfToday = new Date(2026, 8, 23, 0, 0, 0, 0);
  const endOfToday = new Date(2026, 8, 23, 23, 59, 59, 999);
  const startOfTomorrow = new Date(2026, 8, 24, 0, 0, 0, 0);

  it('includes the start and end of the current local day in today', () => {
    expect(classifyTaskDueDate(startOfToday.toISOString(), now)).toBe('today');
    expect(classifyTaskDueDate(endOfToday.toISOString(), now)).toBe('today');
  });

  it('classifies times before today as overdue and tomorrow onward as upcoming', () => {
    expect(classifyTaskDueDate(new Date(startOfToday.getTime() - 1).toISOString(), now)).toBe('overdue');
    expect(classifyTaskDueDate(startOfTomorrow.toISOString(), now)).toBe('upcoming');
  });

  it('separates missing and invalid due dates', () => {
    expect(classifyTaskDueDate(null, now)).toBe('no-date');
    expect(classifyTaskDueDate('not-a-date', now)).toBe('invalid');
    expect(classifyTaskDueDate('', now)).toBe('invalid');
  });

  it('keeps invalid dates only in the unfiltered list', () => {
    expect(matchesTaskDateFilter('not-a-date', 'all', now)).toBe(true);
    expect(matchesTaskDateFilter('not-a-date', 'today', now)).toBe(false);
  });
});
