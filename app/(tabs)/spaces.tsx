import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/design/theme';
import { BottomNav, EmptyState, FloatingButton, Header, ListRow } from '@/components/ui';
import { listSpaces } from '@/database/repositories';
import type { Space } from '@/types/domain';

export default function Spaces() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const load = useCallback(async () => setSpaces(await listSpaces()), []);
  useEffect(() => {
    load();
  }, [load]);
  const add = () => router.push('/spaces/new');
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Espaços" action={add} actionLabel="+" />
      <View style={styles.content}>
        {spaces.length ? (
          spaces.map((space) => (
            <ListRow
              key={space.id}
              icon="folder-outline"
              title={space.name}
              subtitle="Contexto pessoal"
              trailing={<Text style={styles.chevron}>›</Text>}
              onPress={() => router.push({ pathname: '/spaces/[id]', params: { id: space.id } })}
            />
          ))
        ) : (
          <EmptyState
            icon="folder-open-outline"
            title="Nenhum espaço ainda"
            description="Crie contextos como Faculdade, Trabalho ou Projetos."
            action="Criar espaço"
            onAction={add}
          />
        )}
      </View>
      <BottomNav />
      <FloatingButton onPress={add} />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingBottom: 100,
    backgroundColor: colors.surface,
    margin: spacing.lg,
    marginTop: 0,
    borderRadius: 18,
  },
  chevron: { color: colors.inkMuted, fontSize: 24 },
});
