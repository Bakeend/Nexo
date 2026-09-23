import { Ionicons } from '@expo/vector-icons';
import { addDays } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FloatingButton, IconButton, Segmented } from '@/components/ui';
import { listTasks, setPinnedItem, toggleTask, trashTask, updateTask } from '@/database/repositories';
import { colors, radius, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import type { Priority, Task } from '@/types/domain';
import { Checkbox, useItemActions, useSnackbar } from '@/components/visual';
import { LongPressItem } from '@/components/long-press-item';
import { animateListLayout } from '@/motion/layout';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';
import { AnimatedListItem } from '@/motion/AnimatedListItem';
import { motionDuration } from '@/motion/tokens';
import type { TaskListFilter } from '@/features/tasks/task-date-filter';
import { goBackOrHome } from '@/navigation/back';

const tabs = ['Hoje', 'Atrasadas', 'Próximas', 'Sem data', 'Todas'] as const;
type TaskTab = (typeof tabs)[number];
const filterByTab: Record<TaskTab, TaskListFilter> = {
  Hoje: 'today',
  Atrasadas: 'overdue',
  Próximas: 'upcoming',
  'Sem data': 'no-date',
  Todas: 'all',
};

function formatDueTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function priorityLabel(priority: Priority) {
  if (priority === 'high') return 'Alta';
  if (priority === 'medium') return 'Média';
  if (priority === 'low') return 'Baixa';
  return null;
}

export default function Tasks() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const { showSnackbar } = useSnackbar();
  const { showItemConfirmation } = useItemActions();
  const reducedMotion = useReducedMotion();
  const [tab, setTab] = useState<TaskTab>('Hoje');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [preview, setPreview] = useState<Record<string, boolean>>({});
  const [exiting, setExiting] = useState<Record<string, 'postpone' | 'delete'>>({});
  const pendingExits = useRef(new Map<string, () => Promise<void>>());

  const load = useCallback(
    () =>
      listTasks(filterByTab[tab]).then((items) => {
        animateListLayout(reducedMotion);
        setTasks(items);
      }),
    [reducedMotion, tab],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openTasks = useMemo(() => tasks.filter((task) => !task.completedAt), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => Boolean(task.completedAt)), [tasks]);

  const toggle = async (task: Task, playSound = true) => {
    if (task.id in preview) return;
    const complete = !task.completedAt;
    setPreview((current) => ({ ...current, [task.id]: complete }));
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 80 : motionDuration.normal));
    try {
      await toggleTask(task.id, complete);
      if (playSound) playUISound(complete ? 'complete' : 'undo-soft');
      showSnackbar(complete ? 'Tarefa concluída' : 'Tarefa reaberta', complete ? 'success' : 'info');
      await load();
    } finally {
      setPreview((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
  };

  const exitThen = (taskId: string, action: () => Promise<void>, kind: 'postpone' | 'delete') => {
    if (pendingExits.current.has(taskId)) return;
    pendingExits.current.set(taskId, action);
    animateListLayout(reducedMotion);
    setExiting((current) => ({ ...current, [taskId]: kind }));
  };

  const finishExit = async (taskId: string) => {
    const action = pendingExits.current.get(taskId);
    if (!action) return;
    pendingExits.current.delete(taskId);
    try {
      await action();
    } finally {
      setExiting((current) => {
        const next = { ...current };
        delete next[taskId];
        return next;
      });
    }
  };

  const renderTask = (task: Task, completed = false) => {
    const dueTime = formatDueTime(task.dueAt);
    const priority = priorityLabel(task.priority);
    const checked = preview[task.id] ?? completed;

    return (
      <AnimatedListItem
        key={task.id}
        style={{ marginLeft: exiting[task.id] === 'postpone' && !reducedMotion ? 16 : 0 }}
        exiting={Boolean(exiting[task.id])}
        onExitComplete={() => void finishExit(task.id)}
      >
        <LongPressItem
          title={task.title}
          accessibilityLabel={`Tarefa: ${task.title}`}
          onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
          style={[styles.taskRow, checked && styles.completedRow]}
          pressedStyle={styles.rowPressed}
          actions={[
            { label: 'Editar', icon: 'create-outline', onPress: () => router.push({ pathname: '/tasks/new', params: { id: task.id } }) },
            {
              label: task.pinned ? 'Desafixar' : 'Fixar',
              icon: task.pinned ? 'pin-outline' : 'pin',
              onPress: async () => {
                await setPinnedItem('task', task.id, !task.pinned);
                showSnackbar(task.pinned ? 'Tarefa desafixada' : 'Tarefa fixada', 'info');
                await load();
              },
            },
            {
              label: completed ? 'Reabrir' : 'Concluir',
              icon: completed ? 'refresh-outline' : 'checkmark-circle-outline',
              onPress: () => void toggle(task),
            },
            {
              label: 'Adiar para amanhã',
              icon: 'time-outline',
              onPress: () =>
                exitThen(
                  task.id,
                  async () => {
                    const dueAt = addDays(task.dueAt ? new Date(task.dueAt) : new Date(), 1).toISOString();
                    await updateTask(task.id, { dueAt });
                    playUISound('swipe-soft');
                    showSnackbar('Tarefa adiada para amanhã', 'info');
                    await load();
                  },
                  'postpone',
                ),
            },
            {
              label: 'Excluir',
              icon: 'trash-outline',
              destructive: true,
              onPress: () =>
                showItemConfirmation({
                  title: 'Excluir esta tarefa?',
                  message: 'A tarefa poderá ser restaurada pela lixeira.',
                  confirmLabel: 'Excluir',
                  onConfirm: () =>
                    exitThen(
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
          ]}
        >
          <Checkbox
            checked={checked}
            label={completed ? 'Marcar como pendente' : 'Marcar como concluída'}
            onPress={() => void toggle(task, false)}
          />

          <View style={styles.taskCopy}>
            <Text style={[styles.taskTitle, checked && styles.completedText]} numberOfLines={1}>
              {task.title}
            </Text>
            {dueTime ? <Text style={[styles.taskMeta, checked && styles.completedText]}>{dueTime}</Text> : null}
          </View>

          {priority && !completed ? (
            <View
              style={[
                styles.priorityPill,
                task.priority === 'high' ? styles.priorityHigh : task.priority === 'medium' ? styles.priorityMedium : styles.priorityLow,
              ]}
            >
              <Text style={[styles.priorityText, task.priority === 'high' && styles.priorityHighText]}>{priority}</Text>
            </View>
          ) : null}
        </LongPressItem>
      </AnimatedListItem>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Voltar" onPress={goBackOrHome} />
        <Text style={styles.title}>Tarefas</Text>
        <IconButton
          icon="add"
          size={27}
          label="Nova tarefa"
          onPress={() => {
            playUISound('pop');
            router.push('/tasks/new');
          }}
        />
      </View>

      <View style={styles.content}>
        <Segmented values={[...tabs]} selected={tab} onChange={(value) => setTab(value as TaskTab)} />

        <View style={styles.list}>
          {openTasks.length ? openTasks.map((task) => renderTask(task)) : <Text style={styles.emptyText}>Nenhuma tarefa nesta lista.</Text>}

          {completedTasks.length ? (
            <View style={styles.completedSection}>
              <View style={styles.completedHeader}>
                <Ionicons name="chevron-down" size={17} color={colors.inkSoft} />
                <Text style={styles.completedTitle}>Concluídas</Text>
              </View>
              {completedTasks.map((task) => renderTask(task, true))}
            </View>
          ) : null}
        </View>
      </View>

      <FloatingButton onPress={() => router.push('/tasks/new')} label="Nova tarefa" bottom={24} />
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    header: {
      minHeight: 62,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: { ...typography.heading, flex: 1, color: colors.ink, fontSize: 20 },
    content: { flex: 1, paddingHorizontal: spacing.lg },
    segmented: {
      height: 38,
      paddingHorizontal: 3,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    segmentText: { ...typography.caption, color: colors.inkMuted },
    segmentTextSelected: { color: colors.accent, fontWeight: '700' },
    segmentIndicator: {
      position: 'absolute',
      bottom: 1,
      width: 30,
      height: 2,
      borderRadius: 1,
      backgroundColor: colors.accent,
    },
    list: { paddingTop: spacing.sm, paddingBottom: 96 },
    taskRow: {
      minHeight: 54,
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
      paddingHorizontal: 2,
    },
    rowPressed: { backgroundColor: colors.surfacePressed },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.4,
      borderColor: colors.inkSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxCompleted: {
      backgroundColor: '#B7BECD',
      borderColor: '#B7BECD',
    },
    taskCopy: { flex: 1, justifyContent: 'center' },
    taskTitle: { ...typography.body, color: colors.ink },
    taskMeta: { ...typography.meta, color: colors.inkMuted, marginTop: 1 },
    priorityPill: {
      minWidth: 40,
      height: 24,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    priorityHigh: { backgroundColor: colors.dangerSoft },
    priorityMedium: { backgroundColor: colors.warningSoft },
    priorityLow: { backgroundColor: colors.accentSoft },
    priorityText: { ...typography.meta, color: colors.inkSoft, fontWeight: '700' },
    priorityHighText: { color: colors.danger },
    emptyText: {
      ...typography.caption,
      color: colors.inkMuted,
      paddingVertical: spacing.xl,
      textAlign: 'center',
    },
    completedSection: { marginTop: spacing.md },
    completedHeader: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    completedTitle: { ...typography.caption, color: colors.inkSoft, fontWeight: '700' },
    completedRow: { opacity: 0.72 },
    completedText: { color: colors.inkMuted },
  });
