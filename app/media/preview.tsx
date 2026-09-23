import { goBackOrHome } from '@/navigation/back';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Animated, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { AppDialog, BottomSheet, useItemActions, useSnackbar } from '@/components/visual';
import { InlineAudioPlayer, useAudioPlaybackActions } from '@/components/audio-playback';
import { LongPressItem } from '@/components/long-press-item';
import { Header, Input, PrimaryButton } from '@/components/ui';
import { findAttachment, findNote, setPinnedItem, trashAttachment, updateAttachment, updateNote } from '@/database/repositories';
import { openAttachmentExternally, shareAttachment } from '@/services/attachment-sharing';
import type { Attachment } from '@/types/domain';
import { parseNoteBlocks, serializeNoteBlocks } from '@/utils/note-blocks';
import { motionDuration } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';
import { resolveMediaUri } from '@/services/media-service';

export default function MediaPreview() {
  const styles = useThemeStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [attachment, setAttachment] = useState<Attachment>();
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [opening, setOpening] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renamed, setRenamed] = useState(false);
  const reducedMotion = useReducedMotion();
  const [imageOpacity] = useState(() => new Animated.Value(0));
  const [exitProgress] = useState(() => new Animated.Value(1));
  const { showSnackbar } = useSnackbar();
  const { showItemConfirmation } = useItemActions();
  const { stop, toggle } = useAudioPlaybackActions();
  const load = useCallback(async () => {
    if (!id) return;
    const next = await findAttachment(id);
    const resolved = next ? await resolveMediaUri(next.localPath).catch(() => null) : null;
    setDisplayUri(resolved);
    setMissing(!resolved);
    setAttachment(next);
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  const saveRename = async () => {
    if (!attachment || renaming) return;
    setRenaming(true);
    const name = renameValue.trim() || 'Anexo';
    try {
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
      setRenamed(true);
      playUISound('success-tick');
      showSnackbar('Nome do anexo atualizado', 'info');
      setTimeout(
        () => {
          setRenameOpen(false);
          setRenamed(false);
        },
        reducedMotion ? 80 : motionDuration.medium,
      );
    } catch {
      showSnackbar('Não foi possível renomear o anexo.', 'error');
    } finally {
      setRenaming(false);
    }
  };
  const remove = async () => {
    if (!attachment) return;
    stop(attachment.id);
    await trashAttachment(attachment.id);
    if (attachment.itemType === 'note') {
      const note = await findNote(attachment.itemId);
      if (note) {
        const blocks = parseNoteBlocks(note.content).filter((block) => !('attachmentId' in block) || block.attachmentId !== attachment.id);
        await updateNote(note.id, { content: serializeNoteBlocks(blocks) });
      }
    }
    Animated.timing(exitProgress, {
      toValue: 0,
      duration: reducedMotion ? 80 : motionDuration.normal,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      playUISound('swipe-soft');
      showSnackbar('Anexo removido', 'info');
      goBackOrHome();
    });
  };
  const pinAttachment = async (pinned: boolean) => {
    if (!attachment) return;
    await setPinnedItem('file', attachment.id, pinned);
    setAttachment((current) => (current?.id === attachment.id ? { ...current, pinned } : current));
    showSnackbar(pinned ? 'Anexo fixado' : 'Anexo desafixado', 'info');
  };

  if (!attachment)
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <Header title="Anexo" onBack={() => goBackOrHome()} />
        <Text style={styles.muted}>Anexo não encontrado ou removido.</Text>
      </SafeAreaView>
    );
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title={attachment.originalName || 'Anexo'} onBack={() => goBackOrHome()} />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: exitProgress,
            transform: [{ scale: exitProgress.interpolate({ inputRange: [0, 1], outputRange: [reducedMotion ? 1 : 0.96, 1] }) }],
          },
        ]}
      >
        {missing ? <Text style={styles.warning}>O arquivo não está mais disponível neste dispositivo.</Text> : null}
        {attachment.type === 'image' && displayUri && !missing ? (
          <LongPressItem
            title={attachment.originalName || 'Imagem'}
            style={styles.imageActionTarget}
            actions={attachmentActions(
              attachment,
              setRenameValue,
              setRenameOpen,
              showItemConfirmation,
              remove,
              toggle,
              showSnackbar,
              pinAttachment,
            )}
          >
            <Animated.Image
              source={{ uri: displayUri }}
              style={[styles.image, { opacity: imageOpacity }]}
              resizeMode="contain"
              onLoad={() =>
                Animated.timing(imageOpacity, {
                  toValue: 1,
                  duration: reducedMotion ? 80 : motionDuration.normal,
                  useNativeDriver: Platform.OS !== 'web',
                }).start()
              }
            />
          </LongPressItem>
        ) : null}
        {attachment.type === 'audio' ? (
          <View style={styles.audio}>
            <LongPressItem
              title={attachment.originalName || 'Áudio'}
              style={styles.previewActionTarget}
              actions={attachmentActions(
                attachment,
                setRenameValue,
                setRenameOpen,
                showItemConfirmation,
                remove,
                toggle,
                showSnackbar,
                pinAttachment,
              )}
            >
              <Text style={styles.title}>{attachment.originalName || 'Áudio salvo localmente'}</Text>
            </LongPressItem>
            <InlineAudioPlayer attachmentId={attachment.id} />
          </View>
        ) : null}
        {attachment.type === 'file' ? (
          <View style={styles.audio}>
            <LongPressItem
              title={attachment.originalName || 'Arquivo'}
              style={styles.previewActionTarget}
              actions={attachmentActions(
                attachment,
                setRenameValue,
                setRenameOpen,
                showItemConfirmation,
                remove,
                toggle,
                showSnackbar,
                pinAttachment,
              )}
            >
              <Text style={styles.title}>{attachment.originalName || 'Arquivo'}</Text>
            </LongPressItem>
            <Text style={styles.body}>
              O arquivo foi copiado para o armazenamento controlado pelo Nexo. Toque abaixo para abrir com um aplicativo compatível.
            </Text>
            <PrimaryButton
              disabled={missing}
              loading={opening}
              title="Abrir com aplicativo"
              onPress={async () => {
                if (!displayUri || opening) return;
                setOpening(true);
                try {
                  await openAttachmentExternally(attachment, displayUri);
                } catch {
                  setOpenError(true);
                } finally {
                  setOpening(false);
                }
              }}
            />
          </View>
        ) : null}
      </Animated.View>
      <BottomSheet visible={renameOpen} title="Renomear anexo" onClose={() => setRenameOpen(false)}>
        <Input value={renameValue} onChangeText={setRenameValue} placeholder="Nome do anexo" autoFocus />
        <View style={styles.renameButton}>
          <PrimaryButton
            title={renamed ? 'Nome salvo' : 'Salvar nome'}
            icon={renamed ? 'checkmark' : undefined}
            loading={renaming}
            onPress={saveRename}
          />
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
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: { flex: 1, padding: spacing.lg, gap: spacing.lg },
    image: { width: '100%', height: 360, backgroundColor: colors.surfaceMuted, borderRadius: 18 },
    audio: { gap: spacing.md, paddingTop: spacing.xl },
    previewActionTarget: { borderRadius: 12, paddingHorizontal: spacing.xs },
    imageActionTarget: { borderRadius: 18 },
    title: { ...typography.heading, color: colors.ink },
    body: { ...typography.body, color: colors.inkMuted },
    muted: { ...typography.body, color: colors.inkMuted, padding: spacing.lg },
    warning: { ...typography.body, color: colors.warning, backgroundColor: colors.warningSoft, padding: spacing.md, borderRadius: 12 },
    renameButton: { marginTop: spacing.md },
  });

