import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/design/theme';
import { ActionSheet, AppDialog, Checkbox } from '@/components/visual';
import { AppIcon, Header, PrimaryButton, SecondaryButton } from '@/components/ui';
import { archiveNote, createTask, findNote, trashNote, updateNote } from '@/database/repositories';
import type { Note, NoteBlock } from '@/types/domain';
import { parseNoteBlocks, serializeNoteBlocks } from '@/utils/note-blocks';

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note>();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  const blocks = parseNoteBlocks(note.content);
  const updateBlocks = async (next: NoteBlock[]) => {
    await updateNote(note.id, { content: serializeNoteBlocks(next) });
    setNote((current) => current && { ...current, content: serializeNoteBlocks(next), updatedAt: new Date().toISOString() });
  };
  const createRelatedTask = async () => {
    const task = await createTask({ title: `Revisar: ${note.title || 'nota'}`, relatedNoteId: note.id });
    router.push({ pathname: '/tasks/[id]', params: { id: task.id } });
  };
  const deleteNote = async () => {
    setDeleteOpen(false);
    await trashNote(note.id);
    router.back();
  };

  return (
    <View style={styles.root}>
      <Header title="Nota" onBack={() => router.back()} action={() => setActionsOpen(true)} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{note.title || 'Nota sem título'}</Text>
        <Text style={styles.meta}>Atualizada em {new Date(note.updatedAt).toLocaleString('pt-BR')}</Text>
        {blocks.map((block, index) => {
          if (block.type === 'checklist')
            return (
              <View key={`checklist-${index}`} style={styles.checklistBlock}>
                {block.items.map((item, itemIndex) => (
                  <View key={item.id} style={styles.checklistRow}>
                    <Checkbox
                      checked={item.checked}
                      label={item.text || 'Item da checklist'}
                      onPress={() =>
                        updateBlocks(
                          blocks.map((current, blockIndex) =>
                            blockIndex === index && current.type === 'checklist'
                              ? {
                                  ...current,
                                  items: current.items.map((entry, entryIndex) =>
                                    entryIndex === itemIndex ? { ...entry, checked: !entry.checked } : entry,
                                  ),
                                }
                              : current,
                          ),
                        )
                      }
                    />
                    <Text style={[styles.body, item.checked && styles.checked]}>{item.text || 'Item sem texto'}</Text>
                  </View>
                ))}
              </View>
            );
          if (block.type === 'image' || block.type === 'file' || block.type === 'audio')
            return (
              <Pressable
                key={`${block.attachmentId}-${index}`}
                onPress={() => router.push({ pathname: '/media/preview', params: { id: block.attachmentId } })}
                style={styles.attachment}
              >
                <AppIcon
                  name={block.type === 'image' ? 'image-outline' : block.type === 'audio' ? 'mic-outline' : 'document-attach-outline'}
                />
                <View style={styles.attachmentCopy}>
                  <Text style={styles.attachmentTitle}>{block.label || 'Anexo'}</Text>
                  <Text style={styles.attachmentMeta}>Abrir conteúdo</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          if (block.type === 'link')
            return (
              <Pressable key={`link-${index}`} onPress={() => Linking.openURL(block.url)} style={styles.attachment}>
                <AppIcon name="link-outline" />
                <View style={styles.attachmentCopy}>
                  <Text style={styles.attachmentTitle}>{block.text}</Text>
                  <Text style={styles.attachmentMeta}>{block.url}</Text>
                </View>
              </Pressable>
            );
          if (block.type === 'heading')
            return (
              <Text key={`heading-${index}`} style={styles.heading}>
                {block.text}
              </Text>
            );
          if (block.type === 'bullet')
            return (
              <Text key={`bullet-${index}`} style={styles.body}>
                • {block.text}
              </Text>
            );
          if (block.type === 'text')
            return (
              <Text key={`text-${index}`} style={styles.body}>
                {block.text}
              </Text>
            );
          return null;
        })}
        <View style={styles.actions}>
          <SecondaryButton title="Editar nota" onPress={() => router.push({ pathname: '/notes/new', params: { id: note.id } })} />
          <PrimaryButton title="Criar tarefa relacionada" onPress={createRelatedTask} />
        </View>
      </ScrollView>
      <ActionSheet
        visible={actionsOpen}
        title="Ações da nota"
        onClose={() => setActionsOpen(false)}
        options={[
          { label: 'Editar', icon: 'create-outline', onPress: () => router.push({ pathname: '/notes/new', params: { id: note.id } }) },
          { label: 'Criar tarefa relacionada', icon: 'checkmark-circle-outline', onPress: createRelatedTask },
          {
            label: 'Tags',
            icon: 'pricetags-outline',
            onPress: () => router.push({ pathname: '/tags', params: { itemId: note.id, itemType: 'note' } } as never),
          },
          {
            label: note.pinned ? 'Desafixar' : 'Fixar',
            icon: note.pinned ? 'pin-outline' : 'pin',
            onPress: () => updateNote(note.id, { pinned: !note.pinned }).then(load),
          },
          {
            label: 'Arquivar',
            icon: 'archive-outline',
            onPress: async () => {
              await archiveNote(note.id);
              router.back();
            },
          },
          {
            label: 'Enviar para lixeira',
            description: 'Você poderá restaurar depois',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => setDeleteOpen(true),
          },
        ]}
      />
      <AppDialog
        visible={deleteOpen}
        title="Enviar nota para a lixeira?"
        message="O conteúdo ficará preservado e poderá ser restaurado depois."
        confirmLabel="Enviar para lixeira"
        destructive
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteNote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: { ...typography.title, color: colors.ink },
  meta: { ...typography.caption, color: colors.inkMuted, marginTop: 6, marginBottom: spacing.xl },
  body: { ...typography.body, color: colors.ink, lineHeight: 25, marginBottom: spacing.md, flex: 1 },
  heading: { ...typography.heading, color: colors.ink, marginVertical: spacing.md },
  checked: { textDecorationLine: 'line-through', color: colors.inkMuted },
  checklistBlock: { marginBottom: spacing.md },
  checklistRow: { flexDirection: 'row', alignItems: 'center' },
  attachment: {
    minHeight: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  attachmentCopy: { flex: 1 },
  attachmentTitle: { ...typography.bodyStrong, color: colors.ink },
  attachmentMeta: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
  chevron: { fontSize: 24, color: colors.inkMuted },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
  muted: { ...typography.body, color: colors.inkMuted, padding: spacing.lg },
});
