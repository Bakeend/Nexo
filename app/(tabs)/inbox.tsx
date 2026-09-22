import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/design/theme';
import { BottomNav, CaptureSheet, EmptyState, FloatingButton, Header, ListRow } from '@/components/ui';
import { createNote, createTask, deleteInbox, listAttachments, listInbox, organizeInbox } from '@/database/repositories';
import { ActionSheet } from '@/components/visual';
import type { InboxItem } from '@/types/domain';

export default function Inbox() {
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
      <ActionSheet
        visible={Boolean(selected)}
        title={selected?.item.rawText || 'Captura rápida'}
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
              const note = await createNote({ title: selected.item.rawText });
              await organizeInbox(selected.item.id);
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
              const task = await createTask({ title: selected.item.rawText || 'Nova tarefa' });
              await organizeInbox(selected.item.id);
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
            },
          },
        ]}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.lg, paddingBottom: 100 },
  count: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.lg },
  countNumber: { ...typography.title, color: colors.ink },
  countLabel: { ...typography.body, color: colors.inkMuted },
});
