import { addDays, nextFriday, nextMonday } from 'date-fns';
import type { ItemType } from '@/types/domain';

export type CaptureSuggestion = { title: string; type: Extract<ItemType, 'task' | 'reminder'>; scheduledAt: string | null };

export function parseCapture(raw: string): CaptureSuggestion | null {
  const value = raw.trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  const explicitReminder = /me lembrar|lembrete|lembrar/.test(lower);
  const hasAction =
    /^(comprar|estudar|terminar|entregar|ligar|responder|revisar|fazer|enviar|pagar|marcar|lembrar)/i.test(value) || explicitReminder;
  if (!hasAction) return null;
  let date = new Date();
  if (lower.includes('amanhã') || lower.includes('amanha')) date = addDays(date, 1);
  else if (lower.includes('sexta')) date = nextFriday(date);
  else if (lower.includes('segunda')) date = nextMonday(date);
  else if (lower.includes('hoje')) date = date;
  else date = addDays(date, 1);
  const timeMatch = lower.match(/(?:às|as|at)\s*(\d{1,2})(?::(\d{2}))?/);
  date.setHours(timeMatch ? Number(timeMatch[1]) : 9, timeMatch?.[2] ? Number(timeMatch[2]) : 0, 0, 0);
  const title = value
    .replace(/me lembrar de\s*/i, '')
    .replace(/amanhã|amanha|sexta-feira|sexta|segunda-feira|segunda|hoje/gi, '')
    .replace(/\s*(às|as|at)\s*\d{1,2}(?::\d{2})?/i, '')
    .trim()
    .replace(/[,.]$/, '');
  return { title: title || value, type: explicitReminder ? 'reminder' : 'task', scheduledAt: date.toISOString() };
}
