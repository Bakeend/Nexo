import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, ListRow, PrimaryButton, SecondaryButton } from '@/components/ui';
import { completeReminder, findReminder, trashReminder } from '@/database/repositories';
import { cancelReminder, createNextRecurringReminder, scheduleReminder, snoozeReminder } from '@/services/notification-service';
import type { Reminder } from '@/types/domain';

export default function ReminderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reminder, setReminder] = useState<Reminder>();
  const load = useCallback(async () => {
    if (id) setReminder(await findReminder(id));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  if (!reminder)
    return (
      <View style={styles.root}>
        <Header title="Lembrete" onBack={() => router.back()} />
        <Text style={styles.muted}>Lembrete não encontrado.</Text>
      </View>
    );
  const finish = async () => {
    if (reminder.repeatRule) await createNextRecurringReminder(reminder);
    else await completeReminder(reminder.id);
    await load();
  };
  const menu = () =>
    Alert.alert('Ações do lembrete', undefined, [
      { text: 'Adiar 10 minutos', onPress: () => snoozeReminder(reminder, new Date(Date.now() + 10 * 60 * 1000)).then(load) },
      { text: 'Editar', onPress: () => router.push({ pathname: '/reminders/new', params: { id: reminder.id } }) },
      { text: 'Tags', onPress: () => router.push({ pathname: '/tags', params: { itemId: reminder.id, itemType: 'reminder' } } as never) },
      {
        text: reminder.enabled ? 'Desativar' : 'Ativar',
        onPress: async () => {
          if (reminder.enabled) await cancelReminder(reminder);
          else await scheduleReminder(reminder);
          load();
        },
      },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await cancelReminder(reminder);
          await trashReminder(reminder.id);
          router.back();
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  return (
    <View style={styles.root}>
      <Header title="Lembrete" onBack={() => router.back()} action={menu} />
      <View style={styles.content}>
        <Text style={styles.title}>{reminder.title}</Text>
        <Text style={styles.meta}>
          {reminder.completedAt ? 'Concluído' : reminder.enabled ? 'Ativo' : 'Desativado'} · {reminder.notificationStatus}
        </Text>
        <ListRow icon="calendar-outline" title="Quando" subtitle={new Date(reminder.scheduledAt).toLocaleString('pt-BR')} />
        <ListRow icon="repeat-outline" title="Repetição" subtitle={reminder.repeatRule?.type || 'Nunca'} />
        {reminder.description ? <Text style={styles.body}>{reminder.description}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton title={reminder.completedAt ? 'Concluído' : 'Concluir lembrete'} onPress={finish} />
          <SecondaryButton
            title="Adiar 10 minutos"
            onPress={() => snoozeReminder(reminder, new Date(Date.now() + 10 * 60 * 1000)).then(load)}
          />
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg },
  title: { ...typography.title, color: colors.ink },
  meta: { ...typography.body, color: colors.inkMuted, marginVertical: spacing.lg },
  body: { ...typography.body, color: colors.ink, marginVertical: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
  muted: { ...typography.body, color: colors.inkMuted, padding: spacing.lg },
});
