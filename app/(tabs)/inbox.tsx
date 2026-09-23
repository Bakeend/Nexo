import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { AppIcon, BottomNav, CaptureSheet, EmptyState, IconButton } from '@/components/ui';
import {
  createNote,
  createTask,
  deleteInbox,
  friendlyInboxTitle,
  listAttachments,
  listInbox,
  organizeInbox,
} from '@/database/repositories';
import { BottomSheet, useItemActions, useSnackbar } from '@/components/visual';
import { LongPressItem } from '@/components/long-press-item';
import { InlineAudioPlayer } from '@/components/audio-playback';
import type { InboxItem } from '@/types/domain';
import { shareAttachment } from '@/services/attachment-sharing';
import { animateListLayout } from '@/motion/layout';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { AnimatedListItem } from '@/motion/AnimatedListItem';
import { playUISound } from '@/services/ui-sound-service';

function formatInboxDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();

  if (isToday) {
    return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

export default function Inbox() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const { id: requestedItemId } = useLocalSearchParams<{ id?: string }>();
  const { showSnackbar } = useSnackbar();
  const { showItemConfirmation } = useItemActions();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const afterExitRef = useRef<(() => void) | null>(null);
  const [audioAttachmentIds, setAudioAttachmentIds] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const openedSearchItemRef = useRef<string | null>(null);
  const reducedMotion = useReducedMotion();
  const exitItem = (id: string, afterExit?: () => void) => {
    afterExitRef.current = afterExit || null;
    setExitingId(id);
  };
  const load = useCallback(async () => {
    const nextItems = await listInbox();
    animateListLayout(reducedMotion);
    setItems(nextItems);
    const audioEntries = await Promise.all(
      nextItems
        .filter((item) => item.itemType === 'audio')
        .map(async (item) => {
          const audio = (await listAttachments(item.itemId)).find((attachment) => attachment.type === 'audio');
          return audio ? ([item.id, audio.id] as const) : null;
        }),
    );
    setAudioAttachmentIds(Object.fromEntries(audioEntries.filter((entry): entry is readonly [string, string] => Boolean(entry))));
  }, [reducedMotion]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const openItem = async (item: InboxItem) => {
    const attachments = await listAttachments(item.itemId);
    if (attachments[0]) router.push({ pathname: '/media/preview', params: { id: attachments[0].id } });
    else setSelected(item);
  };
  useEffect(() => {
    if (!requestedItemId) {
      openedSearchItemRef.current = null;
      return;
    }
    const item = items.find((candidate) => candidate.id === requestedItemId);
    if (!item || openedSearchItemRef.current === item.id) return;
    openedSearchItemRef.current = item.id;
    setSelected(item);
    router.setParams({ id: '' });
  }, [items, requestedItemId]);
  const itemActions = (item: InboxItem) => [
    ...(item.itemType === 'file' || item.itemType === 'image' || item.itemType === 'audio'
      ? [
          ...(item.itemType === 'audio' ? [] : [{ label: 'Abrir anexo', icon: 'open-outline' as const, onPress: () => openItem(item) }]),
          {
            label: 'Compartilhar',
            icon: 'share-outline' as const,
            onPress: async () => {
              const attachments = await listAttachments(item.itemId);
              const attachment = attachments.find((candidate) => candidate.type === item.itemType);
              if (!attachment) return;
              try {
                if (!(await shareAttachment(attachment))) showSnackbar('Compartilhamento indisponível neste dispositivo.', 'error');
              } catch {
                showSnackbar('Não foi possível compartilhar o anexo.', 'error');
              }
            },
          },
        ]
      : []),
    {
      label: 'Transformar em nota',
      description: 'Continuar editando como nota',
      icon: 'document-text-outline' as const,
      onPress: async () => {
        const note = await createNote({ title: friendlyInboxTitle(item.rawText) });
        await organizeInbox(item.id);
        playUISound('success-tick');
        showSnackbar('Captura transformada em nota', 'success');
        exitItem(item.id, () => router.push({ pathname: '/notes/[id]', params: { id: note.id } }));
      },
    },
    {
      label: 'Transformar em tarefa',
      description: 'Adicionar à sua lista',
      icon: 'checkmark-circle-outline' as const,
      onPress: async () => {
        const task = await createTask({ title: friendlyInboxTitle(item.rawText) || 'Nova tarefa' });
        await organizeInbox(item.id);
        playUISound('success-tick');
        showSnackbar('Captura transformada em tarefa', 'success');
        exitItem(item.id, () => router.push({ pathname: '/tasks/[id]', params: { id: task.id } }));
      },
    },
    {
      label: 'Excluir',
      description: 'Mover para a lixeira',
      icon: 'trash-outline' as const,
      destructive: true,
      onPress: () =>
        showItemConfirmation({
          title: 'Excluir esta captura?',
          confirmLabel: 'Excluir',
          onConfirm: async () => {
            await deleteInbox(item.id);
            exitItem(item.id);
            showSnackbar('Captura excluída', 'info');
          },
        }),
    },
  ];
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Voltar" onPress={() => router.replace('/home')} />
        <Text style={styles.title} numberOfLines={1}>
          Caixa de entrada
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{items.length}</Text>
        </View>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 88 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {items.length ? (
          items.map((item) => (
            <AnimatedListItem
              key={item.id}
              style={styles.rowContainer}
              exiting={exitingId === item.id}
              onExitComplete={() => {
                const afterExit = afterExitRef.current;
                afterExitRef.current = null;
                void load().then(() => {
                  setExitingId(null);
                  afterExit?.();
                });
              }}
            >
              <LongPressItem
                title={friendlyInboxTitle(item.rawText)}
                actions={itemActions(item)}
                onPress={item.itemType === 'audio' ? undefined : () => openItem(item)}
                style={styles.row}
                pressedStyle={styles.rowPressed}
              >
                <AppIcon
                  name={item.itemType === 'image' ? 'image-outline' : item.itemType === 'audio' ? 'mic-outline' : 'document-outline'}
                  color={item.itemType === 'image' ? colors.accent : colors.inkSoft}
                  background={colors.surfaceMuted}
                  size={18}
                />
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {friendlyInboxTitle(item.rawText)}
                  </Text>
                  <Text style={styles.rowSubtitle}>{formatInboxDate(item.createdAt)}</Text>
                </View>
              </LongPressItem>
              {audioAttachmentIds[item.id] ? (
                <View style={styles.audioPlayer}>
                  <InlineAudioPlayer attachmentId={audioAttachmentIds[item.id]} />
                </View>
              ) : null}
            </AnimatedListItem>
          ))
        ) : (
          <EmptyState
            icon="file-tray-outline"
            title="Sua caixa está vazia"
            description="Guarde agora e organize depois. Capturas rápidas aparecem aqui."
            action="Capturar algo"
            onAction={() => setOpen(true)}
          />
        )}
      </ScrollView>
      <BottomNav onCreate={() => setOpen(true)} createExpanded={open} />
      <CaptureSheet
        visible={open}
        onClose={() => setOpen(false)}
        onCreated={async () => {
          await load();
          playUISound('capture');
        }}
      />
      <BottomSheet
        visible={Boolean(selected)}
        title={selected ? friendlyInboxTitle(selected.rawText) : 'Captura r?pida'}
        onClose={() => setSelected(null)}
      >
        <Text style={styles.captureText}>{selected?.rawText || ''}</Text>
      </BottomSheet>
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    header: {
      minHeight: 62,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: { ...typography.heading, flex: 1, color: colors.ink },
    badge: {
      minWidth: 28,
      height: 28,
      borderRadius: 14,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { ...typography.caption, color: colors.inkSoft, fontWeight: '700' },
    content: { flex: 1, paddingHorizontal: spacing.lg },
    rowContainer: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    row: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    audioPlayer: { paddingLeft: 50, paddingBottom: spacing.sm },
    rowPressed: { backgroundColor: colors.surfacePressed },
    captureText: { ...typography.body, color: colors.ink },
    rowCopy: { flex: 1 },
    rowTitle: { ...typography.bodyStrong, color: colors.ink },
    rowSubtitle: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
  });
