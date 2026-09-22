import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, ListRow, PrimaryButton, SecondaryButton } from '@/components/ui';
import { ActionSheet, AppDialog, useSnackbar } from '@/components/visual';
import { findTask, toggleTask, trashTask } from '@/database/repositories';
import type { Task } from '@/types/domain';
export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task>();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { showSnackbar } = useSnackbar();
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
  const deleteTask = async () => {
    setDeleteOpen(false);
    await trashTask(task.id);
    showSnackbar('Tarefa excluída');
    router.back();
  };
  const toggle = async () => {
    await toggleTask(task.id, !task.completedAt);
    showSnackbar(task.completedAt ? 'Tarefa reaberta' : 'Tarefa concluída');
    await load();
  };
  return (
    <View style={styles.root}>
      <Header title="Tarefa" onBack={() => router.back()} action={() => setActionsOpen(true)} />
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
          <PrimaryButton title={task.completedAt ? 'Reabrir tarefa' : 'Concluir tarefa'} onPress={toggle} />
          <SecondaryButton title="Mais ações" onPress={() => setActionsOpen(true)} />
        </View>
      </View>
      <ActionSheet
        visible={actionsOpen}
        title="Ações da tarefa"
        onClose={() => setActionsOpen(false)}
        options={[
          {
            label: task.completedAt ? 'Reabrir' : 'Concluir',
            icon: task.completedAt ? 'refresh-outline' : 'checkmark-circle-outline',
            onPress: toggle,
          },
          { label: 'Editar', icon: 'create-outline', onPress: () => router.push({ pathname: '/tasks/new', params: { id: task.id } }) },
          {
            label: 'Tags',
            icon: 'pricetags-outline',
            onPress: () => router.push({ pathname: '/tags', params: { itemId: task.id, itemType: 'task' } } as never),
          },
          { label: 'Excluir', icon: 'trash-outline', destructive: true, onPress: () => setDeleteOpen(true) },
        ]}
      />
      <AppDialog
        visible={deleteOpen}
        title="Excluir tarefa?"
        message="A tarefa será movida para a lixeira."
        confirmLabel="Excluir"
        destructive
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteTask}
      />
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
