import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { AnimatedPressable } from '@/motion/AnimatedPressable';
import { AnimatedListItem } from '@/motion/AnimatedListItem';
import { animateListLayout } from '@/motion/layout';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { motionDuration } from '@/motion/tokens';
import { playUISound } from '@/services/ui-sound-service';
import { BottomNav, CaptureSheet, IconButton, ListRow, SectionTitle } from '@/components/ui';
import { Checkbox, useItemActions, useSnackbar } from '@/components/visual';
import { LongPressItem } from '@/components/long-press-item';
import {
  completeReminder,
  listInbox,
  listNotes,
  listPinnedItems,
  listReminders,
  listTasks,
  toggleTask,
  trashNote,
  trashReminder,
  trashTask,
  setPinnedItem,
  updateNote,
  updateTask,
} from '@/database/repositories';
import type { Note, PinnedItem, Reminder, Task } from '@/types/domain';
import { cancelReminder, createNextRecurringReminder, snoozeReminder } from '@/services/notification-service';

type AgendaItem = { id: string; title: string; date: string; kind: 'task' | 'reminder' };

function timeLabel(value: string | null) {
  return value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Sem horário';
}

export default function Home() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [taskPreview, setTaskPreview] = useState<Record<string, boolean>>({});
  const [completingReminderId, setCompletingReminderId] = useState<string | null>(null);
  const togglingTasks = useRef(new Set<string>());
  const completingReminders = useRef(new Set<string>());
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { showSnackbar } = useSnackbar();
  const { showItemConfirmation } = useItemActions();

  const load = useCallback(async () => {
    const [todayTasks, allReminders, recentNotes, inbox, nextPinnedItems] = await Promise.all([
      listTasks('today'),
      listReminders(),
      listNotes(),
      listInbox(),
      listPinnedItems(),
    ]);
    animateListLayout(reducedMotion);
    setTasks(todayTasks);
    setReminders(allReminders);
    setNotes(recentNotes);
    setPinnedItems(nextPinnedItems);
    setInboxCount(inbox.length);
  }, [reducedMotion]);

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
  const nextTaskItem = next?.kind === 'task' ? tasks.find((task) => task.id === next.id) : undefined;
  const nextReminderItem = next?.kind === 'reminder' ? reminders.find((reminder) => reminder.id === next.id) : undefined;
  const visibleTasks = tasks.filter((task) => next?.kind !== 'task' || task.id !== next.id);
  const visibleAgenda = agenda.filter((item) => item.kind !== next?.kind || item.id !== next.id);
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

  const toggle = async (task: Task, playSound = true) => {
    if (togglingTasks.current.has(task.id)) return;
    togglingTasks.current.add(task.id);
    const complete = !task.completedAt;
    setTaskPreview((current) => ({ ...current, [task.id]: complete }));
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 80 : motionDuration.normal));
    try {
      await toggleTask(task.id, complete);
      if (playSound) playUISound(complete ? 'complete' : 'undo-soft');
      showSnackbar(complete ? 'Tarefa concluída' : 'Tarefa reaberta', complete ? 'success' : 'info');
      await load();
    } finally {
      togglingTasks.current.delete(task.id);
      setTaskPreview((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
  };
  const completeNextReminder = async (reminder: Reminder) => {
    if (completingReminders.current.has(reminder.id)) return;
    completingReminders.current.add(reminder.id);
    setCompletingReminderId(reminder.id);
    try {
      await cancelReminder(reminder);
      if (reminder.repeatRule) {
        const nextOccurrence = await createNextRecurringReminder(reminder);
        if (!nextOccurrence) await completeReminder(reminder.id);
      } else await completeReminder(reminder.id);
      showSnackbar('Lembrete concluído', 'success');
      await load();
    } catch {
      showSnackbar('Não foi possível concluir o lembrete.', 'error');
    } finally {
      completingReminders.current.delete(reminder.id);
      setCompletingReminderId(null);
    }
  };
  const taskActions = (task: Task) => [
    { label: 'Editar', icon: 'create-outline' as const, onPress: () => router.push({ pathname: '/tasks/new', params: { id: task.id } }) },
    {
      label: task.pinned ? 'Desafixar' : 'Fixar',
      icon: task.pinned ? ('pin-outline' as const) : ('pin' as const),
      onPress: async () => {
        await setPinnedItem('task', task.id, !task.pinned);
        showSnackbar(task.pinned ? 'Tarefa desafixada' : 'Tarefa fixada', 'info');
        await load();
      },
    },
    {
      label: task.completedAt ? 'Reabrir' : 'Concluir',
      icon: task.completedAt ? ('refresh-outline' as const) : ('checkmark-circle-outline' as const),
      onPress: () => toggle(task),
    },
    {
      label: 'Adiar para amanhã',
      icon: 'time-outline' as const,
      onPress: async () => {
        await updateTask(task.id, { dueAt: addDays(task.dueAt ? new Date(task.dueAt) : new Date(), 1).toISOString() });
        playUISound('swipe-soft');
        showSnackbar('Tarefa adiada para amanhã', 'info');
        await load();
      },
    },
    {
      label: 'Excluir',
      icon: 'trash-outline' as const,
      destructive: true,
      onPress: () =>
        showItemConfirmation({
          title: 'Excluir esta tarefa?',
          confirmLabel: 'Excluir',
          onConfirm: async () => {
            await trashTask(task.id);
            playUISound('swipe-soft');
            showSnackbar('Tarefa excluída', 'info');
            await load();
          },
        }),
    },
  ];
  const reminderActions = (reminder: Reminder) => [
    {
      label: 'Editar',
      icon: 'create-outline' as const,
      onPress: () => router.push({ pathname: '/reminders/new', params: { id: reminder.id } }),
    },
    {
      label: 'Adiar 10 minutos',
      icon: 'time-outline' as const,
      onPress: async () => {
        await snoozeReminder(reminder, new Date(Date.now() + 10 * 60 * 1000));
        playUISound('clock-tick');
        showSnackbar('Lembrete adiado por 10 minutos', 'info');
        await load();
      },
    },
    {
      label: 'Concluir',
      icon: 'checkmark-circle-outline' as const,
      onPress: async () => {
        if (reminder.repeatRule) await createNextRecurringReminder(reminder);
        else await completeReminder(reminder.id);
        playUISound('complete');
        showSnackbar('Lembrete concluído', 'success');
        await load();
      },
    },
    {
      label: 'Excluir',
      icon: 'trash-outline' as const,
      destructive: true,
      onPress: () =>
        showItemConfirmation({
          title: 'Excluir este lembrete?',
          confirmLabel: 'Excluir',
          onConfirm: async () => {
            await cancelReminder(reminder);
            await trashReminder(reminder.id);
            playUISound('swipe-soft');
            showSnackbar('Lembrete excluído', 'info');
            await load();
          },
        }),
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 88 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <AnimatedListItem delay={0}>
          <View style={styles.hero}>
            <View>
              <View style={styles.greetingRow}>
                <Text style={styles.greeting}>{greeting}, Vini</Text>
                <Text style={styles.wave} accessibilityLabel="Saudação">
                  {greetingEmoji}
                </Text>
              </View>
              <Text style={styles.date}>{dateLabel}</Text>
            </View>
            <IconButton icon="settings-outline" label="Configurações" onPress={() => router.push('/settings')} />
          </View>
        </AnimatedListItem>

        {pendingTasks.length || completedTasks.length || pendingReminders.length ? (
          <AnimatedListItem delay={38}>
            <View style={styles.stats}>
              <StatCard value={String(pendingTasks.length)} label="pendentes" color={colors.accent} />
              <StatCard value={String(completedTasks.length)} label="concluídas" color={colors.success} />
              <StatCard value={String(pendingReminders.length)} label="lembretes" color={colors.warning} />
            </View>
          </AnimatedListItem>
        ) : null}

        {pinnedItems.length ? (
          <>
            <View style={styles.pinnedSectionHeading}>
              <Ionicons name="pin" size={14} color={colors.accent} />
              <Text style={styles.pinnedSectionTitle}>Fixados</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinnedList}>
              {pinnedItems.map((item) => (
                <LongPressItem
                  key={`${item.type}-${item.id}`}
                  title={item.title}
                  style={styles.pinnedItem}
                  pressedStyle={styles.rowPressed}
                  onPress={() => {
                    if (item.type === 'note') router.push({ pathname: '/notes/[id]', params: { id: item.id } });
                    if (item.type === 'task') router.push({ pathname: '/tasks/[id]', params: { id: item.id } });
                    if (item.type === 'file') router.push({ pathname: '/media/preview', params: { id: item.id } });
                    if (item.type === 'space') router.push({ pathname: '/spaces/[id]', params: { id: item.id } });
                  }}
                  actions={[
                    {
                      label: 'Desafixar',
                      icon: 'pin-outline',
                      onPress: async () => {
                        await setPinnedItem(item.type, item.id, false);
                        showSnackbar('Item removido de Fixados', 'info');
                        await load();
                      },
                    },
                  ]}
                >
                  <View style={styles.pinnedItemTop}>
                    <Ionicons
                      name={
                        item.type === 'note'
                          ? 'document-text-outline'
                          : item.type === 'task'
                            ? 'checkmark-circle-outline'
                            : item.type === 'file'
                              ? 'document-attach-outline'
                              : 'grid-outline'
                      }
                      size={17}
                      color={colors.accent}
                    />
                    <Ionicons name="pin" size={14} color={colors.inkMuted} />
                  </View>
                  <Text style={styles.pinnedItemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.pinnedItemSubtitle}>{item.subtitle}</Text>
                </LongPressItem>
              ))}
            </ScrollView>
          </>
        ) : null}
        {next ? (
          <>
            <SectionTitle title="Próximo" />
            <LongPressItem
              title={next.title}
              actions={nextTaskItem ? taskActions(nextTaskItem) : nextReminderItem ? reminderActions(nextReminderItem) : []}
              style={styles.nextCard}
              pressedStyle={styles.rowPressed}
              onPress={() =>
                router.push({ pathname: next.kind === 'task' ? '/tasks/[id]' : '/reminders/[id]', params: { id: next.id } } as never)
              }
            >
              <Checkbox
                checked={nextTaskItem ? (taskPreview[next.id] ?? Boolean(nextTaskItem.completedAt)) : completingReminderId === next.id}
                onPress={() => {
                  if (nextTaskItem) void toggle(nextTaskItem, false);
                  else if (nextReminderItem) void completeNextReminder(nextReminderItem);
                }}
                label={`Concluir ${next.title}`}
              />
              <View style={styles.nextCopy}>
                <Text style={styles.nextTitle}>{next.title}</Text>
                <Text style={styles.nextMeta}>{next.date ? timeLabel(next.date) : 'Hoje'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </LongPressItem>
          </>
        ) : null}

        {visibleTasks.length ? (
          <>
            <SectionTitle title="Tarefas de hoje" action="Ver todas" onAction={() => router.push('/tasks')} />
            <AnimatedListItem delay={48}>
              <View style={styles.taskCard}>
                {visibleTasks.slice(0, 5).map((task) => (
                  <LongPressItem
                    key={task.id}
                    title={task.title}
                    actions={taskActions(task)}
                    style={styles.taskRow}
                    pressedStyle={styles.rowPressed}
                    onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
                  >
                    <Checkbox
                      checked={taskPreview[task.id] ?? Boolean(task.completedAt)}
                      onPress={() => toggle(task, false)}
                      label={task.title}
                    />
                    <View style={styles.taskCopy}>
                      <Text
                        style={[styles.taskTitle, (taskPreview[task.id] ?? Boolean(task.completedAt)) && styles.completed]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                      <Text style={styles.taskMeta}>{task.dueAt ? timeLabel(task.dueAt) : 'Sem horário'}</Text>
                    </View>
                  </LongPressItem>
                ))}
              </View>
            </AnimatedListItem>
          </>
        ) : null}

        {visibleAgenda.length ? (
          <>
            <SectionTitle title="Agenda" action="Calendário" onAction={() => router.push('/calendar')} />
            <View style={styles.listCard}>
              {visibleAgenda.slice(0, 3).map((item) => {
                const task = item.kind === 'task' ? tasks.find((candidate) => candidate.id === item.id) : undefined;
                const reminder = item.kind === 'reminder' ? reminders.find((candidate) => candidate.id === item.id) : undefined;
                return (
                  <ListRow
                    key={`${item.kind}-${item.id}`}
                    icon={item.kind === 'task' ? 'checkmark-circle-outline' : 'notifications-outline'}
                    title={item.title}
                    subtitle={`${new Date(item.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} · ${timeLabel(item.date)}`}
                    onPress={() =>
                      router.push({ pathname: item.kind === 'task' ? '/tasks/[id]' : '/reminders/[id]', params: { id: item.id } } as never)
                    }
                    longPressTitle={item.title}
                    longPressActions={task ? taskActions(task) : reminder ? reminderActions(reminder) : []}
                  />
                );
              })}
            </View>
          </>
        ) : null}

        {notes.length ? (
          <>
            <SectionTitle title="Notas recentes" action="Ver notas" onAction={() => router.push('/notes')} />
            <View style={styles.listCard}>
              {notes.slice(0, 3).map((note) => (
                <ListRow
                  key={note.id}
                  icon="document-text-outline"
                  title={note.title || 'Nota sem título'}
                  subtitle={`Atualizada ${new Date(note.updatedAt).toLocaleDateString('pt-BR')}`}
                  onPress={() => router.push({ pathname: '/notes/[id]', params: { id: note.id } })}
                  longPressTitle={note.title || 'Nota'}
                  longPressActions={[
                    {
                      label: 'Editar',
                      icon: 'create-outline',
                      onPress: () => router.push({ pathname: '/notes/new', params: { id: note.id } }),
                    },
                    {
                      label: 'Criar tarefa vinculada',
                      description: 'Usar esta nota como contexto da tarefa',
                      icon: 'checkmark-circle-outline',
                      onPress: () =>
                        router.push({
                          pathname: '/tasks/new',
                          params: { seed: note.title || 'Nova tarefa', relatedNoteId: note.id, spaceId: note.spaceId || '' },
                        }),
                    },
                    {
                      label: note.pinned ? 'Desafixar' : 'Fixar',
                      icon: note.pinned ? 'pin-outline' : 'pin',
                      onPress: () => updateNote(note.id, { pinned: !note.pinned }).then(load),
                    },
                    {
                      label: 'Excluir',
                      icon: 'trash-outline',
                      destructive: true,
                      onPress: () =>
                        showItemConfirmation({
                          title: 'Excluir esta nota?',
                          confirmLabel: 'Excluir',
                          onConfirm: async () => {
                            await trashNote(note.id);
                            playUISound('swipe-soft');
                            showSnackbar('Nota enviada para a lixeira', 'info');
                            await load();
                          },
                        }),
                    },
                  ]}
                />
              ))}
            </View>
          </>
        ) : null}

        <SectionTitle title="Acesso rápido" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickList}>
          {quickActions.map((action) => (
            <AnimatedPressable
              key={action.label}
              style={styles.quickAction}
              onPress={() => {
                playUISound('pop');
                action.onPress();
              }}
              accessibilityRole="button"
              pressedScale={0.97}
            >
              <Ionicons name={action.icon} size={20} color={colors.accent} />
              <Text style={styles.quickLabel}>{action.label}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>

        <SectionTitle title="Navegar" />
        <View style={styles.listCard}>
          <ListRow icon="today-outline" title="Hoje" subtitle="Sua agenda do dia" onPress={() => router.push('/today')} />
          <ListRow
            icon="checkmark-circle-outline"
            title="Tarefas"
            subtitle="Acompanhe o que precisa ser feito"
            onPress={() => router.push('/tasks')}
          />
          <ListRow icon="document-text-outline" title="Notas" subtitle="Suas anotações" onPress={() => router.push('/notes')} />
          <ListRow icon="notifications-outline" title="Lembretes" subtitle="Seus alertas" onPress={() => router.push('/reminders')} />
          <ListRow icon="calendar-outline" title="Calendário" subtitle="Tarefas e compromissos" onPress={() => router.push('/calendar')} />
          <ListRow
            icon="document-attach-outline"
            title="Arquivos"
            subtitle="Anexos importados"
            onPress={() => router.push('/files' as never)}
          />
          <ListRow
            icon="file-tray-outline"
            title="Caixa de entrada"
            subtitle={`${inboxCount} itens para organizar`}
            onPress={() => router.push('/inbox')}
          />
          <ListRow icon="grid-outline" title="Espaços" subtitle="Organize por contexto" onPress={() => router.push('/spaces')} />
          <ListRow icon="pricetag-outline" title="Tags" subtitle="Organize por assunto" onPress={() => router.push('/tags' as never)} />
          <ListRow icon="trash-outline" title="Lixeira" subtitle="Itens excluídos" onPress={() => router.push('/trash' as never)} />
          <ListRow icon="search-outline" title="Tudo" subtitle="Pesquisar no Nexo" onPress={() => router.push('/search')} />
        </View>
      </ScrollView>
      <BottomNav onCreate={() => setCaptureOpen(true)} createExpanded={captureOpen} />
      <CaptureSheet visible={captureOpen} onClose={() => setCaptureOpen(false)} onCreated={load} />
    </SafeAreaView>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    if (reducedMotion) return;
    opacity.setValue(0.5);
    Animated.timing(opacity, { toValue: 1, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [opacity, reducedMotion, value]);
  return (
    <View style={styles.statCard}>
      <Animated.Text style={[styles.statValue, { color, opacity }]}>{value}</Animated.Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: spacing.lg, paddingBottom: 120, gap: spacing.sm },
    hero: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingTop: spacing.md,
      marginBottom: spacing.md,
    },
    greeting: { ...typography.title, color: colors.ink },
    greetingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    wave: { fontSize: 23, lineHeight: 28 },
    date: { ...typography.caption, color: colors.inkMuted, marginTop: 4, textTransform: 'capitalize' },
    stats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    pinnedSectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    pinnedSectionTitle: {
      ...typography.caption,
      color: colors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontWeight: '700',
    },
    pinnedList: { gap: spacing.sm, paddingBottom: spacing.md },
    pinnedItem: {
      width: 148,
      minHeight: 82,
      justifyContent: 'space-between',
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    pinnedItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pinnedItemTitle: { ...typography.bodyStrong, color: colors.ink, marginTop: spacing.xs },
    pinnedItemSubtitle: { ...typography.meta, color: colors.inkMuted },
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
    rowPressed: { backgroundColor: colors.surfacePressed },
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
  });
