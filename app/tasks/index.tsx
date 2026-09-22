import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FloatingButton } from '@/components/ui';
import { listTasks, toggleTask } from '@/database/repositories';
import { colors, radius, spacing, typography } from '@/design/theme';
import type { Priority, Task } from '@/types/domain';
import { useSnackbar } from '@/components/visual';

const tabs = ['Hoje', 'Próximas', 'Todas'];

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
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState('Hoje');
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(() => listTasks(tab === 'Hoje' ? 'today' : tab === 'Próximas' ? 'upcoming' : 'all').then(setTasks), [tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openTasks = useMemo(() => tasks.filter((task) => !task.completedAt), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => Boolean(task.completedAt)), [tasks]);

  const renderTask = (task: Task, completed = false) => {
    const dueTime = formatDueTime(task.dueAt);
    const priority = priorityLabel(task.priority);

    return (
      <Pressable
        key={task.id}
        onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
        style={({ pressed }) => [styles.taskRow, pressed && styles.rowPressed, completed && styles.completedRow]}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed }}
          accessibilityLabel={completed ? 'Marcar como pendente' : 'Marcar como concluída'}
          onPress={(event) => {
            event.stopPropagation();
            toggleTask(task.id, !completed).then(() => {
              showSnackbar(completed ? 'Tarefa reaberta' : 'Tarefa concluída');
              load();
            });
          }}
          style={[styles.checkbox, completed && styles.checkboxCompleted]}
          hitSlop={8}
        >
          {completed ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
        </Pressable>

        <View style={styles.taskCopy}>
          <Text style={[styles.taskTitle, completed && styles.completedText]} numberOfLines={1}>
            {task.title}
          </Text>
          {dueTime ? <Text style={[styles.taskMeta, completed && styles.completedText]}>{dueTime}</Text> : null}
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
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Tarefas</Text>
        <Pressable
          onPress={() => router.push('/tasks/new')}
          accessibilityRole="button"
          accessibilityLabel="Nova tarefa"
          hitSlop={10}
          style={styles.headerAction}
        >
          <Ionicons name="add" size={27} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.segmented}>
          {tabs.map((item) => {
            const selected = tab === item;
            return (
              <Pressable key={item} onPress={() => setTab(item)} style={styles.segment}>
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{item}</Text>
                {selected ? <View style={styles.segmentIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    minHeight: 62,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.heading, color: colors.ink, fontSize: 20 },
  headerAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
