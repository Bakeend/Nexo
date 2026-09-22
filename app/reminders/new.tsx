import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/design/theme';
import { ActionSheet, DateTimeSheet } from '@/components/visual';
import { Header, Input, PrimaryButton } from '@/components/ui';
import { createReminder, findReminder, updateReminder } from '@/database/repositories';
import { cancelReminder, scheduleReminder } from '@/services/notification-service';
import type { RepeatRule } from '@/types/domain';

type PickerMode = 'date' | 'time' | null;

function dateLabel(value: Date) {
  const text = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function timeLabel(value: Date) {
  return value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function NewReminder() {
  const params = useLocalSearchParams<{ id?: string; seed?: string }>();
  const [title, setTitle] = useState(params.seed || '');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [picker, setPicker] = useState<PickerMode>(null);
  const [repeat, setRepeat] = useState('Nunca');
  const [repeatOpen, setRepeatOpen] = useState(false);
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
        title: title.trim(),
        description: description.trim() || null,
        scheduledAt: date.toISOString(),
        repeatRule,
        enabled: true,
        completedAt: null,
        notificationId: null,
        notificationStatus: 'not_scheduled',
        snoozedUntil: null,
      });
    } else {
      reminder = await createReminder({
        title: title.trim(),
        description: description.trim() || null,
        scheduledAt: date.toISOString(),
        repeatRule,
      });
    }
    if (!reminder) return;
    await scheduleReminder(reminder);
    router.replace({ pathname: '/reminders/[id]', params: { id: reminder.id } });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header title={existingId ? 'Editar lembrete' : 'Novo lembrete'} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.titleField}>
            <Input value={title} onChangeText={setTitle} placeholder="O que você quer lembrar?" autoFocus style={styles.titleInput} />
          </View>

          <View style={styles.options}>
            <ReminderField icon="calendar-outline" label="Data" value={dateLabel(date)} onPress={() => setPicker('date')} />
            <ReminderField icon="time-outline" label="Horário" value={timeLabel(date)} onPress={() => setPicker('time')} />
            <ReminderField icon="repeat-outline" label="Repetir" value={repeat} onPress={() => setRepeatOpen(true)} />
          </View>

          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Adicionar uma descrição (opcional)"
            multiline
            style={styles.description}
          />
        </ScrollView>

        <View style={styles.bottom}>
          <PrimaryButton title={existingId ? 'Salvar lembrete' : 'Criar lembrete'} onPress={save} disabled={!title.trim()} />
        </View>

        <DateTimeSheet
          visible={Boolean(picker)}
          title={picker === 'time' ? 'Escolher horário' : 'Escolher data'}
          value={date}
          onClose={() => setPicker(null)}
          onConfirm={(next) => {
            setDate(next);
            setPicker(null);
          }}
        />
        <ActionSheet
          visible={repeatOpen}
          title="Repetir lembrete"
          onClose={() => setRepeatOpen(false)}
          options={['Nunca', 'Diário', 'Semanal'].map((value) => ({
            label: value,
            icon: value === repeat ? 'checkmark-circle-outline' : 'ellipse-outline',
            onPress: () => setRepeat(value),
          }))}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReminderField({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
    >
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={18} color={colors.inkSoft} />
      </View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
      <Ionicons name="chevron-forward" size={17} color={colors.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.lg, gap: spacing.xl },
  titleField: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  titleInput: {
    minHeight: 54,
    backgroundColor: 'transparent',
    fontSize: 16,
    fontWeight: '600',
  },
  options: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  field: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  fieldPressed: { backgroundColor: colors.surfacePressed },
  fieldIcon: { width: 28, alignItems: 'center' },
  fieldLabel: { ...typography.body, color: colors.ink, flex: 1 },
  fieldValue: { ...typography.caption, color: colors.inkSoft },
  description: { minHeight: 100, backgroundColor: colors.surfaceMuted },
  bottom: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
});
