import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/design/theme';
import { AppIcon, BottomNav, CaptureSheet, EmptyState, FloatingButton } from '@/components/ui';
import {
  createNote,
  createTask,
  deleteInbox,
  friendlyInboxTitle,
  listAttachments,
  listInbox,
  organizeInbox,
} from '@/database/repositories';
import { ActionSheet, useSnackbar } from '@/components/visual';
import type { InboxItem } from '@/types/domain';

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
  const { showSnackbar } = useSnackbar();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [selected, setSelected] = useState<{ item: InboxItem; attachmentId?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => setItems(await listInbox()), []);
  useEffect(() => {
    load();
  }, [load]);
  const actions = async (item: InboxItem) => {
    const attachments = await listAttachments(item.itemId);
    setSelected({ item, attachmentId: attachments[0]?.id });
  };
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Caixa de entrada</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{items.length}</Text>
        </View>
      </View>
      <View style={styles.content}>
        {items.length ? (
          items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => actions(item)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
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
            </Pressable>
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
      </View>
      <BottomNav />
      <FloatingButton onPress={() => setOpen(true)} />
      <CaptureSheet visible={open} onClose={() => setOpen(false)} onCreated={load} />
      <ActionSheet
        visible={Boolean(selected)}
        title={selected ? friendlyInboxTitle(selected.item.rawText) : 'Captura rápida'}
        onClose={() => setSelected(null)}
        options={[
          ...(selected?.attachmentId
            ? [
                {
                  label: 'Abrir conteúdo',
                  icon: 'open-outline' as const,
                  onPress: () => router.push({ pathname: '/media/preview', params: { id: selected.attachmentId as string } }),
                },
              ]
            : []),
          {
            label: 'Transformar em nota',
            description: 'Continuar editando como nota',
            icon: 'document-text-outline',
            onPress: async () => {
              if (!selected) return;
              const note = await createNote({ title: friendlyInboxTitle(selected.item.rawText) });
              await organizeInbox(selected.item.id);
              showSnackbar('Captura transformada em nota');
              setSelected(null);
              router.push({ pathname: '/notes/[id]', params: { id: note.id } });
            },
          },
          {
            label: 'Transformar em tarefa',
            description: 'Adicionar à sua lista',
            icon: 'checkmark-circle-outline',
            onPress: async () => {
              if (!selected) return;
              const task = await createTask({ title: friendlyInboxTitle(selected.item.rawText) || 'Nova tarefa' });
              await organizeInbox(selected.item.id);
              showSnackbar('Captura transformada em tarefa');
              setSelected(null);
              router.push({ pathname: '/tasks/[id]', params: { id: task.id } });
            },
          },
          {
            label: 'Excluir',
            description: 'Mover para a lixeira',
            icon: 'trash-outline',
            destructive: true,
            onPress: async () => {
              if (!selected) return;
              await deleteInbox(selected.item.id);
              setSelected(null);
              await load();
              showSnackbar('Captura excluída');
            },
          },
        ]}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    minHeight: 62,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { ...typography.heading, color: colors.ink },
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
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: 100 },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowPressed: { backgroundColor: colors.surfacePressed },
  rowCopy: { flex: 1 },
  rowTitle: { ...typography.bodyStrong, color: colors.ink },
  rowSubtitle: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
});
