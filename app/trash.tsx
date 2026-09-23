import { goBackOrHome } from '@/navigation/back';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { EmptyState, Header, ListRow } from '@/components/ui';
import { AppDialog } from '@/components/visual';
import { listTrash, restoreTrashItem, type TrashEntry } from '@/database/repositories';
import { AnimatedListItem } from '@/motion/AnimatedListItem';
import { animateListLayout } from '@/motion/layout';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';
import { useSnackbar } from '@/components/visual';

const labels: Record<TrashEntry['type'], string> = {
  note: 'Nota',
  task: 'Tarefa',
  reminder: 'Lembrete',
  space: 'Espaço',
  inbox: 'Captura',
};

export default function Trash() {
  const styles = useThemeStyles(makeStyles);
  const [items, setItems] = useState<TrashEntry[]>([]);
  const [selected, setSelected] = useState<TrashEntry | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const { showSnackbar } = useSnackbar();
  const load = useCallback(async () => {
    const nextItems = await listTrash();
    animateListLayout(reducedMotion);
    setItems(nextItems);
  }, [reducedMotion]);
  useEffect(() => {
    load();
  }, [load]);
  const restore = async () => {
    if (!selected) return;
    await restoreTrashItem(selected);
    setExitingId(`${selected.type}-${selected.id}`);
    setSelected(null);
    playUISound('undo-soft');
    showSnackbar('Item restaurado', 'info');
  };
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Lixeira" onBack={() => goBackOrHome()} />
      <View style={styles.content}>
        {items.length ? (
          items.map((item, index) => (
            <AnimatedListItem
              key={`${item.type}-${item.id}`}
              delay={reducedMotion ? 0 : index * 30}
              exiting={exitingId === `${item.type}-${item.id}`}
              onExitComplete={() => {
                void load().then(() => setExitingId(null));
              }}
            >
              <ListRow
                icon="trash-outline"
                title={item.title}
                subtitle={`${labels[item.type]} · ${new Date(item.deletedAt).toLocaleDateString('pt-BR')}`}
                onPress={() => setSelected(item)}
              />
            </AnimatedListItem>
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
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, content: { flex: 1, padding: spacing.lg } });
