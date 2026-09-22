import { Ionicons } from '@expo/vector-icons';
import { addDays, addMonths, format, isSameDay, startOfWeek, subMonths } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaptureSheet } from '@/components/ui';
import { colors, shadow, spacing, typography } from '@/design/theme';
import { listReminders, listTasks } from '@/database/repositories';
import type { Reminder, Task } from '@/types/domain';

export default function Calendar() {
  const [selected, setSelected] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [captureOpen, setCaptureOpen] = useState(false);

  useEffect(() => {
    listTasks('all').then(setTasks);
    listReminders().then(setReminders);
  }, []);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selected, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selected]);

  const items = useMemo(
    () =>
      [
        ...tasks.filter((task) => task.dueAt && isSameDay(new Date(task.dueAt), selected)),
        ...reminders.filter((reminder) => isSameDay(new Date(reminder.scheduledAt), selected)),
      ].sort(
        (a, b) =>
          new Date(('dueAt' in a ? a.dueAt : a.scheduledAt) || 0).getTime() -
          new Date(('dueAt' in b ? b.dueAt : b.scheduledAt) || 0).getTime(),
      ),
    [reminders, selected, tasks],
  );

  const moveMonth = (amount: number) => {
    setSelected((current) => (amount > 0 ? addMonths(current, amount) : subMonths(current, Math.abs(amount))));
  };

  const selectedDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric' }).format(selected);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} hitSlop={10} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={21} color={colors.ink} />
          </Pressable>
          <Text style={styles.month}>{format(selected, 'MMMM')}</Text>
        </View>
        <View style={styles.monthControls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => moveMonth(-1)} hitSlop={10} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={19} color={colors.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => moveMonth(1)} hitSlop={10} style={styles.headerButton}>
            <Ionicons name="chevron-forward" size={19} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <View style={styles.week}>
        {weekDays.map((day, index) => {
            const has =
              tasks.some((task) => task.dueAt && isSameDay(new Date(task.dueAt), day)) ||
              reminders.some((reminder) => isSameDay(new Date(reminder.scheduledAt), day));
            const active = isSameDay(day, selected);
            return (
              <Pressable
                key={day.toISOString()}
                accessibilityRole="button"
                accessibilityLabel={`Selecionar ${format(day, 'd MMMM')}`}
                onPress={() => setSelected(day)}
                style={styles.day}
              >
                <Text style={styles.weekLabel}>{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][index]}</Text>
                <View style={[styles.dayNumberWrap, active && styles.dayActive]}>
                  <Text style={[styles.dayText, active && styles.dayTextActive]}>{day.getDate()}</Text>
                </View>
                <View style={styles.dotSlot}>{has ? <View style={[styles.dot, active && styles.dotActive]} /> : null}</View>
              </Pressable>
            );
          })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.selectedDate}>{selectedDate}</Text>
        {items.length ? (
          items.map((item) => {
            const date = new Date(('dueAt' in item ? item.dueAt : item.scheduledAt) || '');
            const isTask = 'dueAt' in item;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: isTask ? '/tasks/[id]' : '/reminders/[id]', params: { id: item.id } } as never)}
                style={({ pressed }) => [styles.timelineRow, pressed && styles.rowPressed]}
              >
                <Text style={styles.time}>
                  {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View style={[styles.timelineBar, { backgroundColor: isTask ? colors.accent : colors.success }]} />
                <Text style={styles.timelineTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.muted}>Nenhum item nesta data.</Text>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Criar"
        onPress={() => setCaptureOpen(true)}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={27} color={colors.accent} />
      </Pressable>
      <CaptureSheet visible={captureOpen} onClose={() => setCaptureOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  monthControls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  month: { ...typography.heading, color: colors.ink, textTransform: 'capitalize' },
  week: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  weekLabel: { ...typography.meta, color: colors.inkMuted, textAlign: 'center', marginBottom: 5 },
  day: { width: '14.285%', alignItems: 'center' },
  dayNumberWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayActive: { backgroundColor: colors.accent },
  dayText: { ...typography.caption, color: colors.ink, fontWeight: '700' },
  dayTextActive: { color: colors.white, fontWeight: '700' },
  dotSlot: { height: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
  dotActive: { backgroundColor: colors.white },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  selectedDate: {
    ...typography.bodyStrong,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    textTransform: 'capitalize',
  },
  timelineRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingRight: spacing.sm,
  },
  rowPressed: { backgroundColor: colors.surfacePressed },
  time: { ...typography.caption, color: colors.inkSoft, width: 58 },
  timelineBar: { width: 2, alignSelf: 'stretch', marginVertical: 6, borderRadius: 2 },
  timelineTitle: { ...typography.body, color: colors.ink, flex: 1, paddingLeft: spacing.md },
  muted: { ...typography.body, color: colors.inkMuted, paddingVertical: spacing.xl },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadow,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
});
