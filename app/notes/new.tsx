import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/design/theme';
import { AppIcon, Header, IconButton, Input, PrimaryButton } from '@/components/ui';
import { ActionSheet, BottomSheet, Checkbox, useSnackbar } from '@/components/visual';
import { appendNoteBlock, createAttachment, createNote, findNote, trashAttachment, updateNote } from '@/database/repositories';
import { captureImage, pickFile, pickImage } from '@/services/media-service';
import type { NoteBlock } from '@/types/domain';
import { createChecklistItem, parseNoteBlocks, serializeNoteBlocks } from '@/utils/note-blocks';

function withEditableLineAfterChecklist(blocks: NoteBlock[]) {
  const withLines = blocks.flatMap((block, index) => {
    if (block.type !== 'checklist' || blocks[index + 1]?.type === 'text') return [block];
    return [block, { type: 'text', text: '' } satisfies NoteBlock];
  });
  return withLines.filter((block, index, current) => {
    if (block.type !== 'text' || block.text.trim()) return true;
    const previous = current[index - 1];
    const next = current[index + 1];
    const afterNext = current[index + 2];
    if (previous?.type === 'text' && !previous.text.trim()) return false;
    if (next?.type === 'checklist' && afterNext?.type === 'text' && !afterNext.text.trim()) return false;
    return true;
  });
}

