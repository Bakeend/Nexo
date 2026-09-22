import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/design/theme';
import { AppIcon, Header, IconButton, Input, PrimaryButton } from '@/components/ui';
import { ActionSheet, BottomSheet, Checkbox } from '@/components/visual';
import { appendNoteBlock, createAttachment, createNote, findNote, updateNote } from '@/database/repositories';
import { captureImage, pickFile, pickImage } from '@/services/media-service';
import type { NoteBlock } from '@/types/domain';
import { createChecklistItem, parseNoteBlocks, serializeNoteBlocks } from '@/utils/note-blocks';

export default function NewNote() {
  const params = useLocalSearchParams<{ id?: string; seed?: string; spaceId?: string }>();
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => [{ type: 'text', text: params.seed || '' }]);
  const [noteId, setNoteId] = useState<string | null>(params.id || null);
  const [status, setStatus] = useState('');
  const [attachmentSheet, setAttachmentSheet] = useState(false);
  const [formatSheet, setFormatSheet] = useState(false);
  const [linkSheet, setLinkSheet] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    const note = await findNote(params.id);
    if (!note) return;
    setNoteId(note.id);
    setTitle(note.title || '');
    setBlocks(parseNoteBlocks(note.content));
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = useCallback(async () => {
    const hasContent =
      title.trim().length > 0 ||
      blocks.some((block) => {
        if ('text' in block) return block.text.trim().length > 0;
        if (block.type === 'checklist') return block.items.some((item) => item.text.trim().length > 0);
        return true;
      });
    if (!hasContent) return noteId;
    const content = serializeNoteBlocks(blocks);
    setStatus('Salvando…');
    if (noteId) {
      await updateNote(noteId, { title: title.trim() || null, content });
      setStatus('Salvo');
      return noteId;
    }
    const note = await createNote({ title: title.trim() || null, content, spaceId: params.spaceId || null });
    setNoteId(note.id);
    setStatus('Salvo');
    return note.id;
  }, [blocks, noteId, params.spaceId, title]);

  useEffect(() => {
    const hasContent =
      title.trim().length > 0 ||
      blocks.some((block) => {
        if ('text' in block) return block.text.trim().length > 0;
        if (block.type === 'checklist') return block.items.some((item) => item.text.trim().length > 0);
        return true;
      });
    if (!hasContent) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save().catch(() => setStatus('Não foi possível salvar')), 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [blocks, save, title]);

  const addBlock = (block: NoteBlock) => setBlocks((current) => [...current, block]);
  const updateText = (index: number, text: string) => {
    setBlocks((current) => current.map((block, blockIndex) => (blockIndex === index && 'text' in block ? { ...block, text } : block)));
  };
  const updateChecklistItem = (blockIndex: number, itemIndex: number, patch: Partial<{ text: string; checked: boolean }>) => {
    setBlocks((current) =>
      current.map((block, index) => {
        if (index !== blockIndex || block.type !== 'checklist') return block;
        return {
          ...block,
          items: block.items.map((item, itemIndexInBlock) => (itemIndexInBlock === itemIndex ? { ...item, ...patch } : item)),
        };
      }),
    );
  };
  const ensureNote = async () => {
    const savedId = await save();
    if (savedId) return savedId;
    const note = await createNote({
      title: title.trim() || null,
      content: serializeNoteBlocks(blocks),
      spaceId: params.spaceId || null,
    });
    setNoteId(note.id);
    setStatus('Salvo');
    return note.id;
  };

  const addFile = async () => {
    const id = await ensureNote();
    if (!id) return;
    const file = await pickFile();
    if (!file) return;
    const attachment = await createAttachment({
      itemId: id,
      itemType: 'note',
      type: 'file',
      originalName: file.name,
      localPath: file.uri,
      mimeType: file.mimeType,
      sizeBytes: file.size,
    });
    const block: NoteBlock = { type: 'file', attachmentId: attachment.id, label: file.name };
    await appendNoteBlock(id, block);
    setBlocks((current) => [...current, block]);
  };

  const addImage = async (mode: 'camera' | 'gallery') => {
    const id = await ensureNote();
    if (!id) return;
    const image = mode === 'camera' ? await captureImage() : await pickImage();
    if (!image) return;
    const attachment = await createAttachment({
      itemId: id,
      itemType: 'note',
      type: 'image',
      originalName: image.fileName || 'imagem.jpg',
      localPath: image.uri,
      mimeType: image.mimeType || 'image/jpeg',
      sizeBytes: image.fileSize,
    });
    const block: NoteBlock = { type: 'image', attachmentId: attachment.id, label: image.fileName || 'Imagem' };
    await appendNoteBlock(id, block);
    setBlocks((current) => [...current, block]);
  };

  const openAudio = async () => {
    const id = await ensureNote();
    if (id) router.push({ pathname: '/media/audio', params: { noteId: id } });
  };

  const saveLink = () => {
    if (!linkUrl.trim()) return;
    addBlock({ type: 'link', url: linkUrl.trim(), text: linkLabel.trim() || linkUrl.trim() });
    setLinkLabel('');
    setLinkUrl('');
    setLinkSheet(false);
  };

  const leave = async () => {
    const id = await save();
    if (id) router.replace({ pathname: '/notes/[id]', params: { id } });
    else router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="" onBack={leave} action={() => save()} actionLabel={status || 'Salvar'} />
      <ScrollView contentContainerStyle={styles.editor} keyboardShouldPersistTaps="handled">
        <Input value={title} onChangeText={setTitle} placeholder="Título" style={styles.titleInput} />
        {blocks.map((block, index) => {
          if (block.type === 'checklist')
            return (
              <View key={block.items[0]?.id || `checklist-${index}`} style={styles.checklistBlock}>
                {block.items.map((item, itemIndex) => (
                  <View key={item.id} style={styles.checklistRow}>
                    <Checkbox
                      checked={item.checked}
                      label={item.text || 'Item da checklist'}
                      onPress={() => updateChecklistItem(index, itemIndex, { checked: !item.checked })}
                    />
                    <Input
                      value={item.text}
                      onChangeText={(text) => updateChecklistItem(index, itemIndex, { text })}
                      placeholder="Item da checklist"
                      style={[styles.blockInput, item.checked && styles.checkedText]}
                    />
                  </View>
                ))}
                <Pressable
                  onPress={() =>
                    setBlocks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index && item.type === 'checklist'
                          ? { ...item, items: [...item.items, createChecklistItem()] }
                          : item,
                      ),
                    )
                  }
                  style={styles.addItem}
                >
                  <Text style={styles.addItemText}>+ Adicionar item</Text>
                </Pressable>
              </View>
            );
          if (block.type === 'image' || block.type === 'file' || block.type === 'audio')
            return (
              <Pressable
                key={`${block.attachmentId}-${index}`}
                onPress={() => router.push({ pathname: '/media/preview', params: { id: block.attachmentId } })}
                style={styles.attachmentBlock}
              >
                <AppIcon
                  name={block.type === 'image' ? 'image-outline' : block.type === 'audio' ? 'mic-outline' : 'document-attach-outline'}
                />
                <View style={styles.attachmentCopy}>
                  <Text style={styles.attachmentTitle}>
                    {block.label || (block.type === 'image' ? 'Imagem' : block.type === 'audio' ? 'Áudio' : 'Arquivo')}
                  </Text>
                  <Text style={styles.attachmentSubtitle}>Abrir anexo</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          if (block.type === 'link')
            return (
              <Pressable key={`link-${index}`} onPress={() => Linking.openURL(block.url)} style={styles.linkBlock}>
                <AppIcon name="link-outline" />
                <View style={styles.attachmentCopy}>
                  <Text style={styles.attachmentTitle}>{block.text}</Text>
                  <Text style={styles.attachmentSubtitle}>{block.url}</Text>
                </View>
              </Pressable>
            );
          return (
            <Input
              key={`block-${index}`}
              value={'text' in block ? block.text : ''}
              onChangeText={(text) => updateText(index, text)}
              placeholder={block.type === 'heading' ? 'Título da seção' : block.type === 'bullet' ? 'Item da lista' : 'Comece a escrever…'}
              multiline
              style={[styles.blockInput, block.type === 'heading' && styles.headingInput, block.type === 'bullet' && styles.bulletInput]}
            />
          );
        })}
      </ScrollView>
      <View style={styles.toolbar}>
        <IconButton icon="text-outline" onPress={() => setFormatSheet(true)} label="Formatação" />
        <IconButton
          icon="checkbox-outline"
          onPress={() => addBlock({ type: 'checklist', items: [createChecklistItem()] })}
          label="Checklist"
        />
        <IconButton icon="attach-outline" onPress={() => setAttachmentSheet(true)} label="Anexo" />
        <IconButton icon="image-outline" onPress={() => setAttachmentSheet(true)} label="Imagem" />
        <IconButton icon="mic-outline" onPress={openAudio} label="Áudio" />
        <IconButton icon="ellipsis-horizontal" onPress={() => setFormatSheet(true)} label="Mais opções" />
      </View>
      <ActionSheet
        visible={attachmentSheet}
        title="Adicionar ao texto"
        onClose={() => setAttachmentSheet(false)}
        options={[
          {
            label: 'Texto livre',
            description: 'Continuar escrevendo no corpo da nota',
            icon: 'text-outline',
            onPress: () => addBlock({ type: 'text', text: '' }),
          },
          {
            label: 'Arquivo',
            description: 'PDF, documento ou outro formato',
            icon: 'document-attach-outline',
            onPress: () => addFile().catch(() => setStatus('Não foi possível anexar o arquivo')),
          },
          {
            label: 'Imagem da galeria',
            description: 'Escolher uma foto existente',
            icon: 'images-outline',
            onPress: () => addImage('gallery').catch(() => setStatus('Não foi possível anexar a imagem')),
          },
          {
            label: 'Tirar foto',
            description: 'Usar a câmera do dispositivo',
            icon: 'camera-outline',
            onPress: () => addImage('camera').catch(() => setStatus('Não foi possível anexar a imagem')),
          },
          { label: 'Áudio', description: 'Gravar e inserir no texto', icon: 'mic-outline', onPress: openAudio },
        ]}
      />
      <ActionSheet
        visible={formatSheet}
        title="Adicionar bloco"
        onClose={() => setFormatSheet(false)}
        options={[
          {
            label: 'Título de seção',
            description: 'Dar hierarquia ao conteúdo',
            icon: 'text-outline',
            onPress: () => addBlock({ type: 'heading', level: 2, text: '' }),
          },
          {
            label: 'Lista com marcadores',
            description: 'Organizar ideias em sequência',
            icon: 'list-outline',
            onPress: () => addBlock({ type: 'bullet', text: '' }),
          },
          { label: 'Link', description: 'Guardar uma referência externa', icon: 'link-outline', onPress: () => setLinkSheet(true) },
        ]}
      />
      <BottomSheet
        visible={linkSheet}
        title="Adicionar link"
        onClose={() => setLinkSheet(false)}
        footer={<PrimaryButton title="Adicionar link" onPress={saveLink} disabled={!linkUrl.trim()} />}
      >
        <Input value={linkLabel} onChangeText={setLinkLabel} placeholder="Nome do link (opcional)" />
        <Input value={linkUrl} onChangeText={setLinkUrl} placeholder="https://..." style={styles.linkInput} autoFocus />
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  editor: { padding: spacing.lg, paddingBottom: 100, gap: spacing.sm },
  titleInput: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  blockInput: { backgroundColor: 'transparent', paddingHorizontal: 0, minHeight: 48, lineHeight: 25, color: colors.ink },
  headingInput: { ...typography.heading, minHeight: 44, marginTop: spacing.md },
  bulletInput: { paddingLeft: spacing.lg },
  checklistBlock: { marginVertical: spacing.sm },
  checklistRow: { flexDirection: 'row', alignItems: 'center' },
  checkedText: { textDecorationLine: 'line-through', color: colors.inkMuted },
  addItem: { minHeight: 42, justifyContent: 'center', paddingLeft: 44 },
  addItemText: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  attachmentBlock: {
    minHeight: 62,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  linkBlock: {
    minHeight: 62,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  attachmentCopy: { flex: 1 },
  attachmentTitle: { ...typography.bodyStrong, color: colors.ink },
  attachmentSubtitle: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
  chevron: { fontSize: 24, color: colors.inkMuted },
  toolbar: {
    minHeight: 64,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 6,
  },
  linkInput: { marginTop: spacing.md },
});
