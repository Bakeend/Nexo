import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/design/theme';
import { EmptyState, Header, ListRow } from '@/components/ui';
import { AppDialog } from '@/components/visual';
import { listTrash, restoreTrashItem, type TrashEntry } from '@/database/repositories';

const labels: Record<TrashEntry['type'], string> = {
  note: 'Nota',
  task: 'Tarefa',
  reminder: 'Lembrete',
  space: 'Espaço',
  inbox: 'Captura',
};

export default function Trash() {
  const [items, setItems] = useState<TrashEntry[]>([]);
  const [selected, setSelected] = useState<TrashEntry | null>(null);
  const load = useCallback(async () => setItems(await listTrash()), []);
  useEffect(() => {
    load();
  }, [load]);
  const restore = async () => {
    if (!selected) return;
    await restoreTrashItem(selected);
    setSelected(null);
    await load();
  };
  return (
    <View style={styles.root}>
      <Header title="Lixeira" onBack={() => router.back()} />
      <View style={styles.content}>
        {items.length ? (
          items.map((item) => (
            <ListRow
              key={`${item.type}-${item.id}`}
              icon="trash-outline"
              title={item.title}
              subtitle={`${labels[item.type]} · ${new Date(item.deletedAt).toLocaleDateString('pt-BR')}`}
              onPress={() => setSelected(item)}
            />
          ))
        ) : (
          <EmptyState
            icon="trash-outline"
            title="A lixeira está vazia"
            description="Itens excluídos permanecem aqui até você restaurá-los."
          />
        )}
      </View>
      <AppDialog
        visible={Boolean(selected)}
        title="Restaurar item?"
        message={selected ? `${selected.title} voltará para o Nexo.` : undefined}
        confirmLabel="Restaurar"
        onClose={() => setSelected(null)}
        onConfirm={restore}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, content: { flex: 1, padding: spacing.lg } });
