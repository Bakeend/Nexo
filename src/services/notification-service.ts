import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculateNextOccurrence } from '@/utils/dates';
import { findReminder, listReminders, updateReminder } from '@/database/repositories';
import type { Reminder } from '@/types/domain';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('nexo-reminders', {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function scheduleReminder(reminder: Reminder) {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      await updateReminder(reminder.id, { notificationStatus: 'permission_denied', notificationId: null });
      return { status: 'permission_denied' as const, notificationId: null };
    }
    if (reminder.notificationId) await Notifications.cancelScheduledNotificationAsync(reminder.notificationId).catch(() => undefined);
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.description || 'Lembrete do Nexo',
        data: { reminderId: reminder.id },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminder.snoozedUntil || reminder.scheduledAt),
        channelId: 'nexo-reminders',
      } as Notifications.NotificationTriggerInput,
    });
    await updateReminder(reminder.id, { notificationId, notificationStatus: 'scheduled' });
    return { status: 'scheduled' as const, notificationId };
  } catch {
    await updateReminder(reminder.id, { notificationStatus: 'error' });
    return { status: 'error' as const, notificationId: null };
  }
}

export async function cancelReminder(reminder: Reminder) {
  if (reminder.notificationId) await Notifications.cancelScheduledNotificationAsync(reminder.notificationId).catch(() => undefined);
  await updateReminder(reminder.id, { notificationId: null, notificationStatus: 'cancelled', enabled: false });
}

export async function snoozeReminder(reminder: Reminder, until: Date) {
  const next = { ...reminder, snoozedUntil: until.toISOString(), enabled: true };
  await updateReminder(reminder.id, { snoozedUntil: next.snoozedUntil });
  return scheduleReminder(next);
}

export async function reconcileReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const known = new Set(scheduled.map((item) => item.identifier));
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return { scheduledCount: scheduled.length, knownCount: known.size };
  const reminders = await listReminders();
  for (const reminder of reminders) {
    if (reminder.enabled && (!reminder.notificationId || !known.has(reminder.notificationId))) await scheduleReminder(reminder);
  }
  return { scheduledCount: scheduled.length, knownCount: known.size };
}

export async function createNextRecurringReminder(reminder: Reminder) {
  const next = calculateNextOccurrence(reminder.scheduledAt, reminder.repeatRule);
  if (!next) return null;
  const saved = await findReminder(reminder.id);
  if (!saved) return null;
  await updateReminder(saved.id, { scheduledAt: next, completedAt: null, enabled: true });
  return scheduleReminder({
    ...saved,
    scheduledAt: next,
    notificationId: null,
    notificationStatus: 'not_scheduled',
    completedAt: null,
    enabled: true,
  });
}
