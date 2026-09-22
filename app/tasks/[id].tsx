import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, ListRow, PrimaryButton, SecondaryButton } from '@/components/ui';
import { findTask, toggleTask, trashTask } from '@/database/repositories';
import type { Task } from '@/types/domain';
export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task>();
  const load = useCallback(async () => {
    if (id) setTask(await findTask(id));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  if (!task)
    return (
      <View style={styles.root}>
        <Header title="Tarefa" onBack={() => router.back()} />
        <Text style={styles.muted}>Tarefa não encontrada.</Text>
      </View>
    );
  const actions = () =>
    Alert.alert('Ações da tarefa', undefined, [
      { text: task.completedAt ? 'Reabrir' : 'Concluir', onPress: () => toggleTask(task.id, !task.completedAt).then(load) },
      { text: 'Editar', onPress: () => router.push({ pathname: '/tasks/new', params: { id: task.id } }) },
      { text: 'Tags', onPress: () => router.push({ pathname: '/tags', params: { itemId: task.id, itemType: 'task' } } as never) },
      { text: 'Duplicar', onPress: () => undefined },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await trashTask(task.id);
          router.back();
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  return (
    <View style={styles.root}>
      <Header title="Tarefa" onBack={() => router.back()} action={actions} />
      <View style={styles.content}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={styles.meta}>
          {task.completedAt ? 'Concluída' : 'Pendente'} · {task.priority === 'none' ? 'Prioridade normal' : `Prioridade ${task.priority}`}
        </Text>
        <ListRow icon="calendar-outline" title="Data" subtitle={task.dueAt ? new Date(task.dueAt).toLocaleString('pt-BR') : 'Sem data'} />
        {task.description ? <Text style={styles.body}>{task.description}</Text> : null}
        {task.relatedNoteId ? (
          <ListRow
            icon="document-text-outline"
            title="Nota relacionada"
            subtitle="Abrir nota original"
            onPress={() => router.push({ pathname: '/notes/[id]', params: { id: task.relatedNoteId as string } })}
          />
        ) : null}
        <View style={styles.actions}>
          <PrimaryButton
            title={task.completedAt ? 'Reabrir tarefa' : 'Concluir tarefa'}
            onPress={() => toggleTask(task.id, !task.completedAt).then(load)}
          />
          <SecondaryButton title="Excluir tarefa" onPress={() => actions()} />
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg },
  title: { ...typography.title, color: colors.ink },
  meta: { ...typography.body, color: colors.inkMuted, marginVertical: spacing.lg },
  body: { ...typography.body, color: colors.ink, marginVertical: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
  muted: { ...typography.body, color: colors.inkMuted, padding: spacing.lg },
});
