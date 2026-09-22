import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, subMonths } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CaptureSheet, FloatingButton, Header, ListRow } from '@/components/ui';
import { colors, spacing, typography } from '@/design/theme';
import { listReminders, listTasks } from '@/database/repositories';
import type { Reminder, Task } from '@/types/domain';

export default function Calendar() {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [captureOpen, setCaptureOpen] = useState(false);

  useEffect(() => {
    listTasks('all').then(setTasks);
    listReminders().then(setReminders);
  }, []);

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month]);
  const items = [
    ...tasks.filter((task) => task.dueAt && isSameDay(new Date(task.dueAt), selected)),
    ...reminders.filter((reminder) => isSameDay(new Date(reminder.scheduledAt), selected)),
  ].sort(
    (a, b) =>
      new Date(('dueAt' in a ? a.dueAt : a.scheduledAt) || 0).getTime() - new Date(('dueAt' in b ? b.dueAt : b.scheduledAt) || 0).getTime(),
  );

  const moveMonth = (amount: number) => {
    const next = amount > 0 ? addMonths(month, amount) : subMonths(month, Math.abs(amount));
    setMonth(next);
    setSelected(startOfMonth(next));
  };

  return (
    <View style={styles.root}>
      <Header title={format(month, 'MMMM yyyy')} onBack={() => router.back()} />
      <View style={styles.controls}>
        <Pressable accessibilityLabel="Mês anterior" onPress={() => moveMonth(-1)} style={styles.arrowButton}>
          <Text style={styles.arrow}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{format(month, 'MMMM')}</Text>
        <Pressable accessibilityLabel="Próximo mês" onPress={() => moveMonth(1)} style={styles.arrowButton}>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.week}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
            <Text key={`${day}-${index}`} style={styles.weekLabel}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {Array.from({ length: days[0]?.getDay() || 0 }).map((_, index) => (
            <View key={`empty-${index}`} style={styles.day} />
          ))}
          {days.map((day) => {
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
                style={[styles.day, active && styles.dayActive]}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{day.getDate()}</Text>
                {has ? <View style={[styles.dot, active && styles.dotActive]} /> : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.selectedDate}>
          {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(selected)}
        </Text>
        {items.length ? (
          items.map((item) => (
            <ListRow
              key={item.id}
              icon={'dueAt' in item ? 'checkmark-circle-outline' : 'notifications-outline'}
              title={item.title}
              subtitle={new Date(('dueAt' in item ? item.dueAt : item.scheduledAt) || '').toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              onPress={() =>
                router.push({ pathname: 'dueAt' in item ? '/tasks/[id]' : '/reminders/[id]', params: { id: item.id } } as never)
              }
            />
          ))
        ) : (
          <Text style={styles.muted}>Nenhum item nesta data.</Text>
        )}
      </ScrollView>
      <FloatingButton onPress={() => setCaptureOpen(true)} />
      <CaptureSheet visible={captureOpen} onClose={() => setCaptureOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 110 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  arrowButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 30, color: colors.ink },
  month: { ...typography.heading, color: colors.ink, textTransform: 'capitalize' },
  week: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.sm },
  weekLabel: { ...typography.meta, color: colors.inkMuted, width: '14.285%', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  dayActive: { backgroundColor: colors.accent },
  dayText: { ...typography.caption, color: colors.ink },
  dayTextActive: { color: colors.white, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent, marginTop: 3 },
  dotActive: { backgroundColor: colors.white },
  selectedDate: {
    ...typography.bodyStrong,
    color: colors.ink,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  muted: { ...typography.body, color: colors.inkMuted, paddingVertical: spacing.xl },
});
