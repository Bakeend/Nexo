import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/design/theme';
import { EmptyState, FloatingButton, Header, ListRow } from '@/components/ui';
import { listReminders } from '@/database/repositories';
import type { Reminder } from '@/types/domain';
export default function Reminders() {
  const [items, setItems] = useState<Reminder[]>([]);
  useFocusEffect(
    useCallback(() => {
      listReminders().then(setItems);
    }, []),
  );
  return (
    <View style={styles.root}>
      <Header title="Lembretes" action={() => router.push('/reminders/new')} actionLabel="+" />
      <View style={styles.content}>
        {items.length ? (
          items.map((item) => (
            <ListRow
              key={item.id}
              icon="notifications-outline"
              title={item.title}
              subtitle={`${new Date(item.scheduledAt).toLocaleString('pt-BR')} · ${item.notificationStatus}`}
              onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: item.id } })}
            />
          ))
        ) : (
          <EmptyState
            icon="notifications-outline"
            title="Nenhum lembrete"
            description="Crie um lembrete para lembrar na hora certa."
            action="Criar lembrete"
            onAction={() => router.push('/reminders/new')}
          />
        )}
      </View>
      <FloatingButton onPress={() => router.push('/reminders/new')} bottom={24} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, margin: spacing.lg, marginTop: 0, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: 18 },
});
