import { goBackOrHome } from '@/navigation/back';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, typography, useThemeStyles, type AppColors } from '@/design/theme';
import { Header, Input, PrimaryButton, Segmented } from '@/components/ui';
import { BottomSheet, DateTimeSheet, useSnackbar } from '@/components/visual';
import { createTask, findTask, listNotes, updateTask } from '@/database/repositories';
import type { Note, Priority } from '@/types/domain';

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
  const [notes, setNotes] = useState<Note[]>([]);
  const [relatedNoteId, setRelatedNoteId] = useState<string | null>(params.relatedNoteId || null);
  const [showNotes, setShowNotes] = useState(false);
  const [noteQuery, setNoteQuery] = useState('');
  useEffect(() => {
    if (!params.id) setRelatedNoteId(params.relatedNoteId || null);
  }, [params.id, params.relatedNoteId]);
  useEffect(() => {
    listNotes()
      .then(setNotes)
      .catch(() => showSnackbar('Não foi possível carregar as notas', 'error'));
  }, [showSnackbar]);
  useEffect(() => {
    if (!params.id) return;
    findTask(params.id).then((task) => {
      if (!task) return;
      setExistingId(task.id);
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDate(task.dueAt ? new Date(task.dueAt) : null);
      setRelatedNoteId(task.relatedNoteId);
    });
  }, [params.id]);
  const selectedNote = notes.find((note) => note.id === relatedNoteId);
  const matchingNotes = notes.filter((note) =>
    (note.title || 'Nota sem título').toLocaleLowerCase('pt-BR').includes(noteQuery.trim().toLocaleLowerCase('pt-BR')),
  );
  const save = async () => {
    if (!title.trim()) return;
    const task = existingId
      ? await updateTask(existingId, { title, description, priority, dueAt: date?.toISOString() || null, relatedNoteId })
      : await createTask({
          title,
          description,
          priority,
          dueAt: date?.toISOString() || null,
          spaceId: params.spaceId || selectedNote?.spaceId || null,
          relatedNoteId,
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <Text style={styles.label}>Nota vinculada</Text>
          <Pressable
            style={styles.field}
            onPress={() => setShowNotes(true)}
            accessibilityRole="button"
            accessibilityLabel="Escolher nota vinculada"
          >
            <Text style={styles.fieldLabel} numberOfLines={1}>
              {selectedNote ? selectedNote.title || 'Nota sem título' : relatedNoteId ? 'Nota indisponível' : 'Nenhuma nota'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Input value={description} onChangeText={setDescription} placeholder="Descrição opcional" multiline />
          <View style={styles.bottom}>
            <PrimaryButton title={existingId ? 'Salvar tarefa' : 'Criar tarefa'} onPress={save} disabled={!title.trim()} />
          </View>
        </ScrollView>
        <BottomSheet visible={showNotes} title="Vincular nota" onClose={() => setShowNotes(false)}>
          <Input value={noteQuery} onChangeText={setNoteQuery} placeholder="Buscar nota" />
          <Pressable
            style={styles.noteOption}
            onPress={() => {
              setRelatedNoteId(null);
              setShowNotes(false);
            }}
            accessibilityRole="button"
          >
            <Text style={styles.noteOptionTitle}>Nenhuma nota</Text>
          </Pressable>
          {matchingNotes.map((note) => (
            <Pressable
              key={note.id}
              style={styles.noteOption}
              onPress={() => {
                setRelatedNoteId(note.id);
                setShowNotes(false);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.noteOptionTitle} numberOfLines={1}>
                {note.title || 'Nota sem título'}
              </Text>
              {relatedNoteId === note.id ? <Text style={styles.selected}>Selecionada</Text> : null}
            </Pressable>
          ))}
          {!matchingNotes.length ? <Text style={styles.emptyNotes}>Nenhuma nota encontrada.</Text> : null}
        </BottomSheet>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    safeRoot: { flex: 1, backgroundColor: colors.surface },
    root: { flex: 1, backgroundColor: colors.surface },
    content: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
    label: { ...typography.caption, color: colors.inkMuted, textTransform: 'uppercase', fontWeight: '700', marginTop: spacing.md },
    field: {
      minHeight: 52,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fieldLabel: { ...typography.body, color: colors.ink, flex: 1 },
    chevron: { fontSize: 24, color: colors.inkMuted },
    noteOption: {
      minHeight: 52,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    noteOptionTitle: { ...typography.body, color: colors.ink, flex: 1 },
    selected: { ...typography.caption, color: colors.accent },
    emptyNotes: { ...typography.caption, color: colors.inkMuted, paddingVertical: spacing.lg },
    bottom: { marginTop: 'auto', paddingBottom: spacing.lg },
  });
