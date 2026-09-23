import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav, CaptureSheet, IconButton } from '@/components/ui';
import { listNotes, listSpaces, listTasks, setPinnedItem } from '@/database/repositories';
import { LongPressItem } from '@/components/long-press-item';
import { useSnackbar } from '@/components/visual';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import type { Space } from '@/types/domain';
import { AnimatedListItem } from '@/motion/AnimatedListItem';
import { animateListLayout } from '@/motion/layout';
import { useReducedMotion } from '@/motion/useReducedMotion';

type IconName = keyof typeof Ionicons.glyphMap;

function iconForSpace(space: Space): { name: IconName; color: string } {
  const normalized = space.name.trim().toLocaleLowerCase('pt-BR');

  if (normalized.includes('pessoal')) return { name: 'person-outline', color: colors.inkSoft };
  if (normalized.includes('faculdade') || normalized.includes('estudo')) return { name: 'school-outline', color: colors.inkSoft };
  if (normalized.includes('trabalho')) return { name: 'briefcase-outline', color: colors.inkSoft };
  if (normalized.includes('projeto')) return { name: 'document-text-outline', color: colors.inkSoft };
  if (normalized.includes('finan')) return { name: 'wallet-outline', color: colors.success };

  if (space.icon && space.icon in Ionicons.glyphMap) {
    return { name: space.icon as IconName, color: colors.inkSoft };
  }

  return { name: 'folder-outline', color: colors.inkSoft };
}

export default function Spaces() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [captureOpen, setCaptureOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { showSnackbar } = useSnackbar();

  const load = useCallback(async () => {
    const [nextSpaces, notes, tasks] = await Promise.all([listSpaces(), listNotes(), listTasks('all')]);
    const nextCounts: Record<string, number> = {};

    for (const space of nextSpaces) {
      nextCounts[space.id] =
        notes.filter((note) => note.spaceId === space.id).length + tasks.filter((task) => task.spaceId === space.id).length;
    }

    animateListLayout(reducedMotion);
    setSpaces(nextSpaces);
    setCounts(nextCounts);
  }, [reducedMotion]);

  useEffect(() => {
    load();
  }, [load]);

  const add = () => router.push('/spaces/new');

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Voltar" onPress={() => router.replace('/home')} />
        <Text style={styles.title}>Espaços</Text>
        <IconButton icon="add" size={27} label="Novo espaço" onPress={add} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 88 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {spaces.map((space) => {
          const icon = iconForSpace(space);
          return (
            <AnimatedListItem key={space.id}>
              <LongPressItem
                title={space.name}
                actions={[
                  {
                    label: space.pinned ? 'Desafixar' : 'Fixar',
                    icon: space.pinned ? 'pin-outline' : 'pin',
                    onPress: async () => {
                      await setPinnedItem('space', space.id, !space.pinned);
                      showSnackbar(space.pinned ? 'Espaço desafixado' : 'Espaço fixado', 'info');
                      await load();
                    },
                  },
                ]}
                onPress={() => router.push({ pathname: '/spaces/[id]', params: { id: space.id } })}
                style={styles.row}
                pressedStyle={styles.rowPressed}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={icon.name} size={18} color={icon.color} />
                </View>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {space.name}
                </Text>
                <Text style={styles.count}>{counts[space.id] ?? 0}</Text>
              </LongPressItem>
            </AnimatedListItem>
          );
        })}

        <Pressable onPress={add} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
          <View style={[styles.iconWrap, styles.addIconWrap]}>
            <Ionicons name="add" size={20} color={colors.inkMuted} />
          </View>
          <Text style={styles.newSpace}>Novo espaço</Text>
        </Pressable>
      </ScrollView>

      <BottomNav onCreate={() => setCaptureOpen(true)} createExpanded={captureOpen} />
      <CaptureSheet visible={captureOpen} onClose={() => setCaptureOpen(false)} onCreated={load} />
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
      justifyContent: 'space-between',
    },
    title: { ...typography.heading, flex: 1, color: colors.ink },
    content: { flex: 1, paddingHorizontal: spacing.lg },
    row: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    rowPressed: { backgroundColor: colors.surfacePressed },
    iconWrap: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addIconWrap: {
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
    },
    rowTitle: { ...typography.body, flex: 1, color: colors.ink },
    count: { ...typography.caption, color: colors.inkMuted, minWidth: 24, textAlign: 'right' },
    newSpace: { ...typography.body, color: colors.inkMuted },
  });
