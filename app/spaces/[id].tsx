import { goBackOrHome } from '@/navigation/back';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { addDays } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FloatingButton } from '@/components/ui';
import { LongPressItem } from '@/components/long-press-item';
import { useItemActions, useSnackbar } from '@/components/visual';
import {
  findSpace,
  listAttachments,
  listNotes,
  listTasks,
  toggleTask,
  trashNote,
  trashTask,
  updateNote,
  updateTask,
} from '@/database/repositories';
import { radius, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import type { Attachment, Note, Space, Task } from '@/types/domain';
import { motionDuration } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';
import { formatStorageBytes } from '@/services/storage-service';

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [tab, setTab] = useState('Notas');
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [indicator] = useState(() => new Animated.Value(0));
  const [contentOpacity] = useState(() => new Animated.Value(1));
  const reducedMotion = useReducedMotion();
  const { showItemConfirmation } = useItemActions();
  const { showSnackbar } = useSnackbar();

  const load = useCallback(async () => {
    if (!id) return;
    const [nextSpace, allNotes, allTasks] = await Promise.all([findSpace(id), listNotes(), listTasks('all')]);
    const spaceNotes = allNotes.filter((note) => note.spaceId === id);
    const spaceTasks = allTasks.filter((task) => task.spaceId === id);
    const attachmentGroups = await Promise.all([
      ...spaceNotes.map((note) => listAttachments(note.id)),
      ...spaceTasks.map((task) => listAttachments(task.id)),
    ]);
    setSpace(nextSpace);
    setNotes(spaceNotes);
    setTasks(spaceTasks);
    setAttachments(attachmentGroups.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    Animated.timing(indicator, {
      toValue: tabs.indexOf(tab),
      duration: reducedMotion ? 100 : motionDuration.normal,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: reducedMotion ? 100 : motionDuration.normal,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [contentOpacity, indicator, reducedMotion, tab]);

  const rows = useMemo(
    () =>
      tab === 'Notas'
        ? notes.map((note) => ({
            id: note.id,
            title: note.title || 'Nota sem título',
            subtitle: `Editada · ${formatDate(note.updatedAt)}`,
            icon: 'document-text-outline' as const,
            path: '/notes/[id]' as const,
            kind: 'note' as const,
            source: note,
          }))
        : tab === 'Tarefas'
          ? tasks.map((task) => ({
              id: task.id,
              title: task.title,
              subtitle: task.dueAt ? `Prazo · ${formatDate(task.dueAt)}` : 'Sem prazo',
              icon: task.completedAt ? ('checkmark-circle-outline' as const) : ('checkbox-outline' as const),
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
        {(tab === 'Arquivos' ? attachments.length : rows.length) > 0 ? (
          <Text style={styles.listCount}>
            {tab === 'Arquivos'
              ? `${attachments.length} ${attachments.length === 1 ? 'arquivo' : 'arquivos'}`
              : `${rows.length} ${tab === 'Notas' ? (rows.length === 1 ? 'nota' : 'notas') : rows.length === 1 ? 'tarefa' : 'tarefas'}`}
          </Text>
        ) : null}
        {tab === 'Arquivos' && attachments.length ? (
          attachments.map((attachment) => {
            const label = attachment.type === 'image' ? 'Imagem' : attachment.type === 'audio' ? 'Áudio' : 'Arquivo';
            const icon =
              attachment.type === 'image' ? 'image-outline' : attachment.type === 'audio' ? 'mic-outline' : 'document-attach-outline';
            const iconColor = attachment.type === 'image' ? colors.accent : attachment.type === 'audio' ? colors.success : colors.warning;
            const iconBackground =
              attachment.type === 'image' ? colors.accentSoft : attachment.type === 'audio' ? colors.successSoft : colors.warningSoft;
            return (
              <Pressable
                key={attachment.id}
                onPress={() => router.push({ pathname: '/media/preview', params: { id: attachment.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${attachment.originalName || 'Sem nome'}`}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>
                  <Ionicons name={icon} size={20} color={iconColor} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {attachment.originalName || label}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {label}
                    {attachment.sizeBytes != null ? ` · ${formatStorageBytes(attachment.sizeBytes)}` : ''} ·{' '}
                    {formatDate(attachment.createdAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.inkMuted} />
              </Pressable>
            );
          })
        ) : rows.length ? (
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
              <View
                style={[
                  styles.rowIcon,
                  row.kind === 'task' && row.source.completedAt && styles.completedIcon,
                ]}
              >
                <Ionicons
                  name={row.icon}
                  size={20}
                  color={row.kind === 'task' && row.source.completedAt ? colors.success : colors.accent}
                />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, row.kind === 'task' && row.source.completedAt && styles.completedTitle]} numberOfLines={2}>
                  {row.title}
                </Text>
                {row.subtitle ? (
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {row.subtitle}
                  </Text>
                ) : null}
              </View>
              <View style={styles.rowTrailing}>
                {row.kind === 'task' && row.source.completedAt ? <Text style={styles.completedLabel}>Feita</Text> : null}
                {row.kind === 'note' && row.source.pinned ? <Ionicons name="pin" size={13} color={colors.inkMuted} /> : null}
                <Ionicons name="chevron-forward" size={17} color={colors.inkMuted} />
              </View>
            </LongPressItem>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={26} color={colors.inkMuted} />
            <Text style={styles.emptyTitle}>{tab === 'Arquivos' ? 'Nenhum arquivo' : 'Nada por aqui ainda'}</Text>
            <Text style={styles.emptyText}>
              {tab === 'Arquivos'
                ? 'Anexos das notas e tarefas deste espaço aparecerão aqui.'
                : 'Crie algo neste espaço para manter tudo junto.'}
            </Text>
          </View>
        )}
      </Animated.ScrollView>

      <FloatingButton
        onPress={() =>
          tab === 'Tarefas'
            ? router.push({ pathname: '/tasks/new', params: { spaceId: id } })
            : router.push({ pathname: '/notes/new', params: { spaceId: id } })
        }
        label={tab === 'Tarefas' ? 'Nova tarefa' : 'Nova nota'}
        bottom={24}
      />
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
    list: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 104 },
    listCount: { ...typography.caption, color: colors.inkMuted, marginBottom: spacing.md, paddingHorizontal: spacing.xs },
    row: {
      minHeight: 78,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted,
    },
    rowPressed: { backgroundColor: colors.surfacePressed },
    rowIcon: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
    completedIcon: { backgroundColor: colors.successSoft },
    rowCopy: { flex: 1, minWidth: 0, justifyContent: 'center' },
    rowTitle: { ...typography.bodyStrong, color: colors.ink },
    completedTitle: { color: colors.inkSoft },
    rowMeta: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.xs },
    rowTrailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    completedLabel: { ...typography.meta, color: colors.success },
    empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: spacing.xl },
    emptyTitle: { ...typography.bodyStrong, color: colors.inkSoft, marginTop: spacing.md },
    emptyText: { ...typography.caption, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xs },
  });
