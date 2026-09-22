import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FloatingButton } from '@/components/ui';
import { findSpace, listNotes, listTasks } from '@/database/repositories';
import { colors, radius, spacing, typography } from '@/design/theme';
import type { Note, Space, Task } from '@/types/domain';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const [space, setSpace] = useState<Space>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState('Notas');

  useEffect(() => {
    if (!id) return;
    findSpace(id).then(setSpace);
    listNotes().then((all) => setNotes(all.filter((note) => note.spaceId === id)));
    listTasks('all').then((all) => setTasks(all.filter((task) => task.spaceId === id)));
  }, [id]);

  const rows = useMemo(
    () =>
      tab === 'Notas'
        ? notes.map((note) => ({
            id: note.id,
            title: note.title || 'Nota sem título',
            subtitle: formatDate(note.updatedAt),
            icon: 'document-outline' as const,
            path: '/notes/[id]' as const,
          }))
        : tab === 'Tarefas'
          ? tasks.map((task) => ({
              id: task.id,
              title: task.title,
              subtitle: formatDate(task.dueAt || task.updatedAt),
              icon: task.completedAt ? ('checkmark-circle-outline' as const) : ('ellipse-outline' as const),
              path: '/tasks/[id]' as const,
            }))
          : [],
    [notes, tab, tasks],
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconButton} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Pressable hitSlop={10} style={styles.iconButton} accessibilityLabel="Mais opções">
          <Ionicons name="ellipsis-horizontal" size={23} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.headingWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {space?.name || 'Espaço'}
        </Text>
      </View>

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

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {rows.length ? (
          rows.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => router.push({ pathname: row.path, params: { id: row.id } })}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
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
            </Pressable>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={26} color={colors.inkMuted} />
            <Text style={styles.emptyTitle}>{tab === 'Arquivos' ? 'Nenhum arquivo' : 'Nada por aqui ainda'}</Text>
            <Text style={styles.emptyText}>Crie algo neste espaço para manter tudo junto.</Text>
          </View>
        )}
      </ScrollView>

      <FloatingButton onPress={() => router.push({ pathname: '/notes/new', params: { spaceId: id } })} label="Nova nota" bottom={24} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    width: 32,
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
