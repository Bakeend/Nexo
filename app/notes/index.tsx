import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/design/theme';
import { EmptyState, FloatingButton, Header, ListRow } from '@/components/ui';
import { listNotes } from '@/database/repositories';
import type { Note } from '@/types/domain';
export default function Notes() {
  const [items, setItems] = useState<Note[]>([]);
  useFocusEffect(
    useCallback(() => {
      listNotes().then(setItems);
    }, []),
  );
  return (
    <View style={styles.root}>
      <Header title="Notas" action={() => router.push('/notes/new')} actionLabel="+" />
      <View style={styles.content}>
        {items.length ? (
          items.map((note) => (
            <ListRow
              key={note.id}
              icon="document-text-outline"
              title={note.title || 'Nota sem título'}
              subtitle={`Modificada ${new Date(note.updatedAt).toLocaleDateString('pt-BR')}`}
              onPress={() => router.push({ pathname: '/notes/[id]', params: { id: note.id } })}
            />
          ))
        ) : (
          <EmptyState
            icon="document-text-outline"
            title="Nenhuma nota ainda"
            description="Comece anotando algo para encontrar depois."
            action="Criar nota"
            onAction={() => router.push('/notes/new')}
          />
        )}
      </View>
      <FloatingButton onPress={() => router.push('/notes/new')} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, margin: spacing.lg, marginTop: 0, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: 18 },
});
