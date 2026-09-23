import { goBackOrHome } from '@/navigation/back';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LongPressItem } from '@/components/long-press-item';
import { InlineAudioPlayer } from '@/components/audio-playback';
import { useItemActions, useSnackbar } from '@/components/visual';
import {
  completeReminder,
  createNote,
  createTask,
  deleteInbox,
  findAttachment,
  listAttachments,
  organizeInbox,
  searchAll,
  toggleTask,
  trashAttachment,
  trashNote,
  trashReminder,
  trashTask,
  updateNote,
} from '@/database/repositories';
import { createNextRecurringReminder, snoozeReminder, cancelReminder } from '@/services/notification-service';
import { shareAttachment } from '@/services/attachment-sharing';
import { AnimatedPressable } from '@/motion/AnimatedPressable';
import { motionDuration } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playTypingSound, playUISound } from '@/services/ui-sound-service';
import { radius, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import type { InboxItem, ItemType, Note, Reminder, Task, UnifiedItem } from '@/types/domain';

const filters = ['Todos', 'Notas', 'Tarefas', 'Arquivos', 'Lembretes'] as const;
type Filter = (typeof filters)[number];

function FilterChip({ label, selected, onPress }: { label: Filter; selected: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const [selection] = useState(() => new Animated.Value(selected ? 1 : 0));
  useEffect(() => {
    Animated.timing(selection, {
      toValue: selected ? 1 : 0,
      duration: reducedMotion ? 100 : motionDuration.normal,
      useNativeDriver: false,
    }).start();
  }, [reducedMotion, selected, selection]);
  const backgroundColor = selection.interpolate({ inputRange: [0, 1], outputRange: [colors.surfaceMuted, colors.ink] });
  const color = selection.interpolate({ inputRange: [0, 1], outputRange: [colors.inkSoft, colors.onInk] });
  return (
    <AnimatedPressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={styles.filterChip}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.filterBackground, { backgroundColor, pointerEvents: 'none' }]} />
      <Animated.Text style={[styles.filterText, { color }]}>{label}</Animated.Text>
    </AnimatedPressable>
  );
}

function matchesFilter(type: ItemType, filter: Filter) {
  if (filter === 'Todos') return true;
  if (filter === 'Notas') return type === 'note';
  if (filter === 'Tarefas') return type === 'task';
  if (filter === 'Lembretes') return type === 'reminder';
  return type === 'file' || type === 'image' || type === 'audio';
}

function resultIcon(type: ItemType): keyof typeof Ionicons.glyphMap {
  if (type === 'note') return 'document-text-outline';
  if (type === 'task') return 'checkmark-circle-outline';
  if (type === 'reminder') return 'notifications-outline';
  if (type === 'image') return 'image-outline';
  if (type === 'audio') return 'mic-outline';
  return 'document-outline';
}

function formatResultDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Hoje';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function openResult(item: UnifiedItem, attachmentId?: string) {
  if ((item.type === 'file' || item.type === 'image' || item.type === 'audio') && attachmentId) {
    router.push({ pathname: '/media/preview', params: { id: attachmentId } });
    return;
  }
  router.push({
    pathname:
      item.type === 'note' ? '/notes/[id]' : item.type === 'task' ? '/tasks/[id]' : item.type === 'reminder' ? '/reminders/[id]' : '/inbox',
    params: { id: item.id },
  } as never);
}

