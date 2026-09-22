import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/design/theme';
import { BottomNav, CaptureSheet, FloatingButton, IconButton, ListRow, SectionTitle } from '@/components/ui';
import { Checkbox, useSnackbar } from '@/components/visual';
import { listInbox, listNotes, listReminders, listTasks, toggleTask } from '@/database/repositories';
import type { Note, Reminder, Task } from '@/types/domain';

type AgendaItem = { id: string; title: string; date: string; kind: 'task' | 'reminder' };

function timeLabel(value: string | null) {
  return value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Sem horário';
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [captureOpen, setCaptureOpen] = useState(false);
  const { showSnackbar } = useSnackbar();

  const load = useCallback(async () => {
    const [todayTasks, allTasks, allReminders, recentNotes, inbox] = await Promise.all([
      listTasks('today'),
      listTasks('all'),
      listReminders(),
      listNotes(),
      listInbox(),
    ]);
    setTasks(todayTasks.length ? todayTasks : allTasks.filter((task) => !task.completedAt).slice(0, 5));
    setReminders(allReminders);
    setNotes(recentNotes);
    setInboxCount(inbox.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pendingTasks = tasks.filter((task) => !task.completedAt);
  const completedTasks = tasks.filter((task) => task.completedAt);
  const pendingReminders = reminders.filter((reminder) => !reminder.completedAt);
  const agenda = useMemo<AgendaItem[]>(() => {
    const taskItems = pendingTasks
      .filter((task) => task.dueAt)
      .map((task) => ({ id: task.id, title: task.title, date: task.dueAt as string, kind: 'task' as const }));
    const reminderItems = pendingReminders.map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      date: reminder.scheduledAt,
      kind: 'reminder' as const,
    }));
    return [...taskItems, ...reminderItems].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  }, [pendingReminders, pendingTasks]);
  const next =
    agenda[0] || (pendingTasks[0] ? { id: pendingTasks[0].id, title: pendingTasks[0].title, date: '', kind: 'task' as const } : null);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const greetingEmoji = hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙';
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const quickActions = [
    { label: 'Nova nota', icon: 'document-text-outline' as const, onPress: () => router.push('/notes/new') },
    { label: 'Nova tarefa', icon: 'checkmark-circle-outline' as const, onPress: () => router.push('/tasks/new') },
    { label: 'Lembrete', icon: 'notifications-outline' as const, onPress: () => router.push('/reminders/new') },
    { label: 'Gravar áudio', icon: 'mic-outline' as const, onPress: () => router.push('/media/audio' as never) },
    { label: 'Novo evento', icon: 'calendar-outline' as const, onPress: () => router.push('/calendar') },
  ];

  const toggle = async (task: Task) => {
    await toggleTask(task.id, !task.completedAt);
    showSnackbar(task.completedAt ? 'Tarefa reaberta' : 'Tarefa concluída');
    load();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{greeting}, Vini</Text>
              <Text style={styles.wave} accessibilityLabel="Saudação">
                {greetingEmoji}
                👋
              </Text>
            </View>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
          <View style={styles.actions}>
            <IconButton icon="settings-outline" label="Configurações" onPress={() => router.push('/settings')} />
            <Pressable style={styles.addTop} onPress={() => setCaptureOpen(true)} accessibilityLabel="Criar">
              <Text style={styles.addText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.stats}>
          <StatCard value={String(pendingTasks.length)} label="pendentes" color={colors.accent} />
          <StatCard value={String(completedTasks.length)} label="concluídas" color={colors.success} />
          <StatCard value={String(pendingReminders.length)} label="lembretes" color={colors.warning} />
        </View>

        <SectionTitle title="Próximo" />
        {next ? (
          <Pressable
            style={styles.nextCard}
            onPress={() =>
              router.push({ pathname: next.kind === 'task' ? '/tasks/[id]' : '/reminders/[id]', params: { id: next.id } } as never)
            }
          >
            <View style={styles.nextIcon}>
              <Ionicons
                name={next.kind === 'task' ? 'checkmark-circle-outline' : 'notifications-outline'}
                size={20}
                color={colors.accent}
              />
            </View>
            <View style={styles.nextCopy}>
              <Text style={styles.nextTitle}>{next.title}</Text>
              <Text style={styles.nextMeta}>{next.date ? timeLabel(next.date) : 'Hoje'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
          </Pressable>
        ) : (
          <Text style={styles.muted}>Nada pendente por enquanto.</Text>
        )}

        <SectionTitle title="Tarefas de hoje" action="Ver todas" onAction={() => router.push('/tasks')} />
        <View style={styles.taskCard}>
          {tasks.slice(0, 5).map((task) => (
            <Pressable key={task.id} style={styles.taskRow} onPress={() => toggle(task)}>
              <Checkbox checked={Boolean(task.completedAt)} onPress={() => toggle(task)} label={task.title} />
              <View style={styles.taskCopy}>
                <Text style={[styles.taskTitle, task.completedAt && styles.completed]} numberOfLines={1}>
                  {task.title}
                </Text>
                <Text style={styles.taskMeta}>{task.dueAt ? timeLabel(task.dueAt) : 'Sem horário'}</Text>
              </View>
            </Pressable>
          ))}
          {!tasks.length ? <Text style={styles.muted}>Você não tem tarefas para hoje.</Text> : null}
        </View>

        <SectionTitle title="Agenda" action="Calendário" onAction={() => router.push('/calendar')} />
        <View style={styles.listCard}>
          {agenda.slice(0, 3).map((item) => (
            <ListRow
              key={`${item.kind}-${item.id}`}
              icon={item.kind === 'task' ? 'checkmark-circle-outline' : 'notifications-outline'}
              title={item.title}
              subtitle={`${new Date(item.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} · ${timeLabel(item.date)}`}
              onPress={() =>
                router.push({ pathname: item.kind === 'task' ? '/tasks/[id]' : '/reminders/[id]', params: { id: item.id } } as never)
              }
            />
          ))}
          {!agenda.length ? <Text style={styles.muted}>Sua agenda está livre.</Text> : null}
        </View>

        <SectionTitle title="Notas recentes" action="Ver notas" onAction={() => router.push('/notes')} />
        <View style={styles.listCard}>
          {notes.slice(0, 3).map((note) => (
            <ListRow
              key={note.id}
              icon="document-text-outline"
              title={note.title || 'Nota sem título'}
              subtitle={`Atualizada ${new Date(note.updatedAt).toLocaleDateString('pt-BR')}`}
              onPress={() => router.push({ pathname: '/notes/[id]', params: { id: note.id } })}
            />
          ))}
          {!notes.length ? <Text style={styles.muted}>Suas notas aparecerão aqui.</Text> : null}
        </View>

        <SectionTitle title="Acesso rápido" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickList}>
          {quickActions.map((action) => (
            <Pressable key={action.label} style={styles.quickAction} onPress={action.onPress} accessibilityRole="button">
              <Ionicons name={action.icon} size={20} color={colors.accent} />
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle title="Navegar" />
        <View style={styles.listCard}>
          <ListRow
            icon="file-tray-outline"
            title="Caixa de entrada"
            subtitle={`${inboxCount} itens para organizar`}
            onPress={() => router.push('/inbox')}
          />
          <ListRow icon="grid-outline" title="Espaços" subtitle="Organize por contexto" onPress={() => router.push('/spaces')} />
          <ListRow icon="search-outline" title="Tudo" subtitle="Pesquisar no Nexo" onPress={() => router.push('/search')} />
        </View>
      </ScrollView>
      <BottomNav />
      <FloatingButton onPress={() => setCaptureOpen(true)} />
      <CaptureSheet visible={captureOpen} onClose={() => setCaptureOpen(false)} onCreated={load} />
    </SafeAreaView>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.sm },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  greeting: { ...typography.title, color: colors.ink },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  wave: { fontSize: 23, lineHeight: 28 },
  date: { ...typography.caption, color: colors.inkMuted, marginTop: 4, textTransform: 'capitalize' },
  addTop: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 28, fontWeight: '300', color: colors.ink, marginTop: -3 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    minHeight: 72,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  statValue: { ...typography.title, fontWeight: '700' },
  statLabel: { ...typography.meta, color: colors.inkMuted, marginTop: 2 },
  nextCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  nextIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  nextCopy: { flex: 1 },
  nextTitle: { ...typography.bodyStrong, color: colors.ink },
  nextMeta: { ...typography.caption, color: colors.inkMuted, marginTop: 3 },
  taskCard: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.sm, marginBottom: spacing.md },
  taskRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  taskCopy: { flex: 1, marginLeft: spacing.xs },
  taskTitle: { ...typography.body, color: colors.ink },
  taskMeta: { ...typography.meta, color: colors.inkMuted, marginTop: 2 },
  completed: { color: colors.inkMuted, textDecorationLine: 'line-through' },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  quickList: { gap: spacing.sm, paddingVertical: spacing.xs, paddingBottom: spacing.md },
  quickAction: {
    minWidth: 100,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  quickLabel: { ...typography.meta, color: colors.ink, textAlign: 'center' },
  muted: { ...typography.body, color: colors.inkMuted, padding: spacing.md },
});
