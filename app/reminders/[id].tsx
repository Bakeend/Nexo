import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, ListRow, PrimaryButton, SecondaryButton } from '@/components/ui';
import { ActionSheet, AppDialog } from '@/components/visual';
import { completeReminder, findReminder, trashReminder } from '@/database/repositories';
import { cancelReminder, createNextRecurringReminder, scheduleReminder, snoozeReminder } from '@/services/notification-service';
import type { Reminder } from '@/types/domain';

export default function ReminderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reminder, setReminder] = useState<Reminder>();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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
  const deleteReminder = async () => {
    setDeleteOpen(false);
    await cancelReminder(reminder);
    await trashReminder(reminder.id);
    router.back();
  };
  return (
    <View style={styles.root}>
      <Header title="Lembrete" onBack={() => router.back()} action={() => setActionsOpen(true)} />
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
      <ActionSheet
        visible={actionsOpen}
        title="Ações do lembrete"
        onClose={() => setActionsOpen(false)}
        options={[
          {
            label: 'Adiar 10 minutos',
            icon: 'time-outline',
            onPress: () => snoozeReminder(reminder, new Date(Date.now() + 10 * 60 * 1000)).then(load),
          },
          {
            label: 'Editar',
            icon: 'create-outline',
            onPress: () => router.push({ pathname: '/reminders/new', params: { id: reminder.id } }),
          },
          {
            label: 'Tags',
            icon: 'pricetags-outline',
            onPress: () => router.push({ pathname: '/tags', params: { itemId: reminder.id, itemType: 'reminder' } } as never),
          },
          {
            label: reminder.enabled ? 'Desativar' : 'Ativar',
            icon: reminder.enabled ? 'pause-circle-outline' : 'play-circle-outline',
            onPress: async () => {
              if (reminder.enabled) await cancelReminder(reminder);
              else await scheduleReminder(reminder);
              await load();
            },
          },
          { label: 'Excluir', icon: 'trash-outline', destructive: true, onPress: () => setDeleteOpen(true) },
        ]}
      />
      <AppDialog
        visible={deleteOpen}
        title="Excluir lembrete?"
        message="O lembrete será movido para a lixeira."
        confirmLabel="Excluir"
        destructive
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteReminder}
      />
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
