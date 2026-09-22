import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/design/theme';
import { BottomNav, CaptureSheet, EmptyState, FloatingButton } from '@/components/ui';
import { listReminders, listTasks } from '@/database/repositories';
import type { Reminder, Task } from '@/types/domain';

export default function Today() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const [t, r] = await Promise.all([listTasks('today'), listReminders()]);
    setTasks(t.filter((x) => !x.completedAt));
    setReminders(r.filter((x) => !x.completedAt && new Date(x.scheduledAt).toDateString() === new Date().toDateString()));
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const formattedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  const nextTask = tasks[0];

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Hoje</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
        <View style={styles.stats}>
          {[
            [tasks.length, 'Tarefas'],
            [reminders.length, reminders.length === 1 ? 'Lembrete' : 'Lembretes'],
            [tasks.length + reminders.length, 'Eventos'],
          ].map(([value, label]) => (
            <View key={String(label)} style={styles.stat}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Próximo</Text>
        {nextTask ? (
          <Pressable
            onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: nextTask.id } })}
            style={({ pressed }) => [styles.nextRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="radio-button-on-outline" size={17} color={colors.accent} />
            <Text style={styles.nextTitle} numberOfLines={1}>
              {nextTask.title}
            </Text>
            <View style={styles.nextMeta}>
              <Ionicons name="arrow-forward" size={11} color={colors.inkMuted} />
              <Text style={styles.nextTime}>
                {nextTask.dueAt
                  ? new Date(nextTask.dueAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : 'Sem horário'}
              </Text>
            </View>
          </Pressable>
        ) : (
          <Text style={styles.emptyLine}>Nada agendado por enquanto.</Text>
        )}
        <Text style={styles.sectionTitle}>Minhas tarefas</Text>
        {loading ? (
          <Text style={styles.muted}>Carregando…</Text>
        ) : tasks.length ? (
          tasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
              style={({ pressed }) => [styles.taskRow, pressed && styles.rowPressed]}
            >
              <Ionicons name="ellipse-outline" size={18} color={colors.inkSoft} />
              <Text style={styles.taskTitle} numberOfLines={1}>
                {task.title}
              </Text>
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon="sunny-outline"
            title="Dia livre"
            description="Você não tem tarefas pendentes para hoje."
            action="Criar tarefa"
            onAction={() => router.push('/tasks/new')}
          />
        )}
        {reminders.length ? (
          <>
            <Text style={styles.sectionTitle}>Lembretes</Text>
            {reminders.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.taskRow, pressed && styles.rowPressed]}
              >
                <Ionicons name="notifications-outline" size={18} color={colors.inkSoft} />
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.reminderTime}>
                  {new Date(item.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
      <BottomNav />
      <FloatingButton onPress={() => setOpen(true)} />
      <CaptureSheet visible={open} onClose={() => setOpen(false)} onCreated={load} />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 112 },
  header: { marginBottom: spacing.md },
  title: { ...typography.heading, fontSize: 20, lineHeight: 25, color: colors.ink },
  date: { ...typography.caption, color: colors.inkMuted, marginTop: 1 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: {
    flex: 1,
    minHeight: 66,
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  statValue: { fontSize: 18, lineHeight: 22, fontWeight: '800', color: colors.ink },
  statLabel: { ...typography.meta, color: colors.inkMuted, marginTop: 3 },
  sectionTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.ink,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  nextRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  nextTitle: { flex: 1, ...typography.caption, fontWeight: '700', color: colors.ink },
  nextMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextTime: { ...typography.meta, color: colors.inkMuted },
  taskRow: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  taskTitle: { flex: 1, ...typography.caption, fontSize: 13, color: colors.ink },
  reminderTime: { ...typography.meta, color: colors.inkMuted },
  rowPressed: { backgroundColor: colors.surfacePressed },
  emptyLine: {
    ...typography.caption,
    color: colors.inkMuted,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  muted: { ...typography.body, color: colors.inkMuted },
});
