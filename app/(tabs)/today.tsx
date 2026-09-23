import { Ionicons } from '@expo/vector-icons';
import { addDays } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { BottomNav, CaptureSheet, EmptyState } from '@/components/ui';
import { completeReminder, listReminders, listTasks, toggleTask, trashReminder, trashTask, updateTask } from '@/database/repositories';
import type { Reminder, Task } from '@/types/domain';
import { LongPressItem } from '@/components/long-press-item';
import { useItemActions, useSnackbar } from '@/components/visual';
import { cancelReminder, createNextRecurringReminder, snoozeReminder } from '@/services/notification-service';
import { animateListLayout } from '@/motion/layout';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { Checkbox } from '@/components/visual';
import { playUISound } from '@/services/ui-sound-service';
import { AnimatedListItem } from '@/motion/AnimatedListItem';
import { motionDuration } from '@/motion/tokens';

export default function Today() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(() => new Set());
  const [exitingTaskIds, setExitingTaskIds] = useState<Set<string>>(() => new Set());
  const [postponingTaskIds, setPostponingTaskIds] = useState<Set<string>>(() => new Set());
  const [exitingReminderIds, setExitingReminderIds] = useState<Set<string>>(() => new Set());
  const [completingReminderIds, setCompletingReminderIds] = useState<Set<string>>(() => new Set());
  const [snoozingReminderIds, setSnoozingReminderIds] = useState<Set<string>>(() => new Set());
  const completingTaskIdsRef = useRef(new Set<string>());
  const completionTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingTaskExits = useRef(new Map<string, () => Promise<void>>());
  const pendingReminderExits = useRef(new Map<string, () => Promise<void>>());
  const reducedMotion = useReducedMotion();
  const { showItemConfirmation } = useItemActions();
  const { showSnackbar } = useSnackbar();
  const load = useCallback(async () => {
    const [t, r] = await Promise.all([listTasks('today'), listReminders()]);
    animateListLayout(reducedMotion);
    setTasks(t.filter((x) => !x.completedAt));
    setReminders(r.filter((x) => !x.completedAt && new Date(x.scheduledAt).toDateString() === new Date().toDateString()));
    setLoading(false);
  }, [reducedMotion]);
  const finishTaskCompletion = useCallback(
    async (taskId: string) => {
      try {
        await toggleTask(taskId, true);
        animateListLayout(reducedMotion);
        setTasks((current) => current.filter((task) => task.id !== taskId));
        showSnackbar('Tarefa concluída', 'success');
      } catch {
        showSnackbar('Não foi possível concluir a tarefa', 'error');
      } finally {
        completingTaskIdsRef.current.delete(taskId);
        setExitingTaskIds((current) => {
          const next = new Set(current);
          next.delete(taskId);
          return next;
        });
        setCompletingTaskIds((current) => {
          const next = new Set(current);
          next.delete(taskId);
          return next;
        });
      }
    },
    [reducedMotion, showSnackbar],
  );
  const startTaskCompletion = useCallback(
    (task: Task, playSound: boolean) => {
      if (completingTaskIdsRef.current.has(task.id)) return;
      completingTaskIdsRef.current.add(task.id);
      setCompletingTaskIds((current) => new Set(current).add(task.id));
      if (playSound) playUISound('complete');
      const timer = setTimeout(
        () => {
          completionTimers.current.delete(task.id);
          setExitingTaskIds((current) => new Set(current).add(task.id));
        },
        reducedMotion ? 80 : motionDuration.normal,
      );
      completionTimers.current.set(task.id, timer);
    },
    [reducedMotion],
  );
  const exitTask = (taskId: string, action: () => Promise<void>, kind: 'postpone' | 'delete') => {
    if (pendingTaskExits.current.has(taskId) || completingTaskIdsRef.current.has(taskId)) return;
    pendingTaskExits.current.set(taskId, action);
    animateListLayout(reducedMotion);
    if (kind === 'postpone') setPostponingTaskIds((current) => new Set(current).add(taskId));
    setExitingTaskIds((current) => new Set(current).add(taskId));
  };
  const finishTaskExit = async (taskId: string) => {
    const action = pendingTaskExits.current.get(taskId);
    if (!action) {
      await finishTaskCompletion(taskId);
      return;
    }
    pendingTaskExits.current.delete(taskId);
    try {
      await action();
    } finally {
      setExitingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
      setPostponingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  };
  const taskActions = (task: Task) => [
    { label: 'Editar', icon: 'create-outline' as const, onPress: () => router.push({ pathname: '/tasks/new', params: { id: task.id } }) },
    {
      label: 'Concluir',
      icon: 'checkmark-circle-outline' as const,
      onPress: () => startTaskCompletion(task, true),
    },
    {
      label: 'Adiar para amanhã',
      icon: 'time-outline' as const,
      onPress: () =>
        exitTask(
          task.id,
          async () => {
            await updateTask(task.id, { dueAt: addDays(task.dueAt ? new Date(task.dueAt) : new Date(), 1).toISOString() });
            playUISound('swipe-soft');
            showSnackbar('Tarefa adiada para amanhã', 'info');
            await load();
          },
          'postpone',
        ),
    },
    {
      label: 'Excluir',
      icon: 'trash-outline' as const,
      destructive: true,
      onPress: () =>
        showItemConfirmation({
          title: 'Excluir esta tarefa?',
          confirmLabel: 'Excluir',
          onConfirm: () =>
            exitTask(
              task.id,
              async () => {
                await trashTask(task.id);
                playUISound('swipe-soft');
                showSnackbar('Tarefa excluída', 'info');
                await load();
              },
              'delete',
            ),
        }),
    },
  ];
  const exitReminder = (id: string, action: () => Promise<void>, complete = false) => {
    if (pendingReminderExits.current.has(id)) return;
    pendingReminderExits.current.set(id, action);
    if (complete) setCompletingReminderIds((current) => new Set(current).add(id));
    setTimeout(() => setExitingReminderIds((current) => new Set(current).add(id)), complete && !reducedMotion ? motionDuration.normal : 0);
  };
  const finishReminderExit = async (id: string) => {
    const action = pendingReminderExits.current.get(id);
    if (!action) return;
    pendingReminderExits.current.delete(id);
    try {
      await action();
    } finally {
      setExitingReminderIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setCompletingReminderIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };
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
        animateListLayout(reducedMotion);
        setSnoozingReminderIds((current) => new Set(current).add(reminder.id));
        await snoozeReminder(reminder, new Date(Date.now() + 10 * 60 * 1000));
        playUISound('clock-tick');
        showSnackbar('Lembrete adiado por 10 minutos', 'info');
        await load();
        setSnoozingReminderIds((current) => {
          const next = new Set(current);
          next.delete(reminder.id);
          return next;
        });
      },
    },
    {
      label: 'Concluir',
      icon: 'checkmark-circle-outline' as const,
      onPress: () =>
        exitReminder(
          reminder.id,
          async () => {
            if (reminder.repeatRule) await createNextRecurringReminder(reminder);
            else await completeReminder(reminder.id);
            playUISound('complete');
            showSnackbar('Lembrete concluído', 'success');
            await load();
          },
          true,
        ),
    },
    {
      label: 'Excluir',
      icon: 'trash-outline' as const,
      destructive: true,
      onPress: () =>
        showItemConfirmation({
          title: 'Excluir este lembrete?',
          confirmLabel: 'Excluir',
          onConfirm: () =>
            exitReminder(reminder.id, async () => {
              await cancelReminder(reminder);
              await trashReminder(reminder.id);
              playUISound('swipe-soft');
              showSnackbar('Lembrete excluído', 'info');
              await load();
            }),
        }),
    },
  ];
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => () => completionTimers.current.forEach((timer) => clearTimeout(timer)), []);

  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const formattedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  const nextTask = tasks[0];

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 88 + insets.bottom }]} showsVerticalScrollIndicator={false}>
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
          <LongPressItem
            title={nextTask.title}
            actions={taskActions(nextTask)}
            onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: nextTask.id } })}
            style={styles.nextRow}
            pressedStyle={styles.rowPressed}
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
          </LongPressItem>
        ) : (
          <Text style={styles.emptyLine}>Nada agendado por enquanto.</Text>
        )}
        <Text style={styles.sectionTitle}>Minhas tarefas</Text>
        {loading ? (
          <Text style={styles.muted}>Carregando…</Text>
        ) : tasks.length ? (
          tasks.map((task) => (
            <AnimatedListItem
              key={task.id}
              style={{ marginLeft: postponingTaskIds.has(task.id) && !reducedMotion ? 16 : 0 }}
              exiting={exitingTaskIds.has(task.id)}
              onExitComplete={() => void finishTaskExit(task.id)}
            >
              <LongPressItem
                title={task.title}
                actions={taskActions(task)}
                onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
                style={styles.taskRow}
                pressedStyle={styles.rowPressed}
              >
                <Checkbox checked={completingTaskIds.has(task.id)} label={task.title} onPress={() => startTaskCompletion(task, false)} />
                <Text style={[styles.taskTitle, completingTaskIds.has(task.id) && styles.completedTask]} numberOfLines={1}>
                  {task.title}
                </Text>
              </LongPressItem>
            </AnimatedListItem>
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
              <AnimatedListItem
                key={item.id}
                exiting={exitingReminderIds.has(item.id)}
                onExitComplete={() => void finishReminderExit(item.id)}
                style={{ marginLeft: snoozingReminderIds.has(item.id) && !reducedMotion ? 16 : 0 }}
              >
                <LongPressItem
                  title={item.title}
                  actions={reminderActions(item)}
                  onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: item.id } })}
                  style={styles.taskRow}
                  pressedStyle={styles.rowPressed}
                >
                  <Ionicons
                    name={completingReminderIds.has(item.id) ? 'checkmark-circle-outline' : 'notifications-outline'}
                    size={18}
                    color={colors.inkSoft}
                  />
                  <Text style={[styles.taskTitle, completingReminderIds.has(item.id) && styles.completedTask]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.reminderTime}>
                    {new Date(item.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </LongPressItem>
              </AnimatedListItem>
            ))}
          </>
        ) : null}
      </ScrollView>
      <BottomNav onCreate={() => setOpen(true)} createExpanded={open} />
      <CaptureSheet visible={open} onClose={() => setOpen(false)} onCreated={load} />
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
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
    completedTask: { textDecorationLine: 'line-through', color: colors.inkMuted },
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
