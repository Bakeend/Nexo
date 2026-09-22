import { calculateNextOccurrence } from '@/utils/dates';

describe('calculateNextOccurrence', () => {
  it('calculates daily recurrence', () => {
    expect(calculateNextOccurrence('2026-09-21T18:00:00.000Z', { type: 'daily', interval: 1 })).toBe('2026-09-22T18:00:00.000Z');
  });

  it('returns null for one-off reminders', () => {
    expect(calculateNextOccurrence('2026-09-21T18:00:00.000Z', null)).toBeNull();
  });

  it('moves to the next selected weekday', () => {
    expect(calculateNextOccurrence('2026-09-21T18:00:00.000Z', { type: 'weekly', interval: 1, daysOfWeek: [1, 3] })).toBe(
      '2026-09-23T18:00:00.000Z',
    );
  });
});
