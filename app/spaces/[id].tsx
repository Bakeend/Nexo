import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { EmptyState, FloatingButton, Header, ListRow, Segmented } from '@/components/ui';
import { findSpace, listNotes, listTasks } from '@/database/repositories';
import type { Note, Space, Task } from '@/types/domain';

export default function SpaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [space, setSpace] = useState<Space>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState('Notas');
  useEffect(() => {
    if (id) {
      findSpace(id).then(setSpace);
      listNotes().then((all) => setNotes(all.filter((n) => n.spaceId === id)));
      listTasks('all').then((all) => setTasks(all.filter((t) => t.spaceId === id)));
    }
  }, [id]);
  const rows =
    tab === 'Notas'
      ? notes.map((n) => ({
          id: n.id,
          title: n.title || 'Nota sem título',
          subtitle: 'Nota',
          icon: 'document-text-outline' as const,
          path: '/notes/[id]',
        }))
      : tab === 'Tarefas'
        ? tasks.map((t) => ({
            id: t.id,
            title: t.title,
            subtitle: t.completedAt ? 'Concluída' : 'Pendente',
            icon: 'checkmark-circle-outline' as const,
            path: '/tasks/[id]',
          }))
        : [];
  return (
    <View style={styles.root}>
      <Header title={space?.name || 'Espaço'} onBack={() => router.back()} action={() => undefined} />
      <View style={styles.content}>
        <Segmented values={['Notas', 'Tarefas', 'Arquivos']} selected={tab} onChange={setTab} />
        {rows.length ? (
          rows.map((row) => (
            <ListRow
              key={row.id}
              icon={row.icon}
              title={row.title}
              subtitle={row.subtitle}
              onPress={() => router.push({ pathname: row.path as never, params: { id: row.id } })}
            />
          ))
        ) : (
          <EmptyState
            icon="folder-open-outline"
            title="Nada por aqui ainda"
            description="Crie algo dentro deste espaço para manter tudo junto."
            action="Criar nota"
            onAction={() => router.push({ pathname: '/notes/new', params: { spaceId: id } })}
          />
        )}
      </View>
      <FloatingButton onPress={() => router.push({ pathname: '/notes/new', params: { spaceId: id } })} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.lg },
  title: { ...typography.heading, color: colors.ink },
});
