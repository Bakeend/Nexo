import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { EmptyState, FloatingButton, Header, Segmented } from '@/components/ui';
import { listTasks, toggleTask } from '@/database/repositories';
import type { Task } from '@/types/domain';
export default function Tasks() {
  const [tab, setTab] = useState('Hoje');
  const [tasks, setTasks] = useState<Task[]>([]);
  const load = useCallback(() => listTasks(tab === 'Hoje' ? 'today' : tab === 'Próximas' ? 'upcoming' : 'all').then(setTasks), [tab]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <View style={styles.root}>
      <Header title="Tarefas" action={() => router.push('/tasks/new')} actionLabel="+" />
      <View style={styles.content}>
        <Segmented values={['Hoje', 'Próximas', 'Todas']} selected={tab} onChange={setTab} />
        {tasks.length ? (
          tasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
              style={styles.taskRow}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(task.completedAt) }}
                onPress={() => toggleTask(task.id, !task.completedAt).then(load)}
                style={styles.checkbox}
              >
                <Text style={styles.checkboxText}>{task.completedAt ? '✓' : ''}</Text>
              </Pressable>
              <View style={styles.taskCopy}>
                <Text style={[styles.taskTitle, task.completedAt && styles.completed]}>{task.title}</Text>
                <Text style={styles.taskMeta}>
                  {task.dueAt
                    ? new Date(task.dueAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Sem data'}
                  {task.priority !== 'none' ? ` · ${task.priority}` : ''}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon="checkmark-circle-outline"
            title="Nenhuma tarefa"
            description="Crie uma tarefa para tirar algo da cabeça."
            action="Criar tarefa"
            onAction={() => router.push('/tasks/new')}
          />
        )}
      </View>
      <FloatingButton onPress={() => router.push('/tasks/new')} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.lg },
  taskRow: {
    minHeight: 66,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: { color: colors.white, fontWeight: '800' },
  taskCopy: { flex: 1 },
  taskTitle: { ...typography.bodyStrong, color: colors.ink },
  completed: { color: colors.inkMuted, textDecorationLine: 'line-through' },
  taskMeta: { ...typography.caption, color: colors.inkMuted, marginTop: 3 },
});
