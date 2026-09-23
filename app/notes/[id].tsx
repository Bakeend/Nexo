import { goBackOrHome } from '@/navigation/back';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography, useThemeStyles, type AppColors } from '@/design/theme';
import { BottomSheet, Checkbox, useItemActions, useSnackbar } from '@/components/visual';
import { InlineAudioPlayer, useAudioPlaybackActions } from '@/components/audio-playback';
import { AttachmentImagePreview } from '@/components/attachment-image-preview';
import { FormattedNoteText } from '@/components/formatted-note-text';
import { LongPressItem } from '@/components/long-press-item';
import { AppIcon, Header, Input, PrimaryButton } from '@/components/ui';
import { archiveNote, findAttachment, findNote, trashAttachment, trashNote, updateAttachment, updateNote } from '@/database/repositories';
import type { Attachment, Note, NoteBlock } from '@/types/domain';
import { parseNoteBlocks, serializeNoteBlocks } from '@/utils/note-blocks';
import { shareAttachment } from '@/services/attachment-sharing';
import { subscribeToNoteBlockChanges } from '@/services/note-block-events';

export default function NoteDetail() {
  const styles = useThemeStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note>();
  const [attachmentRename, setAttachmentRename] = useState<Attachment>();
  const [renameValue, setRenameValue] = useState('');
  const { showSnackbar } = useSnackbar();
  const { showItemConfirmation } = useItemActions();
  const { stop } = useAudioPlaybackActions();

  const load = useCallback(async () => {
    if (id) setNote(await findNote(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(
    () =>
      subscribeToNoteBlockChanges((changedNoteId) => {
        if (changedNoteId === id) void load();
      }),
    [id, load],
  );

  if (!note)
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <Header title="Nota" onBack={() => goBackOrHome()} />
        <Text style={styles.muted}>Nota não encontrada.</Text>
      </SafeAreaView>
    );

  const blocks = parseNoteBlocks(note.content);
  const updateBlocks = async (next: NoteBlock[]) => {
    const content = serializeNoteBlocks(next);
    await updateNote(note.id, { content });
    setNote((current) => current && { ...current, content, updatedAt: new Date().toISOString() });
  };
  const openEditor = () => router.push({ pathname: '/notes/new', params: { id: note.id } });
  const deleteNote = async () => {
    await trashNote(note.id);
    showSnackbar('Nota enviada para a lixeira', 'info');
    goBackOrHome();
  };
  const startRenameAttachment = (attachment: Attachment) => {
    setRenameValue(attachment.originalName || 'Anexo');
    setAttachmentRename(attachment);
  };
  const saveAttachmentRename = async () => {
    if (!attachmentRename) return;
    const name = renameValue.trim() || 'Anexo';
    await updateAttachment(attachmentRename.id, { originalName: name });
    await updateBlocks(
      blocks.map((block) => ('attachmentId' in block && block.attachmentId === attachmentRename.id ? { ...block, label: name } : block)),
    );
    setAttachmentRename(undefined);
    showSnackbar('Nome do anexo atualizado', 'info');
  };
  const removeAttachment = async (attachment: Attachment) => {
    if (attachment.type === 'audio') stop(attachment.id);
    await trashAttachment(attachment.id);
    await updateBlocks(blocks.filter((block) => !('attachmentId' in block) || block.attachmentId !== attachment.id));
    showSnackbar('Anexo removido', 'info');
  };
  const attachmentActions = (block: Extract<NoteBlock, { attachmentId: string }>) => [
    ...(block.type === 'audio'
      ? []
      : [
          {
            label: 'Abrir anexo',
            icon: 'open-outline' as const,
            onPress: () => router.push({ pathname: '/media/preview', params: { id: block.attachmentId } }),
          },
        ]),
    {
      label: 'Renomear',
      icon: 'create-outline' as const,
      onPress: () =>
        findAttachment(block.attachmentId).then((found) => {
          if (found) startRenameAttachment(found);
        }),
    },
    {
      label: 'Compartilhar',
      icon: 'share-outline' as const,
      onPress: async () => {
        const attachment = await findAttachment(block.attachmentId);
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
          message: 'O anexo será removido da nota e enviado para a lixeira.',
          confirmLabel: 'Excluir',
          onConfirm: async () => {
            const attachment = await findAttachment(block.attachmentId);
            if (attachment) await removeAttachment(attachment);
          },
        }),
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Nota" onBack={() => goBackOrHome()} action={openEditor} actionLabel="Editar" />
      <ScrollView contentContainerStyle={styles.content}>
        <LongPressItem
          title={note.title || 'Nota sem título'}
          style={styles.titleActionTarget}
          onPress={openEditor}
          actions={[
            { label: 'Editar', icon: 'create-outline', onPress: openEditor },
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
              label: 'Compartilhar',
              icon: 'share-outline',
              onPress: () => {
                const content = blocks
                  .map((block) => {
                    if (block.type === 'checklist') return block.items.map((item) => `${item.checked ? '✓' : '○'} ${item.text}`).join('\n');
                    if (block.type === 'link') return `${block.text} ${block.url}`;
                    if ('text' in block) return block.text;
                    return block.label || 'Anexo';
                  })
                  .filter(Boolean);
                return Share.share({ title: note.title || 'Nota', message: [note.title, ...content].filter(Boolean).join('\n\n') });
              },
            },
            {
              label: 'Arquivar',
              icon: 'archive-outline',
              onPress: async () => {
                await archiveNote(note.id);
                showSnackbar('Nota arquivada', 'info');
                goBackOrHome();
              },
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
                  onConfirm: deleteNote,
                }),
            },
          ]}
        >
          <Text style={styles.title}>{note.title || 'Nota sem título'}</Text>
        </LongPressItem>
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
          if (block.type === 'audio')
            return (
              <LongPressItem
                key={`${block.attachmentId}-${index}`}
                title="Áudio"
                containerRole="none"
                actions={attachmentActions(block)}
                style={styles.audioBlock}
              >
                <InlineAudioPlayer attachmentId={block.attachmentId} />
              </LongPressItem>
            );
          if (block.type === 'image' || block.type === 'file')
            return (
              <View key={`${block.attachmentId}-${index}`} style={styles.attachmentCard}>
                {block.type === 'image' ? (
                  <AttachmentImagePreview
                    attachmentId={block.attachmentId}
                    onOpen={() => router.push({ pathname: '/media/preview', params: { id: block.attachmentId } })}
                  />
                ) : null}
                {block.type === 'file' ? (
                  <LongPressItem
                    title={block.label || 'Anexo'}
                    actions={attachmentActions(block)}
                    onPress={() => router.push({ pathname: '/media/preview', params: { id: block.attachmentId } })}
                    style={styles.attachmentOpen}
                    pressedStyle={styles.attachmentPressed}
                  >
                    <AppIcon name="document-attach-outline" />
                    <View style={styles.attachmentCopy}>
                      <Text style={styles.attachmentTitle}>{block.label || 'Arquivo'}</Text>
                      <Text style={styles.attachmentMeta}>Abrir conteúdo</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </LongPressItem>
                ) : null}
              </View>
            );
          if (block.type === 'link')
            return (
              <LongPressItem
                key={`link-${index}`}
                title={block.text}
                onPress={() => Linking.openURL(block.url)}
                style={[styles.attachmentOpen, styles.linkAttachment]}
                actions={[
                  { label: 'Abrir link', icon: 'open-outline', onPress: () => Linking.openURL(block.url) },
                  {
                    label: 'Excluir link',
                    icon: 'trash-outline',
                    destructive: true,
                    onPress: () =>
                      showItemConfirmation({
                        title: 'Excluir este link?',
                        confirmLabel: 'Excluir',
                        onConfirm: () => updateBlocks(blocks.filter((_, blockIndex) => blockIndex !== index)),
                      }),
                  },
                ]}
              >
                <AppIcon name="link-outline" />
                <View style={styles.attachmentCopy}>
                  <Text style={styles.attachmentTitle}>{block.text}</Text>
                  <Text style={styles.attachmentMeta}>{block.url}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </LongPressItem>
            );
          if (block.type === 'heading')
            return (
              <Pressable key={`heading-${index}`} onPress={openEditor} accessibilityRole="button" accessibilityLabel="Editar nota">
                <FormattedNoteText text={block.text} marks={block.marks} style={styles.heading} />
              </Pressable>
            );
          if (block.type === 'bullet')
            return (
              <Pressable key={`bullet-${index}`} onPress={openEditor} accessibilityRole="button" accessibilityLabel="Editar nota">
                <Text style={styles.body}>
                  • <FormattedNoteText text={block.text} marks={block.marks} />
                </Text>
              </Pressable>
            );
          if (block.type === 'text')
            return (
              <Pressable key={`text-${index}`} onPress={openEditor} accessibilityRole="button" accessibilityLabel="Editar nota">
                <FormattedNoteText text={block.text} marks={block.marks} style={styles.body} />
              </Pressable>
            );
          return null;
        })}
      </ScrollView>
      <BottomSheet visible={Boolean(attachmentRename)} title="Renomear anexo" onClose={() => setAttachmentRename(undefined)}>
        <Input value={renameValue} onChangeText={setRenameValue} placeholder="Nome do anexo" autoFocus />
        <View style={styles.renameButton}>
          <PrimaryButton title="Salvar nome" onPress={saveAttachmentRename} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: { padding: spacing.lg, paddingBottom: 48 },
    titleActionTarget: { borderRadius: radius.md, marginHorizontal: -spacing.xs, paddingHorizontal: spacing.xs },
    title: { ...typography.title, color: colors.ink },
    meta: { ...typography.caption, color: colors.inkMuted, marginTop: 6, marginBottom: spacing.xl },
    body: { ...typography.body, color: colors.ink, lineHeight: 25, marginBottom: spacing.md, flex: 1 },
    heading: { ...typography.heading, color: colors.ink, marginVertical: spacing.md },
    checked: { textDecorationLine: 'line-through', color: colors.inkMuted },
    checklistBlock: { marginBottom: spacing.md },
    checklistRow: { flexDirection: 'row', alignItems: 'center' },
    attachmentCard: {
      minHeight: 64,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    audioBlock: { marginBottom: spacing.sm },
    attachmentPressed: { backgroundColor: colors.surfacePressed },
    linkAttachment: {
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.sm,
    },
    attachmentOpen: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 56,
    },
    attachmentCopy: { flex: 1 },
    attachmentTitle: { ...typography.bodyStrong, color: colors.ink },
    attachmentMeta: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
    chevron: { fontSize: 26, lineHeight: 30, color: colors.inkMuted, paddingHorizontal: spacing.xs },
    renameButton: { marginTop: spacing.md },
    muted: { ...typography.body, color: colors.inkMuted, padding: spacing.lg },
  });
