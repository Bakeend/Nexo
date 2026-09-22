import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { BottomNav, CaptureSheet, FloatingButton, IconButton, ListRow, SectionTitle, useCapture } from '@/components/ui';
import { listInbox, listNotes, listReminders, listSpaces, listTasks } from '@/database/repositories';
import { useUIStore } from '@/stores/ui.store';

export default function Home() {
  const [counts, setCounts] = useState({ inbox: 0, notes: 0, tasks: 0, reminders: 0, spaces: 0 });
  const openCapture = useCapture();
  const captureOpen = useUIStore((s) => s.captureOpen);
  const setCaptureOpen = useUIStore((s) => s.setCaptureOpen);
  const load = useCallback(async () => {
    const [inbox, notes, tasks, reminders, spaces] = await Promise.all([
      listInbox(),
      listNotes(),
      listTasks('all'),
      listReminders(),
      listSpaces(),
    ]);
    setCounts({
      inbox: inbox.length,
      notes: notes.length,
      tasks: tasks.filter((t) => !t.completedAt).length,
      reminders: reminders.filter((r) => !r.completedAt).length,
      spaces: spaces.length,
    });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.date}>
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
            </Text>
          </View>
          <View style={styles.actions}>
            <IconButton icon="settings-outline" label="Configurações" onPress={() => router.push('/settings')} />
            <Pressable style={styles.addTop} onPress={openCapture} accessibilityLabel="Criar">
              <Text style={styles.addText}>+</Text>
            </Pressable>
          </View>
        </View>
        <SectionTitle title="Seu espaço" />
        <View style={styles.list}>
          {[
            {
              icon: 'today-outline' as const,
              title: 'Hoje',
              subtitle: `${counts.tasks} tarefas · ${counts.reminders} lembretes`,
              path: '/today',
            },
            {
              icon: 'file-tray-outline' as const,
              title: 'Caixa de entrada',
              subtitle: `${counts.inbox} itens para organizar`,
              path: '/inbox',
            },
            { icon: 'document-text-outline' as const, title: 'Notas', subtitle: `${counts.notes} notas`, path: '/notes' },
            { icon: 'checkmark-circle-outline' as const, title: 'Tarefas', subtitle: `${counts.tasks} pendentes`, path: '/tasks' },
            { icon: 'calendar-outline' as const, title: 'Calendário', subtitle: 'Ver seu dia', path: '/calendar' },
            { icon: 'search-outline' as const, title: 'Tudo', subtitle: `${counts.spaces} espaços · buscar conteúdo`, path: '/search' },
          ].map((item) => (
            <ListRow
              key={item.title}
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => router.push(item.path as never)}
            />
          ))}
        </View>
      </View>
      <BottomNav />
      <FloatingButton onPress={openCapture} />
      <CaptureSheet visible={captureOpen} onClose={() => setCaptureOpen(false)} onCreated={load} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.lg, paddingBottom: 100 },
  hero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: spacing.md },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  greeting: { ...typography.title, color: colors.ink },
  date: { ...typography.caption, color: colors.inkMuted, marginTop: 4, textTransform: 'capitalize' },
  addTop: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 28, fontWeight: '300', color: colors.ink, marginTop: -3 },
  list: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: spacing.md, overflow: 'hidden' },
});
