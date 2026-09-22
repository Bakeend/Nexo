import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '@/components/ui';
import { listNotes, listSpaces, listTasks } from '@/database/repositories';
import { colors, spacing, typography } from '@/design/theme';
import type { Space } from '@/types/domain';

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
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [nextSpaces, notes, tasks] = await Promise.all([listSpaces(), listNotes(), listTasks('all')]);
    const nextCounts: Record<string, number> = {};

    for (const space of nextSpaces) {
      nextCounts[space.id] =
        notes.filter((note) => note.spaceId === space.id).length + tasks.filter((task) => task.spaceId === space.id).length;
    }

    setSpaces(nextSpaces);
    setCounts(nextCounts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = () => router.push('/spaces/new');

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Espaços</Text>
        <Pressable onPress={add} accessibilityRole="button" accessibilityLabel="Novo espaço" hitSlop={10} style={styles.headerAction}>
          <Ionicons name="add" size={27} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {spaces.map((space) => {
          const icon = iconForSpace(space);
          return (
            <Pressable
              key={space.id}
              onPress={() => router.push({ pathname: '/spaces/[id]', params: { id: space.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={icon.name} size={18} color={icon.color} />
              </View>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {space.name}
              </Text>
              <Text style={styles.count}>{counts[space.id] ?? 0}</Text>
            </Pressable>
          );
        })}

        <Pressable onPress={add} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
          <View style={[styles.iconWrap, styles.addIconWrap]}>
            <Ionicons name="add" size={20} color={colors.inkMuted} />
          </View>
          <Text style={styles.newSpace}>Novo espaço</Text>
        </Pressable>
      </View>

      <BottomNav />
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
  headerAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: 88 },
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
