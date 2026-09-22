import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { BottomNav, CaptureSheet, EmptyState, FloatingButton, Header, ListRow } from '@/components/ui';
import { createNote, createTask, deleteInbox, listAttachments, listInbox, organizeInbox } from '@/database/repositories';
import type { InboxItem } from '@/types/domain';
import { useUIStore } from '@/stores/ui.store';

export default function Inbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const open = useUIStore((s) => s.captureOpen);
  const setOpen = useUIStore((s) => s.setCaptureOpen);
  const load = useCallback(async () => setItems(await listInbox()), []);
  useEffect(() => {
    load();
  }, [load]);
  const actions = async (item: InboxItem) => {
    const attachments = await listAttachments(item.itemId);
    const openAttachment = attachments[0];
    Alert.alert(item.rawText || 'Captura rápida', 'O que você quer fazer?', [
      ...(openAttachment
        ? [{ text: 'Abrir conteúdo', onPress: () => router.push({ pathname: '/media/preview', params: { id: openAttachment.id } }) }]
        : []),
      {
        text: 'Transformar em nota',
        onPress: async () => {
          const note = await createNote({ title: item.rawText });
          await organizeInbox(item.id);
          router.push({ pathname: '/notes/[id]', params: { id: note.id } });
        },
      },
      {
        text: 'Transformar em tarefa',
        onPress: async () => {
          const task = await createTask({ title: item.rawText || 'Nova tarefa' });
          await organizeInbox(item.id);
          router.push({ pathname: '/tasks/[id]', params: { id: task.id } });
        },
      },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteInbox(item.id);
          load();
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };
  return (
    <View style={styles.root}>
      <Header title="Caixa de entrada" action={() => setOpen(true)} actionLabel="+" />
      <View style={styles.content}>
        <View style={styles.count}>
          <Text style={styles.countNumber}>{items.length}</Text>
          <Text style={styles.countLabel}>itens ainda não organizados</Text>
        </View>
        {items.length ? (
          items.map((item) => (
            <ListRow
              key={item.id}
              icon={item.itemType === 'image' ? 'image-outline' : item.itemType === 'audio' ? 'mic-outline' : 'file-outline'}
              title={item.rawText || 'Captura rápida'}
              subtitle={`${item.itemType} · ${new Date(item.createdAt).toLocaleDateString('pt-BR')}`}
              onPress={() => actions(item)}
            />
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
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.lg, paddingBottom: 100 },
  count: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.lg },
  countNumber: { ...typography.title, color: colors.ink },
  countLabel: { ...typography.body, color: colors.inkMuted },
});
