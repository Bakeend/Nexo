import { goBackOrHome } from '@/navigation/back';
import { addDays } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Animated, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { Header, ListRow, PrimaryButton } from '@/components/ui';
import { LongPressItem } from '@/components/long-press-item';
import { useItemActions, useSnackbar } from '@/components/visual';
import { findTask, setPinnedItem, toggleTask, trashTask, updateTask } from '@/database/repositories';
import type { Task } from '@/types/domain';
import { playUISound } from '@/services/ui-sound-service';
import { motionDuration, motionSpring } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';

const priorityLabels: Record<Task['priority'], string> = {
  none: 'normal',
  low: 'baixa',
  medium: 'média',
  high: 'alta',
};

export default function TaskDetail() {
  const styles = useThemeStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task>();
  const [previewCompleted, setPreviewCompleted] = useState<boolean | null>(null);
  const reducedMotion = useReducedMotion();
  const offset = useRef(new Animated.Value(0)).current;
  const visibility = useRef(new Animated.Value(1)).current;
  const { showItemConfirmation } = useItemActions();
  const { showSnackbar } = useSnackbar();
  const load = useCallback(async () => {
    if (id) setTask(await findTask(id));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  if (!task)
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <Header title="Tarefa" onBack={() => goBackOrHome()} />
        <Text style={styles.muted}>Tarefa não encontrada.</Text>
      </SafeAreaView>
    );
  const deleteTask = async () => {
    if (!reducedMotion) {
      await new Promise<void>((resolve) =>
        Animated.parallel([
          Animated.timing(visibility, { toValue: 0, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(offset, { toValue: 14, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }),
        ]).start(() => resolve()),
      );
    }
    await trashTask(task.id);
    playUISound('swipe-soft');
    showSnackbar('Tarefa excluída', 'info');
    goBackOrHome();
  };
  const toggle = async () => {
    if (previewCompleted !== null) return;
    const complete = !task.completedAt;
    setPreviewCompleted(complete);
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 80 : motionDuration.normal));
    try {
      await toggleTask(task.id, complete);
      playUISound(complete ? 'complete' : 'undo-soft');
      showSnackbar(complete ? 'Tarefa concluída' : 'Tarefa reaberta', complete ? 'success' : 'info');
      await load();
    } finally {
      setPreviewCompleted(null);
    }
  };
  const postpone = async () => {
    if (!reducedMotion) {
      Animated.sequence([
        Animated.timing(offset, { toValue: 16, duration: motionDuration.fast, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(offset, { toValue: 0, ...motionSpring.selection, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
    const dueAt = addDays(task.dueAt ? new Date(task.dueAt) : new Date(), 1).toISOString();
    await updateTask(task.id, { dueAt });
    playUISound('swipe-soft');
    showSnackbar('Tarefa adiada para amanhã', 'info');
    await load();
  };
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Tarefa" onBack={() => goBackOrHome()} />
      <Animated.View style={[styles.content, { opacity: visibility, transform: [{ translateX: offset }] }]}>
        <LongPressItem
          title={task.title}
          style={styles.titleActionTarget}
          actions={[
            {
              label: task.completedAt ? 'Reabrir' : 'Concluir',
              icon: task.completedAt ? 'refresh-outline' : 'checkmark-circle-outline',
              onPress: toggle,
            },
            {
              label: task.pinned ? 'Desafixar' : 'Fixar',
              icon: task.pinned ? 'pin-outline' : 'pin',
              onPress: async () => {
                await setPinnedItem('task', task.id, !task.pinned);
                showSnackbar(task.pinned ? 'Tarefa desafixada' : 'Tarefa fixada', 'info');
                await load();
              },
            },
            { label: 'Editar', icon: 'create-outline', onPress: () => router.push({ pathname: '/tasks/new', params: { id: task.id } }) },
            { label: 'Adiar para amanhã', icon: 'time-outline', onPress: postpone },
            {
              label: 'Tags',
              icon: 'pricetags-outline',
              onPress: () => router.push({ pathname: '/tags', params: { itemId: task.id, itemType: 'task' } } as never),
            },
            {
              label: 'Excluir',
              icon: 'trash-outline',
              destructive: true,
              onPress: () =>
                showItemConfirmation({
                  title: 'Excluir tarefa?',
                  message: 'A tarefa será movida para a lixeira.',
                  confirmLabel: 'Excluir',
                  onConfirm: deleteTask,
                }),
            },
          ]}
        >
          <Text style={[styles.title, (previewCompleted ?? Boolean(task.completedAt)) && styles.completedTitle]}>{task.title}</Text>
          <Text style={styles.meta}>
            {task.completedAt ? 'Concluída' : 'Pendente'} · Prioridade {priorityLabels[task.priority]}
          </Text>
        </LongPressItem>
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
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: { padding: spacing.lg },
    titleActionTarget: { borderRadius: 12, marginHorizontal: -spacing.xs, paddingHorizontal: spacing.xs },
    title: { ...typography.title, color: colors.ink },
    completedTitle: { color: colors.inkMuted, textDecorationLine: 'line-through' },
    meta: { ...typography.body, color: colors.inkMuted, marginVertical: spacing.lg },
    body: { ...typography.body, color: colors.ink, marginVertical: spacing.lg },
    actions: { gap: spacing.sm, marginTop: spacing.xl },
    muted: { ...typography.body, color: colors.inkMuted, padding: spacing.lg },
  });
