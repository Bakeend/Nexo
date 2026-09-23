import { goBackOrHome } from '@/navigation/back';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { Header, Input, PrimaryButton, Segmented } from '@/components/ui';
import { DateTimeSheet, useSnackbar } from '@/components/visual';
import { createTask, findTask, updateTask } from '@/database/repositories';
import type { Priority } from '@/types/domain';

const priorityValues: Priority[] = ['none', 'low', 'medium', 'high'];
const priorityLabels: Record<Priority, string> = {
  none: 'Nenhuma',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export default function NewTask() {
  const styles = useThemeStyles(makeStyles);
  const { showSnackbar } = useSnackbar();
  const params = useLocalSearchParams<{ id?: string; seed?: string; relatedNoteId?: string; spaceId?: string }>();
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
      : await createTask({
          title,
          description,
          priority,
          dueAt: date?.toISOString() || null,
          spaceId: params.spaceId || null,
          relatedNoteId: params.relatedNoteId || null,
        });
    if (!task) return;
    showSnackbar(existingId ? 'Tarefa atualizada' : 'Tarefa criada', existingId ? 'info' : 'success');
    if (existingId) router.replace({ pathname: '/tasks/[id]', params: { id: task.id } });
    else goBackOrHome();
  };
  return (
    <SafeAreaView edges={['top']} style={styles.safeRoot}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header title={existingId ? 'Editar tarefa' : 'Nova tarefa'} onBack={() => goBackOrHome()} />
        <View style={styles.content}>
          <Input value={title} onChangeText={setTitle} placeholder="O que precisa ser feito?" autoFocus />
          <Text style={styles.label}>Prioridade</Text>
          <Segmented
            values={priorityValues.map((value) => priorityLabels[value])}
            selected={priorityLabels[priority]}
            onChange={(label) => {
              const value = priorityValues.find((candidate) => priorityLabels[candidate] === label);
              if (value) setPriority(value);
            }}
          />
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
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    safeRoot: { flex: 1, backgroundColor: colors.surface },
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
