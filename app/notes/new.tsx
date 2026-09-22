import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/design/theme';
import { Header, IconButton, Input } from '@/components/ui';
import { createNote, findNote, updateNote } from '@/database/repositories';

export default function NewNote() {
  const params = useLocalSearchParams<{ id?: string; seed?: string; spaceId?: string }>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(params.seed || '');
  const [noteId, setNoteId] = useState<string | null>(params.id || null);
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (params.id)
      findNote(params.id).then((note) => {
        if (!note) return;
        setTitle(note.title || '');
        try {
          const blocks = JSON.parse(note.content) as Array<{ text?: string }>;
          setBody(blocks.map((block) => block.text || '').join('\n'));
        } catch {
          setBody(note.content);
        }
      });
  }, [params.id]);
  const save = useCallback(async () => {
    const content = JSON.stringify([{ type: 'text', text: body }]);
    setStatus('Salvando…');
    if (noteId) await updateNote(noteId, { title: title || null, content });
    else {
      const note = await createNote({ title: title || null, content, spaceId: params.spaceId || null });
      setNoteId(note.id);
    }
    setStatus('Salvo');
  }, [body, noteId, params.spaceId, title]);
  useEffect(() => {
    if (!title && !body) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save().catch(() => setStatus('Não foi possível salvar'));
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [body, save, title]);
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        title=""
        onBack={() => {
          if (noteId) router.replace({ pathname: '/notes/[id]', params: { id: noteId } });
          else router.back();
        }}
        action={save}
        actionLabel={status || 'Salvar'}
      />
      <View style={styles.editor}>
        <Input value={title} onChangeText={setTitle} placeholder="Título" style={styles.titleInput} />
        <Input value={body} onChangeText={setBody} placeholder="Comece a escrever…" multiline style={styles.bodyInput} />
      </View>
      <View style={styles.toolbar}>
        <IconButton icon="text-outline" onPress={() => setBody((v) => `${v}\n`)} label="Formatação" />
        <IconButton icon="checkbox-outline" onPress={() => setBody((v) => `${v}\n☐ `)} label="Checklist" />
        <IconButton icon="attach-outline" onPress={() => undefined} label="Anexo" />
        <IconButton icon="image-outline" onPress={() => router.push('/media/image' as never)} label="Imagem" />
        <IconButton icon="mic-outline" onPress={() => router.push('/media/audio' as never)} label="Áudio" />
        <IconButton icon="ellipsis-horizontal" onPress={() => undefined} label="Mais opções" />
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  editor: { flex: 1, padding: spacing.lg },
  titleInput: { backgroundColor: 'transparent', paddingHorizontal: 0, fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.ink },
  bodyInput: { backgroundColor: 'transparent', paddingHorizontal: 0, flex: 1, minHeight: 220, lineHeight: 25 },
  toolbar: {
    minHeight: 64,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 6,
  },
});
