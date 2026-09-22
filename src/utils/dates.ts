import { addDays, addMonths, addWeeks, addYears, format, isSameDay, startOfDay } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { RepeatRule } from '@/types/domain';

export const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
export const dateLabel = (value: string | Date) => format(new Date(value), 'dd/MM/yyyy');
export const timeLabel = (value: string | Date) => format(new Date(value), 'HH:mm');
export const humanDate = (value: string | Date) => format(new Date(value), "EEEE, dd 'de' MMMM", { locale: undefined });
export const isToday = (value: string | Date) => isSameDay(new Date(value), new Date());
export const isoAt = (date: Date, time = '09:00') => {
  const [hour, minute] = time.split(':').map(Number);
  const local = new Date(date);
  local.setHours(hour || 0, minute || 0, 0, 0);
  return fromZonedTime(local, timezone).toISOString();
};
export const displayDateTime = (value: string) => formatInTimeZone(new Date(value), timezone, "dd/MM 'às' HH:mm");
export const startToday = () => startOfDay(new Date()).toISOString();

export const calculateNextOccurrence = (scheduledAt: string, rule: RepeatRule) => {
  if (!rule) return null;
  const date = new Date(scheduledAt);
  if (rule.type === 'daily') return addDays(date, rule.interval).toISOString();
  if (rule.type === 'weekly') {
    if (!rule.daysOfWeek.length) return addWeeks(date, rule.interval).toISOString();
    const days = [...new Set(rule.daysOfWeek)].sort((a, b) => a - b);
    if (rule.interval === 1) {
      for (let offset = 1; offset <= 7; offset += 1) {
        const next = addDays(date, offset);
        if (days.includes(next.getDay())) return next.toISOString();
      }
    }
    const base = addWeeks(date, rule.interval);
    const day = days.find((candidate) => candidate >= base.getDay()) ?? days[0];
    return addDays(base, (day - base.getDay() + 7) % 7).toISOString();
  }
  if (rule.type === 'monthly') return addMonths(date, rule.interval).toISOString();
  if (rule.type === 'yearly') return addYears(date, rule.interval).toISOString();
  return rule.unit === 'day'
    ? addDays(date, rule.interval).toISOString()
    : rule.unit === 'week'
      ? addWeeks(date, rule.interval).toISOString()
      : addMonths(date, rule.interval).toISOString();
};
