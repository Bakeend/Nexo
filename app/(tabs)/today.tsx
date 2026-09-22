import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { BottomNav, CaptureSheet, EmptyState, FloatingButton, Header, ListRow, SectionTitle } from '@/components/ui';
import { listReminders, listTasks } from '@/database/repositories';
import type { Reminder, Task } from '@/types/domain';
import { useUIStore } from '@/stores/ui.store';

export default function Today() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const open = useUIStore((s) => s.captureOpen);
  const setOpen = useUIStore((s) => s.setCaptureOpen);
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
  return (
    <View style={styles.root}>
      <Header
        title="Hoje"
        subtitle={new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
      />
      <View style={styles.content}>
        <View style={styles.stats}>
          {[
            ['checkmark-circle-outline', tasks.length, 'Tarefas'],
            ['notifications-outline', reminders.length, 'Lembretes'],
            ['calendar-outline', tasks.length + reminders.length, 'Eventos'],
          ].map(([icon, value, label]) => (
            <View key={String(label)} style={styles.stat}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
        <SectionTitle title="Próximo" />
        {tasks[0] ? (
          <ListRow
            icon="radio-button-on-outline"
            title={tasks[0].title}
            subtitle={
              tasks[0].dueAt ? new Date(tasks[0].dueAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Sem horário'
            }
            onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: tasks[0].id } })}
          />
        ) : (
          <Text style={styles.muted}>Nada agendado por enquanto.</Text>
        )}
        <SectionTitle title="Minhas tarefas" />
        {loading ? (
          <Text style={styles.muted}>Carregando…</Text>
        ) : tasks.length ? (
          tasks.map((task) => (
            <ListRow
              key={task.id}
              icon="ellipse-outline"
              title={task.title}
              subtitle={task.dueAt ? new Date(task.dueAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined}
              onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
            />
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
            <SectionTitle title="Lembretes" />
            {reminders.map((item) => (
              <ListRow
                key={item.id}
                icon="notifications-outline"
                title={item.title}
                subtitle={new Date(item.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: item.id } })}
              />
            ))}
          </>
        ) : null}
      </View>
      <BottomNav />
      <FloatingButton onPress={() => setOpen(true)} />
      <CaptureSheet visible={open} onClose={() => setOpen(false)} onCreated={load} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.lg, paddingBottom: 100 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md },
  statValue: { ...typography.title, color: colors.ink },
  statLabel: { ...typography.meta, color: colors.inkMuted, marginTop: 3 },
  muted: { ...typography.body, color: colors.inkMuted },
});
