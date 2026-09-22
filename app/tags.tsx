import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { createTag, addTagToItem, listTags, listTagsForItem, removeTagFromItem } from '@/database/repositories';
import type { Tag } from '@/types/domain';
import { Header, Input, ListRow, PrimaryButton } from '@/components/ui';

export default function Tags() {
  const { itemId, itemType } = useLocalSearchParams<{ itemId?: string; itemType?: 'note' | 'task' | 'reminder' }>();
  const [name, setName] = useState('');
  const [all, setAll] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Tag[]>([]);
  const load = useCallback(async () => {
    setAll(await listTags());
    if (itemId && itemType) setSelected(await listTagsForItem(itemId, itemType));
  }, [itemId, itemType]);
  useEffect(() => {
    load();
  }, [load]);
  const add = async () => {
    if (!name.trim()) return;
    const tag = await createTag(name);
    if (itemId && itemType) await addTagToItem(itemId, itemType, tag.name);
    setName('');
    await load();
  };
  const toggle = async (tag: Tag) => {
    if (!itemId || !itemType) return;
    const isSelected = selected.some((selectedTag) => selectedTag.id === tag.id);
    if (isSelected) await removeTagFromItem(itemId, itemType, tag.id);
    else await addTagToItem(itemId, itemType, tag.name);
    await load();
  };
  return (
    <View style={styles.root}>
      <Header title="Tags" onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.title}>{itemId ? 'Organizar por assunto' : 'Seus assuntos'}</Text>
        <Text style={styles.body}>
          {itemId ? 'Toque em uma tag existente ou crie uma nova.' : 'As tags ajudam a encontrar conteúdos relacionados.'}
        </Text>
        <View style={styles.addRow}>
          <Input value={name} onChangeText={setName} placeholder="#backend" />
          <PrimaryButton title="Adicionar" onPress={add} disabled={!name.trim()} />
        </View>
        {all.length ? (
          all.map((tag) => (
            <ListRow
              key={tag.id}
              icon="pricetag-outline"
              title={`#${tag.name}`}
              subtitle={
                itemId
                  ? selected.some((selectedTag) => selectedTag.id === tag.id)
                    ? 'Selecionada'
                    : 'Toque para selecionar'
                  : 'Tag criada'
              }
              onPress={itemId ? () => toggle(tag) : undefined}
              trailing={
                itemId && selected.some((selectedTag) => selectedTag.id === tag.id) ? <Text style={styles.check}>✓</Text> : undefined
              }
            />
          ))
        ) : (
          <Text style={styles.empty}>Nenhuma tag criada ainda.</Text>
        )}
        {itemId && selected.length ? <Text style={styles.note}>As tags selecionadas ficam salvas no item.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg },
  title: { ...typography.heading, color: colors.ink },
  body: { ...typography.body, color: colors.inkMuted, marginVertical: spacing.md },
  addRow: { gap: spacing.sm, marginBottom: spacing.lg },
  check: { color: colors.success, fontSize: 20, fontWeight: '700' },
  empty: { ...typography.body, color: colors.inkMuted, paddingVertical: spacing.xl },
  note: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.lg },
});