export default function NewNote() {
  const { showSnackbar } = useSnackbar();
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
    setBlocks(withEditableLineAfterChecklist(parseNoteBlocks(note.content)));
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = useCallback(async () => {
    const cleanBlocks = withEditableLineAfterChecklist(blocks);
    const hasContent =
      title.trim().length > 0 ||
      cleanBlocks.some((block) => {
        if ('text' in block) return block.text.trim().length > 0;
        if (block.type === 'checklist') return block.items.some((item) => item.text.trim().length > 0);
        return true;
      });
    if (!hasContent) return noteId;
    const content = serializeNoteBlocks(cleanBlocks);
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

  const addBlock = (block: NoteBlock) => setBlocks((current) => withEditableLineAfterChecklist([...current, block]));
  const insertTextAfter = (index: number) => {
    setBlocks((current) => {
      if (current[index + 1]?.type === 'text') return current;
      return [...current.slice(0, index + 1), { type: 'text', text: '' }, ...current.slice(index + 1)];
    });
  };
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
  const removeBlock = (index: number) => {
    const block = blocks[index];
    setBlocks((current) => {
      const next = current.filter((_, blockIndex) => blockIndex !== index);
      return next.length > 0 ? next : [{ type: 'text', text: '' }];
    });
    if (block?.type === 'image' || block?.type === 'file' || block?.type === 'audio') {
      trashAttachment(block.attachmentId).catch(() => setStatus('NÃ£o foi possÃ­vel remover o anexo'));
    }
    showSnackbar(block?.type === 'checklist' ? 'Checklist removida' : 'Bloco removido');
  };
  const removeChecklistItem = (blockIndex: number, itemIndex: number) => {
    const block = blocks[blockIndex];
    if (block?.type !== 'checklist') return;
    if (block.items.length <= 1) {
      removeBlock(blockIndex);
      return;
    }
    setBlocks((current) =>
      current.map((currentBlock, index) =>
        index === blockIndex && currentBlock.type === 'checklist'
          ? { ...currentBlock, items: currentBlock.items.filter((_, indexInBlock) => indexInBlock !== itemIndex) }
          : currentBlock,
      ),
    );
    showSnackbar('Item removido');
  };
  const ensureNote = async () => {
    const savedId = await save();
    if (savedId) return savedId;
    const note = await createNote({
      title: title.trim() || null,
      content: serializeNoteBlocks(withEditableLineAfterChecklist(blocks)),
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
    showSnackbar('Arquivo anexado à nota');
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
    showSnackbar('Imagem anexada à nota');
  };

  const openAudio = async () => {
    const id = await ensureNote();
    if (id) router.push({ pathname: '/media/audio', params: { noteId: id } });
  };
  const reportAttachmentError = (error: unknown, fallback: string) => {
    const message = error instanceof Error && error.message ? error.message : fallback;
    setStatus(message);
    showSnackbar(message, 'error');
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
    if (id) {
      showSnackbar(params.id ? 'Nota atualizada' : 'Nota criada');
      router.replace({ pathname: '/notes/[id]', params: { id } });
    } else router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        title=""
        onBack={leave}
        action={() => save().then(() => showSnackbar(params.id ? 'Nota atualizada' : 'Nota salva'))}
        actionLabel={status || 'Salvar'}
      />
      <ScrollView contentContainerStyle={styles.editor} keyboardShouldPersistTaps="handled">
        <Input value={title} onChangeText={setTitle} placeholder="Título" style={styles.titleInput} />
        {blocks.map((block, index) => {
          if (block.type === 'checklist')
            return (
              <View key={`checklist-${index}`} style={styles.checklistBlock}>
                <View style={styles.blockHeader}>
                  <Text style={styles.blockLabel}>Checklist</Text>
                  <IconButton
                    icon="trash-outline"
                    size={18}
                    color={colors.danger}
                    label="Excluir checklist"
                    onPress={() => removeBlock(index)}
                  />
                </View>
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
                      onSubmitEditing={() => {
                        if (itemIndex === block.items.length - 1) insertTextAfter(index);
                      }}
                      style={[styles.blockInput, styles.checklistInput, item.checked && styles.checkedText]}
                    />
                    <IconButton
                      icon="trash-outline"
                      size={18}
                      color={colors.danger}
                      label="Excluir item da checklist"
                      onPress={() => removeChecklistItem(index, itemIndex)}
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
              <View key={`${block.attachmentId}-${index}`} style={styles.editorBlockRow}>
                <Pressable
                  onPress={() => router.push({ pathname: '/media/preview', params: { id: block.attachmentId } })}
                  style={[styles.attachmentBlock, styles.editorBlockContent]}
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
                <IconButton icon="trash-outline" size={18} color={colors.danger} label="Excluir anexo" onPress={() => removeBlock(index)} />
              </View>
            );
          if (block.type === 'link')
            return (
              <View key={`link-${index}`} style={styles.editorBlockRow}>
                <Pressable onPress={() => Linking.openURL(block.url)} style={[styles.linkBlock, styles.editorBlockContent]}>
                  <AppIcon name="link-outline" />
                  <View style={styles.attachmentCopy}>
                    <Text style={styles.attachmentTitle}>{block.text}</Text>
                    <Text style={styles.attachmentSubtitle}>{block.url}</Text>
                  </View>
                </Pressable>
                <IconButton icon="trash-outline" size={18} color={colors.danger} label="Excluir link" onPress={() => removeBlock(index)} />
              </View>
            );
          return (
            <View key={`block-${index}`} style={styles.editorBlockRow}>
              <Input
                value={'text' in block ? block.text : ''}
                onChangeText={(text) => updateText(index, text)}
                placeholder={
                  block.type === 'heading' ? 'Título da seção' : block.type === 'bullet' ? 'Item da lista' : 'Comece a escrever…'
                }
                multiline
                style={[
                  styles.blockInput,
                  styles.editorBlockInput,
                  block.type === 'heading' && styles.headingInput,
                  block.type === 'bullet' && styles.bulletInput,
                ]}
              />
              <IconButton icon="trash-outline" size={18} color={colors.danger} label="Excluir bloco" onPress={() => removeBlock(index)} />
            </View>
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
            onPress: () => addFile().catch((error) => reportAttachmentError(error, 'Não foi possível anexar o arquivo')),
          },
          {
            label: 'Imagem da galeria',
            description: 'Escolher uma foto existente',
            icon: 'images-outline',
            onPress: () => addImage('gallery').catch((error) => reportAttachmentError(error, 'Não foi possível anexar a imagem')),
          },
          {
            label: 'Tirar foto',
            description: 'Usar a câmera do dispositivo',
            icon: 'camera-outline',
            onPress: () => addImage('camera').catch((error) => reportAttachmentError(error, 'Não foi possível anexar a imagem')),
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
  blockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  blockLabel: { ...typography.caption, color: colors.inkMuted, fontWeight: '700' },
  editorBlockRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: spacing.xs },
  editorBlockInput: { flex: 1, minWidth: 0 },
  editorBlockContent: { flex: 1 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  checklistInput: { flex: 1, minWidth: 0 },
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
