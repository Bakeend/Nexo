import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { ActionSheet, AppDialog, BottomSheet, useSnackbar } from '@/components/visual';
import { Header, Input, PrimaryButton, SecondaryButton } from '@/components/ui';
import { findAttachment, findNote, trashAttachment, updateAttachment, updateNote } from '@/database/repositories';
import type { Attachment } from '@/types/domain';
import { parseNoteBlocks, serializeNoteBlocks } from '@/utils/note-blocks';

export default function MediaPreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [attachment, setAttachment] = useState<Attachment>();
  const [missing, setMissing] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const { showSnackbar } = useSnackbar();
  const load = useCallback(async () => {
    if (!id) return;
    const next = await findAttachment(id);
    setAttachment(next);
    if (next) setMissing(!(await FileSystem.getInfoAsync(next.localPath)).exists);
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  const player = useAudioPlayer(attachment?.type === 'audio' ? attachment.localPath : null);
  const status = useAudioPlayerStatus(player);

  const saveRename = async () => {
    if (!attachment) return;
    const name = renameValue.trim() || 'Anexo';
    await updateAttachment(attachment.id, { originalName: name });
    if (attachment.itemType === 'note') {
      const note = await findNote(attachment.itemId);
      if (note) {
        const blocks = parseNoteBlocks(note.content).map((block) =>
          'attachmentId' in block && block.attachmentId === attachment.id ? { ...block, label: name } : block,
        );
        await updateNote(note.id, { content: serializeNoteBlocks(blocks) });
      }
    }
    setAttachment((current) => (current ? { ...current, originalName: name } : current));
    setRenameOpen(false);
    showSnackbar('Nome do anexo atualizado');
  };
  const remove = async () => {
    if (!attachment) return;
    await trashAttachment(attachment.id);
    if (attachment.itemType === 'note') {
      const note = await findNote(attachment.itemId);
      if (note) {
        const blocks = parseNoteBlocks(note.content).filter((block) => !('attachmentId' in block) || block.attachmentId !== attachment.id);
        await updateNote(note.id, { content: serializeNoteBlocks(blocks) });
      }
    }
    showSnackbar('Anexo removido');
    router.back();
  };

  if (!attachment)
    return (
      <View style={styles.root}>
        <Header title="Anexo" onBack={() => router.back()} />
        <Text style={styles.muted}>Anexo não encontrado ou removido.</Text>
      </View>
    );
  return (
    <View style={styles.root}>
      <Header title={attachment.originalName || 'Anexo'} onBack={() => router.back()} action={() => setActionsOpen(true)} />
      <View style={styles.content}>
        {missing ? <Text style={styles.warning}>O arquivo não está mais disponível neste dispositivo.</Text> : null}
        {attachment.type === 'image' && !missing ? (
          <Image source={{ uri: attachment.localPath }} style={styles.image} resizeMode="contain" />
        ) : null}
        {attachment.type === 'audio' ? (
          <View style={styles.audio}>
            <Text style={styles.title}>Áudio salvo localmente</Text>
            <Text style={styles.body}>{Math.round(status.duration || (attachment.durationMs || 0) / 1000)} segundos</Text>
            <PrimaryButton
              disabled={missing}
              title={status.playing ? 'Pausar áudio' : 'Reproduzir áudio'}
              onPress={() => (status.playing ? player.pause() : player.play())}
            />
          </View>
        ) : null}
        {attachment.type === 'file' ? (
          <View style={styles.audio}>
            <Text style={styles.title}>{attachment.originalName || 'Arquivo'}</Text>
            <Text style={styles.body}>O arquivo foi copiado para o armazenamento controlado pelo Nexo.</Text>
            <PrimaryButton
              disabled={missing}
              title="Abrir arquivo"
              onPress={() => Linking.openURL(attachment.localPath).catch(() => setOpenError(true))}
            />
          </View>
        ) : null}
        <SecondaryButton title="Voltar para a Caixa de entrada" onPress={() => router.replace('/inbox')} />
      </View>
      <ActionSheet
        visible={actionsOpen}
        title="Ações do anexo"
        onClose={() => setActionsOpen(false)}
        options={[
          {
            label: 'Renomear',
            icon: 'create-outline',
            onPress: () => {
              setRenameValue(attachment.originalName || 'Anexo');
              setRenameOpen(true);
            },
          },
          { label: 'Remover', icon: 'trash-outline', destructive: true, onPress: remove },
        ]}
      />
      <BottomSheet visible={renameOpen} title="Renomear anexo" onClose={() => setRenameOpen(false)}>
        <Input value={renameValue} onChangeText={setRenameValue} placeholder="Nome do anexo" autoFocus />
        <View style={styles.renameButton}>
          <PrimaryButton title="Salvar nome" onPress={saveRename} />
        </View>
      </BottomSheet>
      <AppDialog
        visible={openError}
        title="Não foi possível abrir"
        message="O sistema não encontrou um aplicativo compatível."
        confirmLabel="Entendi"
        onClose={() => setOpenError(false)}
        onConfirm={() => setOpenError(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  image: { width: '100%', height: 360, backgroundColor: colors.surfaceMuted, borderRadius: 18 },
  audio: { gap: spacing.md, paddingTop: spacing.xl },
  title: { ...typography.heading, color: colors.ink },
  body: { ...typography.body, color: colors.inkMuted },
  muted: { ...typography.body, color: colors.inkMuted, padding: spacing.lg },
  warning: { ...typography.body, color: colors.warning, backgroundColor: colors.warningSoft, padding: spacing.md, borderRadius: 12 },
  renameButton: { marginTop: spacing.md },
});
