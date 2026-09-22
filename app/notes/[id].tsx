import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, PrimaryButton, SecondaryButton } from '@/components/ui';
import { archiveNote, createTask, findNote, trashNote, updateNote } from '@/database/repositories';
import type { Note, NoteBlock } from '@/types/domain';

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note>();
  const load = useCallback(async () => {
    if (id) setNote(await findNote(id));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  if (!note)
    return (
      <View style={styles.root}>
        <Header title="Nota" onBack={() => router.back()} />
        <Text style={styles.muted}>Nota não encontrada.</Text>
      </View>
    );
  let blocks: NoteBlock[];
  try {
    blocks = JSON.parse(note.content) as NoteBlock[];
  } catch {
    blocks = [{ type: 'text', text: note.content }];
  }
  const createRelatedTask = async () => {
    const task = await createTask({ title: `Revisar: ${note.title || 'nota'}`, relatedNoteId: note.id });
    router.push({ pathname: '/tasks/[id]', params: { id: task.id } });
  };
  const menu = () =>
    Alert.alert('Ações da nota', undefined, [
      { text: 'Editar', onPress: () => router.push({ pathname: '/notes/new', params: { id: note.id } }) },
      { text: 'Criar tarefa relacionada', onPress: createRelatedTask },
      { text: 'Tags', onPress: () => router.push({ pathname: '/tags', params: { itemId: note.id, itemType: 'note' } } as never) },
      { text: note.pinned ? 'Desafixar' : 'Fixar', onPress: () => updateNote(note.id, { pinned: !note.pinned }).then(load) },
      {
        text: 'Arquivar',
        onPress: async () => {
          await archiveNote(note.id);
          router.back();
        },
      },
      {
        text: 'Enviar para lixeira',
        style: 'destructive',
        onPress: async () => {
          await trashNote(note.id);
          router.back();
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  return (
    <View style={styles.root}>
      <Header title="Nota" onBack={() => router.back()} action={menu} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{note.title || 'Nota sem título'}</Text>
        <Text style={styles.meta}>Atualizada em {new Date(note.updatedAt).toLocaleString('pt-BR')}</Text>
        {blocks.map((block, index) => (
          <Text key={index} style={block.type === 'heading' ? styles.heading : block.type === 'checklist' ? styles.checklist : styles.body}>
            {block.type === 'checklist' ? `${block.checked ? '☑' : '☐'} ${block.text}` : 'text' in block ? block.text : ''}
          </Text>
        ))}
        <View style={styles.actions}>
          <SecondaryButton title="Editar nota" onPress={() => router.push({ pathname: '/notes/new', params: { id: note.id } })} />
          <PrimaryButton title="Criar tarefa relacionada" onPress={createRelatedTask} />
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: { ...typography.title, color: colors.ink },
  meta: { ...typography.caption, color: colors.inkMuted, marginTop: 6, marginBottom: spacing.xl },
  body: { ...typography.body, color: colors.ink, lineHeight: 25, marginBottom: spacing.md },
  heading: { ...typography.heading, color: colors.ink, marginVertical: spacing.md },
  checklist: { ...typography.body, color: colors.ink, lineHeight: 26 },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
  muted: { ...typography.body, color: colors.inkMuted, padding: spacing.lg },
});
