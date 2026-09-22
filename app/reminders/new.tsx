import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, Input, PrimaryButton, Segmented } from '@/components/ui';
import { DateTimeSheet } from '@/components/visual';
import { createReminder, findReminder, updateReminder } from '@/database/repositories';
import { cancelReminder, scheduleReminder } from '@/services/notification-service';
import type { RepeatRule } from '@/types/domain';

export default function NewReminder() {
  const params = useLocalSearchParams<{ id?: string; seed?: string }>();
  const [title, setTitle] = useState(params.seed || '');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showDate, setShowDate] = useState(false);
  const [repeat, setRepeat] = useState('Nunca');
  const [existingId, setExistingId] = useState<string>();
  useEffect(() => {
    if (!params.id) return;
    findReminder(params.id).then((reminder) => {
      if (!reminder) return;
      setExistingId(reminder.id);
      setTitle(reminder.title);
      setDescription(reminder.description || '');
      setDate(new Date(reminder.scheduledAt));
      setRepeat(reminder.repeatRule?.type === 'daily' ? 'Diário' : reminder.repeatRule?.type === 'weekly' ? 'Semanal' : 'Nunca');
    });
  }, [params.id]);
  const repeatRule: RepeatRule =
    repeat === 'Diário'
      ? { type: 'daily', interval: 1 }
      : repeat === 'Semanal'
        ? { type: 'weekly', interval: 1, daysOfWeek: [date.getDay()] }
        : null;
  const save = async () => {
    if (!title.trim()) return;
    let reminder;
    if (existingId) {
      const current = await findReminder(existingId);
      if (current?.notificationId) await cancelReminder(current);
      reminder = await updateReminder(existingId, {
        title,
        description,
        scheduledAt: date.toISOString(),
        repeatRule,
        enabled: true,
        completedAt: null,
        notificationId: null,
        notificationStatus: 'not_scheduled',
        snoozedUntil: null,
      });
    } else {
      reminder = await createReminder({ title, description, scheduledAt: date.toISOString(), repeatRule });
    }
    if (!reminder) return;
    await scheduleReminder(reminder);
    router.replace({ pathname: '/reminders/[id]', params: { id: reminder.id } });
  };
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={existingId ? 'Editar lembrete' : 'Novo lembrete'} onBack={() => router.back()} />
      <View style={styles.content}>
        <Input value={title} onChangeText={setTitle} placeholder="Título do lembrete" autoFocus />
        <Pressable style={styles.field} onPress={() => setShowDate(true)}>
          <Text style={styles.fieldLabel}>Data e horário</Text>
          <Text style={styles.fieldValue}>{date.toLocaleString('pt-BR')}</Text>
        </Pressable>
        <DateTimeSheet visible={showDate} value={date} onClose={() => setShowDate(false)} onConfirm={setDate} />
        <Text style={styles.label}>Repetir</Text>
        <Segmented values={['Nunca', 'Diário', 'Semanal']} selected={repeat} onChange={setRepeat} />
        <Input value={description} onChangeText={setDescription} placeholder="Descrição opcional" multiline />
        <View style={styles.bottom}>
          <PrimaryButton title={existingId ? 'Salvar lembrete' : 'Criar lembrete'} onPress={save} disabled={!title.trim()} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  field: { minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, justifyContent: 'center' },
  fieldLabel: { ...typography.caption, color: colors.inkMuted },
  fieldValue: { ...typography.bodyStrong, color: colors.ink, marginTop: 4 },
  label: { ...typography.caption, color: colors.inkMuted, textTransform: 'uppercase', fontWeight: '700', marginTop: spacing.md },
  bottom: { marginTop: 'auto', paddingBottom: spacing.lg },
});
