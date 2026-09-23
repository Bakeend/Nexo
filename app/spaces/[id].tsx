import { goBackOrHome } from '@/navigation/back';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { addDays } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FloatingButton } from '@/components/ui';
import { LongPressItem } from '@/components/long-press-item';
import { useItemActions, useSnackbar } from '@/components/visual';
import { findSpace, listNotes, listTasks, toggleTask, trashNote, trashTask, updateNote, updateTask } from '@/database/repositories';
import { colors, radius, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import type { Note, Space, Task } from '@/types/domain';
import { motionDuration } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';

const tabs = ['Notas', 'Tarefas', 'Arquivos'];

function formatDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

export default function SpaceDetail() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [space, setSpace] = useState<Space>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState('Notas');
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [indicator] = useState(() => new Animated.Value(0));
  const [contentOpacity] = useState(() => new Animated.Value(1));
  const reducedMotion = useReducedMotion();
  const { showItemConfirmation } = useItemActions();
  const { showSnackbar } = useSnackbar();

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([findSpace(id), listNotes(), listTasks('all')]).then(([nextSpace, allNotes, allTasks]) => {
      setSpace(nextSpace);
      setNotes(allNotes.filter((note) => note.spaceId === id));
      setTasks(allTasks.filter((task) => task.spaceId === id));
    });
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    Animated.timing(indicator, {
      toValue: tabs.indexOf(tab),
      duration: reducedMotion ? 100 : motionDuration.normal,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, { toValue: 1, duration: reducedMotion ? 100 : motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [contentOpacity, indicator, reducedMotion, tab]);

  const rows = useMemo(
    () =>
      tab === 'Notas'
        ? notes.map((note) => ({
            id: note.id,
            title: note.title || 'Nota sem título',
            subtitle: formatDate(note.updatedAt),
            icon: 'document-outline' as const,
            path: '/notes/[id]' as const,
            kind: 'note' as const,
            source: note,
          }))
        : tab === 'Tarefas'
          ? tasks.map((task) => ({
              id: task.id,
              title: task.title,
              subtitle: formatDate(task.dueAt || task.updatedAt),
              icon: task.completedAt ? ('checkmark-circle-outline' as const) : ('ellipse-outline' as const),
              path: '/tasks/[id]' as const,
              kind: 'task' as const,
              source: task,
            }))
          : [],
    [notes, tab, tasks],
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.topBar}>
        <Pressable onPress={() => goBackOrHome()} hitSlop={10} style={styles.iconButton} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.headingWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {space?.name || 'Espaço'}
        </Text>
      </View>

      <View style={styles.segmented} onLayout={(event) => setSegmentWidth(event.nativeEvent.layout.width / tabs.length)}>
        {segmentWidth > 0 ? (
          <Animated.View
            style={[
              styles.segmentIndicator,
              {
                width: segmentWidth,
                transform: [{ translateX: indicator.interpolate({ inputRange: [0, 1], outputRange: [0, segmentWidth] }) }],
              },
            ]}
          />
        ) : null}
        {tabs.map((item) => {
          const selected = tab === item;
          return (
            <Pressable
              key={item}
              onPress={() => {
                if (item !== tab) {
                  setTab(item);
                  playUISound('selection-click');
                }
              }}
              style={styles.segment}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.ScrollView style={{ opacity: contentOpacity }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {rows.length ? (
          rows.map((row) => (
            <LongPressItem
              key={row.id}
              title={row.title}
              onPress={() => router.push({ pathname: row.path, params: { id: row.id } })}
              style={styles.row}
              pressedStyle={styles.rowPressed}
              actions={
                row.kind === 'note'
                  ? [
                      {
                        label: 'Editar',
                        icon: 'create-outline',
                        onPress: () => router.push({ pathname: '/notes/new', params: { id: row.id } }),
                      },
                      {
                        label: row.source.pinned ? 'Desafixar' : 'Fixar',
                        icon: 'pin-outline',
                        onPress: async () => {
                          await updateNote(row.id, { pinned: !row.source.pinned });
                          showSnackbar(row.source.pinned ? 'Nota desafixada' : 'Nota fixada', 'info');
                          load();
                        },
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
                              await trashNote(row.id);
                              showSnackbar('Nota enviada para a lixeira', 'info');
                              load();
                            },
                          }),
                      },
                    ]
                  : [
                      {
                        label: 'Editar',
                        icon: 'create-outline',
                        onPress: () => router.push({ pathname: '/tasks/new', params: { id: row.id } }),
                      },
                      {
                        label: row.source.completedAt ? 'Reabrir' : 'Concluir',
                        icon: row.source.completedAt ? 'refresh-outline' : 'checkmark-circle-outline',
                        onPress: async () => {
                          await toggleTask(row.id, !row.source.completedAt);
                          showSnackbar(row.source.completedAt ? 'Tarefa reaberta' : 'Tarefa concluída');
                          load();
                        },
                      },
                      {
                        label: 'Adiar para amanhã',
                        icon: 'time-outline',
                        onPress: async () => {
                          await updateTask(row.id, {
                            dueAt: addDays(row.source.dueAt ? new Date(row.source.dueAt) : new Date(), 1).toISOString(),
                          });
                          showSnackbar('Tarefa adiada para amanhã', 'info');
                          load();
                        },
                      },
                      {
                        label: 'Excluir',
                        icon: 'trash-outline',
                        destructive: true,
                        onPress: () =>
                          showItemConfirmation({
                            title: 'Excluir esta tarefa?',
                            confirmLabel: 'Excluir',
                            onConfirm: async () => {
                              await trashTask(row.id);
                              showSnackbar('Tarefa enviada para a lixeira', 'info');
                              load();
                            },
                          }),
                      },
                    ]
              }
            >
              <View style={styles.rowIcon}>
                <Ionicons name={row.icon} size={18} color={colors.inkSoft} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {row.title}
                </Text>
                {row.subtitle ? <Text style={styles.rowMeta}>{row.subtitle}</Text> : null}
              </View>
            </LongPressItem>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={26} color={colors.inkMuted} />
            <Text style={styles.emptyTitle}>{tab === 'Arquivos' ? 'Nenhum arquivo' : 'Nada por aqui ainda'}</Text>
            <Text style={styles.emptyText}>Crie algo neste espaço para manter tudo junto.</Text>
          </View>
        )}
      </Animated.ScrollView>

      <FloatingButton onPress={() => router.push({ pathname: '/notes/new', params: { spaceId: id } })} label="Nova nota" bottom={24} />
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    topBar: {
      minHeight: 48,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headingWrap: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.md },
    title: { ...typography.title, color: colors.ink, fontSize: 26 },
    segmented: {
      height: 38,
      marginHorizontal: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    segment: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    segmentText: { ...typography.caption, color: colors.inkMuted },
    segmentTextSelected: { color: colors.accent, fontWeight: '700' },
    segmentIndicator: {
      position: 'absolute',
      bottom: 1,
      height: 2,
      borderRadius: 1,
      backgroundColor: colors.accent,
    },
    list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 104 },
    row: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    rowPressed: { backgroundColor: colors.surfacePressed },
    rowIcon: { width: 24, alignItems: 'center' },
    rowCopy: { flex: 1, justifyContent: 'center' },
    rowTitle: { ...typography.body, color: colors.ink },
    rowMeta: { ...typography.meta, color: colors.inkMuted, marginTop: 2 },
    empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: spacing.xl },
    emptyTitle: { ...typography.bodyStrong, color: colors.inkSoft, marginTop: spacing.md },
    emptyText: { ...typography.caption, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs },
  });
