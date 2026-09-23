import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { EmptyState, FloatingButton, Header, ListRow } from '@/components/ui';
import { listNotes, trashNote, updateNote } from '@/database/repositories';
import type { Note } from '@/types/domain';
import { useItemActions, useSnackbar } from '@/components/visual';
import { goBackOrHome } from '@/navigation/back';
export default function Notes() {
  const styles = useThemeStyles(makeStyles);
  const [items, setItems] = useState<Note[]>([]);
  const { showItemConfirmation } = useItemActions();
  const { showSnackbar } = useSnackbar();
  const load = useCallback(() => listNotes().then(setItems), []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Notas" onBack={goBackOrHome} action={() => router.push('/notes/new')} actionIcon="add" actionLabel="Nova nota" />
      <View style={styles.content}>
        {items.length ? (
          items.map((note) => (
            <ListRow
              key={note.id}
              icon="document-text-outline"
              title={note.title || 'Nota sem título'}
              subtitle={`Modificada ${new Date(note.updatedAt).toLocaleDateString('pt-BR')}`}
              onPress={() => router.push({ pathname: '/notes/[id]', params: { id: note.id } })}
              longPressTitle={note.title || 'Nota'}
              longPressActions={[
                {
                  label: 'Editar',
                  icon: 'create-outline',
                  onPress: () => router.push({ pathname: '/notes/new', params: { id: note.id } }),
                },
                {
                  label: 'Criar tarefa vinculada',
                  description: 'Usar esta nota como contexto da tarefa',
                  icon: 'checkmark-circle-outline',
                  onPress: () =>
                    router.push({
                      pathname: '/tasks/new',
                      params: { seed: note.title || 'Nova tarefa', relatedNoteId: note.id, spaceId: note.spaceId || '' },
                    }),
                },
                {
                  label: note.pinned ? 'Desafixar' : 'Fixar',
                  icon: note.pinned ? 'pin-outline' : 'pin',
                  onPress: () => updateNote(note.id, { pinned: !note.pinned }).then(load),
                },
                {
                  label: 'Excluir',
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: () =>
                    showItemConfirmation({
                      title: 'Excluir esta nota?',
                      message: 'A nota poderá ser restaurada pela lixeira.',
                      confirmLabel: 'Excluir',
                      onConfirm: async () => {
                        await trashNote(note.id);
                        showSnackbar('Nota enviada para a lixeira', 'info');
                        await load();
                      },
                    }),
                },
              ]}
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
      <FloatingButton onPress={() => router.push('/notes/new')} bottom={24} />
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: {
      flex: 1,
      margin: spacing.lg,
      marginTop: 0,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 18,
    },
  });
