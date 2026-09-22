import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Chip, EmptyState, Header, Input, ListRow } from '@/components/ui';
import { searchAll } from '@/database/repositories';
import type { UnifiedItem } from '@/types/domain';
export default function Search() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [results, setResults] = useState<UnifiedItem[]>([]);
  useEffect(() => {
    const timer = setTimeout(
      () =>
        searchAll(query).then((items) =>
          setResults(
            filter === 'Todos'
              ? items
              : items.filter((item) => item.type === filter.toLowerCase().replace('lembretes', 'reminder').replace('arquivos', 'file')),
          ),
        ),
      180,
    );
    return () => clearTimeout(timer);
  }, [query, filter]);
  return (
    <View style={styles.root}>
      <Header title="Busca" onBack={() => router.back()} />
      <View style={styles.content}>
        <Input value={query} onChangeText={setQuery} placeholder="Pesquisar…" autoFocus />
        <View style={styles.chips}>
          {['Todos', 'Notas', 'Tarefas', 'Arquivos', 'Lembretes'].map((item) => (
            <Chip key={item} label={item} selected={filter === item} onPress={() => setFilter(item)} />
          ))}
        </View>
        {query ? (
          results.length ? (
            results.map((item) => (
              <ListRow
                key={`${item.type}-${item.id}`}
                icon={
                  item.type === 'note'
                    ? 'document-text-outline'
                    : item.type === 'task'
                      ? 'checkmark-circle-outline'
                      : item.type === 'reminder'
                        ? 'notifications-outline'
                        : 'file-outline'
                }
                title={item.title}
                subtitle={`${item.subtitle} · ${item.date ? new Date(item.date).toLocaleDateString('pt-BR') : ''}`}
                onPress={() =>
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
                  } as never)
                }
              />
            ))
          ) : (
            <EmptyState icon="search-outline" title="Nada encontrado" description="Tente outro termo ou deixe para organizar depois." />
          )
        ) : (
          <Text style={styles.hint}>Pesquise por título, conteúdo, tags ou espaço.</Text>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.lg },
  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginVertical: spacing.lg },
  hint: { ...typography.body, color: colors.inkMuted, textAlign: 'center', marginTop: spacing.xxxl },
});