export default function Search() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Todos');
  const [results, setResults] = useState<UnifiedItem[]>([]);
  const reducedMotion = useReducedMotion();
  const [resultsOpacity] = useState(() => new Animated.Value(1));
  const [audioAttachmentIds, setAudioAttachmentIds] = useState<Record<string, string>>({});
  const [attachmentIds, setAttachmentIds] = useState<Record<string, string>>({});
  const resultsRequestRef = useRef(0);
  const hasQuery = Boolean(query);
  useEffect(() => {
    resultsOpacity.setValue(0);
    Animated.timing(resultsOpacity, {
      toValue: 1,
      duration: reducedMotion ? 100 : motionDuration.normal,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [filter, hasQuery, reducedMotion, resultsOpacity]);
  const { showItemConfirmation } = useItemActions();
  const { showSnackbar } = useSnackbar();

  const loadResults = useCallback(async () => {
    const request = ++resultsRequestRef.current;
    const items = await searchAll(query);
    const filtered = items.filter((item) => matchesFilter(item.type, filter));
    const attachmentEntries = await Promise.all(
      filtered
        .filter((item) => item.type === 'audio' || item.type === 'image' || item.type === 'file')
        .map(async (item) => {
          const inboxItem = item.source as InboxItem;
          const attachment = (await listAttachments(inboxItem.itemId)).find((candidate) => candidate.type === item.type);
          return attachment ? ([item.id, attachment.id] as const) : null;
        }),
    );
    if (request !== resultsRequestRef.current) return;
    const nextAttachments = Object.fromEntries(attachmentEntries.filter((entry): entry is readonly [string, string] => Boolean(entry)));
    setResults(filtered);
    setAttachmentIds(nextAttachments);
    setAudioAttachmentIds(
      Object.fromEntries(
        filtered.filter((item) => item.type === 'audio' && nextAttachments[item.id]).map((item) => [item.id, nextAttachments[item.id]]),
      ),
    );
  }, [filter, query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadResults();
    }, 180);
    return () => {
      clearTimeout(timer);
      resultsRequestRef.current += 1;
    };
  }, [loadResults]);

  const itemActions = (item: UnifiedItem) => {
    const open = () => openResult(item, attachmentIds[item.id]);
    if (item.type === 'note') {
      const note = item.source as Note;
      return [
        { label: 'Abrir nota', icon: 'open-outline' as const, onPress: open },
        {
          label: 'Editar',
          icon: 'create-outline' as const,
          onPress: () => router.push({ pathname: '/notes/new', params: { id: item.id } }),
        },
        {
          label: note.pinned ? 'Desafixar' : 'Fixar',
          icon: 'pin-outline' as const,
          onPress: async () => {
            await updateNote(note.id, { pinned: !note.pinned });
            showSnackbar(note.pinned ? 'Nota desafixada' : 'Nota fixada', 'info');
            await loadResults();
          },
        },
        {
          label: 'Excluir',
          icon: 'trash-outline' as const,
          destructive: true,
          onPress: () =>
            showItemConfirmation({
              title: 'Excluir esta nota?',
              confirmLabel: 'Excluir',
              onConfirm: async () => {
                await trashNote(note.id);
                await loadResults();
                showSnackbar('Nota excluída', 'info');
              },
            }),
        },
      ];
    }
    if (item.type === 'task') {
      const task = item.source as Task;
      return [
        { label: 'Abrir tarefa', icon: 'open-outline' as const, onPress: open },
        {
          label: 'Editar',
          icon: 'create-outline' as const,
          onPress: () => router.push({ pathname: '/tasks/new', params: { id: task.id } }),
        },
        {
          label: task.completedAt ? 'Reabrir' : 'Concluir',
          icon: task.completedAt ? ('refresh-outline' as const) : ('checkmark-circle-outline' as const),
          onPress: async () => {
            await toggleTask(task.id, !task.completedAt);
            showSnackbar(task.completedAt ? 'Tarefa reaberta' : 'Tarefa concluída');
            await loadResults();
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
                await loadResults();
                showSnackbar('Tarefa excluída', 'info');
              },
            }),
        },
      ];
    }
    if (item.type === 'reminder') {
      const reminder = item.source as Reminder;
      return [
        { label: 'Abrir lembrete', icon: 'open-outline' as const, onPress: open },
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
            showSnackbar('Lembrete adiado por 10 minutos', 'info');
            await loadResults();
          },
        },
        {
          label: 'Concluir',
          icon: 'checkmark-circle-outline' as const,
          onPress: async () => {
            if (reminder.repeatRule) await createNextRecurringReminder(reminder);
            else await completeReminder(reminder.id);
            showSnackbar('Lembrete concluído');
            await loadResults();
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
                await loadResults();
                showSnackbar('Lembrete excluído', 'info');
              },
            }),
        },
      ];
    }
    const inboxItem = item.source as InboxItem;
    if (item.type === 'file' || item.type === 'image' || item.type === 'audio')
      return [
        ...(item.type === 'audio' ? [] : [{ label: 'Abrir anexo', icon: 'open-outline' as const, onPress: open }]),
        {
          label: 'Compartilhar',
          icon: 'share-outline' as const,
          onPress: async () => {
            const attachmentId = attachmentIds[item.id];
            const attachment = attachmentId ? await findAttachment(attachmentId) : undefined;
            if (!attachment) return;
            try {
              if (!(await shareAttachment(attachment))) showSnackbar('Compartilhamento indisponível neste dispositivo.', 'error');
            } catch {
              showSnackbar('Não foi possível compartilhar o anexo.', 'error');
            }
          },
        },
        {
          label: 'Excluir',
          icon: 'trash-outline' as const,
          destructive: true,
          onPress: () =>
            showItemConfirmation({
              title: 'Excluir este anexo?',
              confirmLabel: 'Excluir',
              onConfirm: async () => {
                const attachmentId = attachmentIds[item.id];
                if (attachmentId) await trashAttachment(attachmentId);
                await deleteInbox(inboxItem.id);
                await loadResults();
                showSnackbar('Anexo excluído', 'info');
              },
            }),
        },
      ];

    return [
      {
        label: 'Transformar em nota',
        icon: 'document-text-outline' as const,
        onPress: async () => {
          const note = await createNote({ title: item.title });
          await organizeInbox(inboxItem.id);
          showSnackbar('Captura transformada em nota', 'success');
          await loadResults();
          router.push({ pathname: '/notes/[id]', params: { id: note.id } });
        },
      },
      {
        label: 'Transformar em tarefa',
        icon: 'checkmark-circle-outline' as const,
        onPress: async () => {
          const task = await createTask({ title: item.title || 'Nova tarefa' });
          await organizeInbox(inboxItem.id);
          showSnackbar('Captura transformada em tarefa', 'success');
          await loadResults();
          router.push({ pathname: '/tasks/[id]', params: { id: task.id } });
        },
      },
      {
        label: 'Excluir',
        icon: 'trash-outline' as const,
        destructive: true,
        onPress: () =>
          showItemConfirmation({
            title: 'Excluir esta captura?',
            confirmLabel: 'Excluir',
            onConfirm: async () => {
              await deleteInbox(inboxItem.id);
              await loadResults();
              showSnackbar('Captura excluída', 'info');
            },
          }),
      },
    ];
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.inkMuted} />
          <TextInput
            value={query}
            onChangeText={(next) => {
              playTypingSound(query, next);
              setQuery(next);
            }}
            placeholder="Pesquisar"
            placeholderTextColor={colors.inkMuted}
            autoFocus
            returnKeyType="search"
            style={styles.input}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Limpar busca">
              <Ionicons name="close-circle" size={18} color={colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => goBackOrHome()} hitSlop={8} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filtersScroll}>
        {filters.map((item) => {
          const selected = filter === item;
          return (
            <FilterChip
              key={item}
              label={item}
              selected={selected}
              onPress={() => {
                if (!selected) {
                  setFilter(item);
                  playUISound('selection-click');
                }
              }}
            />
          );
        })}
      </ScrollView>

      <Animated.ScrollView
        style={[styles.results, { opacity: resultsOpacity }]}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
      >
        {query ? (
          results.length ? (
            results.map((item) => {
              const date = formatResultDate(item.date);
              const meta = [item.spaceName || item.subtitle, date].filter(Boolean).join(' · ');
              return (
                <View key={`${item.type}-${item.id}`} style={styles.resultContainer}>
                  <LongPressItem
                    title={item.title}
                    actions={itemActions(item)}
                    onPress={item.type === 'audio' ? undefined : () => openResult(item, attachmentIds[item.id])}
                    style={styles.resultRow}
                    pressedStyle={styles.resultPressed}
                  >
                    <View style={styles.iconBox}>
                      <Ionicons name={resultIcon(item.type)} size={17} color={colors.inkSoft} />
                    </View>
                    <View style={styles.resultCopy}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {meta ? (
                        <Text style={styles.resultMeta} numberOfLines={1}>
                          {meta}
                        </Text>
                      ) : null}
                    </View>
                  </LongPressItem>
                  {item.type === 'audio' && audioAttachmentIds[item.id] ? (
                    <View style={styles.audioPlayer}>
                      <InlineAudioPlayer attachmentId={audioAttachmentIds[item.id]} />
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={24} color={colors.inkMuted} />
              <Text style={styles.emptyTitle}>Nada encontrado</Text>
              <Text style={styles.emptyText}>Tente outro termo de busca.</Text>
            </View>
          )
        ) : (
          <Text style={styles.hint}>Pesquise por título, conteúdo, tags ou espaço.</Text>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    searchRow: {
      minHeight: 56,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    searchBox: {
      flex: 1,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    input: { flex: 1, ...typography.body, color: colors.ink, paddingVertical: 0 },
    cancelButton: { minHeight: 38, justifyContent: 'center', paddingLeft: 2 },
    cancelText: { ...typography.caption, color: colors.inkSoft, fontWeight: '600' },
    filtersScroll: { flexGrow: 0 },
    filters: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
    filterChip: {
      height: 30,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterChipSelected: { backgroundColor: colors.ink },
    filterBackground: { borderRadius: radius.pill },
    filterText: { ...typography.meta, color: colors.inkSoft, fontWeight: '600' },
    filterTextSelected: { color: colors.onInk },
    results: { flex: 1 },
    resultsContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
    resultContainer: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    resultRow: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    audioPlayer: { paddingLeft: 44, paddingBottom: spacing.sm },
    resultPressed: { backgroundColor: colors.surfacePressed },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultCopy: { flex: 1, justifyContent: 'center' },
    resultTitle: { ...typography.body, color: colors.ink, fontWeight: '600' },
    resultMeta: { ...typography.meta, color: colors.inkMuted, marginTop: 2 },
    hint: { ...typography.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xxxl },
    emptyState: { alignItems: 'center', paddingTop: spacing.xxxl, gap: spacing.sm },
    emptyTitle: { ...typography.bodyStrong, color: colors.ink },
    emptyText: { ...typography.caption, color: colors.inkMuted },
  });