function attachmentActions(
  attachment: Attachment,
  setRenameValue: (value: string) => void,
  setRenameOpen: (value: boolean) => void,
  showItemConfirmation: (options: {
    title: string;
    message?: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }) => void,
  remove: () => Promise<void>,
  toggle: (attachmentId: string) => Promise<void>,
  showSnackbar: (message: string, tone?: 'success' | 'error' | 'info') => void,
  pinAttachment: (pinned: boolean) => Promise<void>,
) {
  return [
    ...(attachment.type === 'audio'
      ? [{ label: 'Reproduzir / pausar', icon: 'play-circle-outline' as const, onPress: () => void toggle(attachment.id) }]
      : []),
    {
      label: 'Renomear',
      icon: 'create-outline' as const,
      onPress: () => {
        setRenameValue(attachment.originalName || 'Anexo');
        setRenameOpen(true);
      },
    },
    {
      label: attachment.pinned ? 'Desafixar' : 'Fixar',
      icon: attachment.pinned ? ('pin-outline' as const) : ('pin' as const),
      onPress: () => pinAttachment(!attachment.pinned),
    },
    {
      label: 'Compartilhar',
      icon: 'share-outline' as const,
      onPress: async () => {
        try {
          if (!(await shareAttachment(attachment))) showSnackbar('Compartilhamento indisponível neste dispositivo.', 'error');
        } catch {
          showSnackbar('Não foi possível compartilhar o anexo.', 'error');
        }
      },
    },
    {
      label: 'Remover',
      icon: 'trash-outline' as const,
      destructive: true,
      onPress: () =>
        showItemConfirmation({
          title: 'Remover este anexo?',
          message: 'O anexo será removido e enviado para a lixeira.',
          confirmLabel: 'Remover',
          destructive: true,
          onConfirm: remove,
        }),
    },
  ];
}
