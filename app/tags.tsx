import { goBackOrHome } from '@/navigation/back';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { createTag, addTagToItem, listTags, listTagsForItem, removeTagFromItem } from '@/database/repositories';
import type { Tag } from '@/types/domain';
import { Header, Input, ListRow, PrimaryButton } from '@/components/ui';
import { AnimatedPressable } from '@/motion/AnimatedPressable';
import { AnimatedListItem } from '@/motion/AnimatedListItem';
import { motionSpring } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';
import { useSnackbar } from '@/components/visual';

export default function Tags() {
  const styles = useThemeStyles(makeStyles);
  const { itemId, itemType } = useLocalSearchParams<{ itemId?: string; itemType?: 'note' | 'task' | 'reminder' }>();
  const [name, setName] = useState('');
  const [all, setAll] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Tag[]>([]);
  const { showSnackbar } = useSnackbar();
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
    playUISound('pop');
    showSnackbar('Tag criada', 'success');
    await load();
  };
  const toggle = async (tag: Tag) => {
    if (!itemId || !itemType) return;
    const isSelected = selected.some((selectedTag) => selectedTag.id === tag.id);
    if (isSelected) await removeTagFromItem(itemId, itemType, tag.id);
    else await addTagToItem(itemId, itemType, tag.name);
    playUISound('selection-click');
    await load();
  };
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Tags" onBack={() => goBackOrHome()} />
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
            <AnimatedListItem key={tag.id}>
              {itemId ? (
                <TagRow tag={tag} selected={selected.some((selectedTag) => selectedTag.id === tag.id)} onPress={() => toggle(tag)} />
              ) : (
                <ListRow icon="pricetag-outline" title={`#${tag.name}`} subtitle="Tag criada" />
              )}
            </AnimatedListItem>
          ))
        ) : (
          <Text style={styles.empty}>Nenhuma tag criada ainda.</Text>
        )}
        {itemId && selected.length ? <Text style={styles.note}>As tags selecionadas ficam salvas no item.</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function TagRow({ tag, selected, onPress }: { tag: Tag; selected: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const [selection] = useState(() => new Animated.Value(selected ? 1 : 0));
  const backgroundColor = selection.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, colors.accentSoft] });
  const textColor = selection.interpolate({ inputRange: [0, 1], outputRange: [colors.ink, colors.accentDark] });

  useEffect(() => {
    if (reducedMotion) {
      selection.setValue(selected ? 1 : 0);
      return;
    }
    Animated.spring(selection, { toValue: selected ? 1 : 0, ...motionSpring.selection, useNativeDriver: false }).start();
  }, [reducedMotion, selected, selection]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`#${tag.name}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      pressedScale={0.97}
      style={styles.tagRow}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.tagBackground, { backgroundColor, pointerEvents: 'none' }]} />
      <Ionicons name="pricetag-outline" size={19} color={selected ? colors.accent : colors.inkMuted} />
      <View style={styles.tagCopy}>
        <Animated.Text style={[styles.tagTitle, { color: textColor }]}>#{tag.name}</Animated.Text>
        <Text style={styles.tagSubtitle}>{selected ? 'Selecionada' : 'Toque para selecionar'}</Text>
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} /> : null}
    </AnimatedPressable>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: spacing.lg },
    title: { ...typography.heading, color: colors.ink },
    body: { ...typography.body, color: colors.inkMuted, marginVertical: spacing.md },
    addRow: { gap: spacing.sm, marginBottom: spacing.lg },
    tagRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: 12 },
    tagBackground: { borderRadius: 12 },
    tagCopy: { flex: 1 },
    tagTitle: { ...typography.bodyStrong },
    tagSubtitle: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
    empty: { ...typography.body, color: colors.inkMuted, paddingVertical: spacing.xl },
    note: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.lg },
  });
