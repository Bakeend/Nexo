import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchAll } from '@/database/repositories';
import { colors, radius, spacing, typography } from '@/design/theme';
import type { ItemType, UnifiedItem } from '@/types/domain';

const filters = ['Todos', 'Notas', 'Tarefas', 'Arquivos', 'Lembretes'] as const;
type Filter = (typeof filters)[number];

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

function openResult(item: UnifiedItem) {
  router.push({
    pathname:
      item.type === 'note'
        ? '/notes/[id]'
        : item.type === 'task'
          ? '/tasks/[id]'
          : item.type === 'reminder'
            ? '/reminders/[id]'
            : '/inbox',
    params: { id: item.id },
  } as never);
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Todos');
  const [results, setResults] = useState<UnifiedItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchAll(query).then((items) => setResults(items.filter((item) => matchesFilter(item.type, filter))));
    }, 180);
    return () => clearTimeout(timer);
  }, [query, filter]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.inkMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
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
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} style={styles.filtersScroll}>
        {filters.map((item) => {
          const selected = filter === item;
          return (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, selected && styles.filterChipSelected]}>
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent} keyboardShouldPersistTaps="handled">
        {query ? (
          results.length ? (
            results.map((item) => {
              const date = formatResultDate(item.date);
              const meta = [item.spaceName || item.subtitle, date].filter(Boolean).join(' · ');
              return (
                <Pressable key={`${item.type}-${item.id}`} onPress={() => openResult(item)} style={({ pressed }) => [styles.resultRow, pressed && styles.resultPressed]}>
                  <View style={styles.iconBox}>
                    <Ionicons name={resultIcon(item.type)} size={17} color={colors.inkSoft} />
                  </View>
                  <View style={styles.resultCopy}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                    {meta ? <Text style={styles.resultMeta} numberOfLines={1}>{meta}</Text> : null}
                  </View>
                </Pressable>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  filterText: { ...typography.meta, color: colors.inkSoft, fontWeight: '600' },
  filterTextSelected: { color: colors.white },
  results: { flex: 1 },
  resultsContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  resultRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
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
