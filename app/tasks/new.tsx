import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, Input, PrimaryButton, Segmented } from '@/components/ui';
import { DateTimeSheet } from '@/components/visual';
import { createTask, findTask, updateTask } from '@/database/repositories';
import type { Priority } from '@/types/domain';

export default function NewTask() {
  const params = useLocalSearchParams<{ id?: string; seed?: string; relatedNoteId?: string }>();
  const [title, setTitle] = useState(params.seed || '');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('none');
  const [date, setDate] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [existingId, setExistingId] = useState<string>();
  useEffect(() => {
    if (!params.id) return;
    findTask(params.id).then((task) => {
      if (!task) return;
      setExistingId(task.id);
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDate(task.dueAt ? new Date(task.dueAt) : null);
    });
  }, [params.id]);
  const save = async () => {
    if (!title.trim()) return;
    const task = existingId
      ? await updateTask(existingId, { title, description, priority, dueAt: date?.toISOString() || null })
      : await createTask({ title, description, priority, dueAt: date?.toISOString() || null, relatedNoteId: params.relatedNoteId || null });
    if (!task) return;
    router.replace({ pathname: '/tasks/[id]', params: { id: task.id } });
  };
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={existingId ? 'Editar tarefa' : 'Nova tarefa'} onBack={() => router.back()} />
      <View style={styles.content}>
        <Input value={title} onChangeText={setTitle} placeholder="O que precisa ser feito?" autoFocus />
        <Text style={styles.label}>Prioridade</Text>
        <Segmented values={['none', 'low', 'medium', 'high']} selected={priority} onChange={(value) => setPriority(value as Priority)} />
        <Text style={styles.label}>Quando</Text>
        <Pressable style={styles.field} onPress={() => setShowDate(true)}>
          <Text style={styles.fieldLabel}>{date ? date.toLocaleString('pt-BR') : 'Sem data'}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <DateTimeSheet visible={showDate} value={date || new Date()} onClose={() => setShowDate(false)} onConfirm={setDate} />
        <Input value={description} onChangeText={setDescription} placeholder="Descrição opcional" multiline />
        <View style={styles.bottom}>
          <PrimaryButton title={existingId ? 'Salvar tarefa' : 'Criar tarefa'} onPress={save} disabled={!title.trim()} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  label: { ...typography.caption, color: colors.inkMuted, textTransform: 'uppercase', fontWeight: '700', marginTop: spacing.md },
  field: {
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: { ...typography.body, color: colors.ink },
  chevron: { fontSize: 24, color: colors.inkMuted },
  bottom: { marginTop: 'auto', paddingBottom: spacing.lg },
});
