import { goBackOrHome } from '@/navigation/back';
import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, spacing, typography, useThemeStyles, type AppColors } from '@/design/theme';
import { AppIcon, Header, IconButton, Input, PrimaryButton } from '@/components/ui';
import { InlineAudioPlayer, useAudioPlaybackActions } from '@/components/audio-playback';
import { AttachmentImagePreview } from '@/components/attachment-image-preview';
import { FormattedNoteText } from '@/components/formatted-note-text';
import { LongPressItem } from '@/components/long-press-item';
import { ActionSheet, BottomSheet, Checkbox, useItemActions, useSnackbar } from '@/components/visual';
import {
  appendNoteBlock,
  createAttachment,
  createNote,
  findAttachment,
  findNote,
  listTasksForNote,
  toggleTask,
  trashAttachment,
  updateNote,
} from '@/database/repositories';
import { captureImage, pickFile, pickImage } from '@/services/media-service';
import { shareAttachment } from '@/services/attachment-sharing';
import { subscribeToNoteBlockChanges } from '@/services/note-block-events';
import { animateListLayout } from '@/motion/layout';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';
import { motionDuration } from '@/motion/tokens';
import type { NoteBlock, NoteTextStyle, Task } from '@/types/domain';
import { createChecklistItem, parseNoteBlocks, serializeNoteBlocks } from '@/utils/note-blocks';
import { toggleTextStyle, updateTextMarks } from '@/utils/note-formatting';

function withEditableLineAfterContent(blocks: NoteBlock[]) {
  const withLines = blocks.flatMap((block, index) => {
    const needsTextLine =
      block.type === 'checklist' ||
      (index === blocks.length - 1 && (block.type === 'file' || block.type === 'image' || block.type === 'audio'));
    if (!needsTextLine || blocks[index + 1]?.type === 'text') return [block];
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

function MotionEntry({ children, fresh }: { children: React.ReactNode; fresh: boolean }) {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(fresh ? 0 : 1));
  useEffect(() => {
    if (!fresh) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: reducedMotion ? 100 : motionDuration.normal,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fresh, progress, reducedMotion]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reducedMotion ? 0 : 8, 0] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [reducedMotion ? 1 : 0.96, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function NewNote() {
  const styles = useThemeStyles(makeStyles);
  const { showSnackbar } = useSnackbar();
  const { showItemConfirmation } = useItemActions();
  const { stop } = useAudioPlaybackActions();
  const reducedMotion = useReducedMotion();
  const params = useLocalSearchParams<{ id?: string; seed?: string; spaceId?: string }>();
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<NoteBlock[]>(() => [{ type: 'text', text: params.seed || '' }]);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(0);
  const selectedBlockIndex = useRef<number | null>(0);
  const selection = useRef({ start: 0, end: 0 });
  const [freshBlockIndex, setFreshBlockIndex] = useState<number | null>(null);
  const [noteId, setNoteId] = useState<string | null>(params.id || null);
  const [noteSpaceId, setNoteSpaceId] = useState<string | null>(params.spaceId || null);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState('');
  const [attachmentSheet, setAttachmentSheet] = useState(false);
  const [formatSheet, setFormatSheet] = useState(false);
  const [linkSheet, setLinkSheet] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (freshBlockIndex === null) return;
    const timeout = setTimeout(() => setFreshBlockIndex(null), motionDuration.medium);
    return () => clearTimeout(timeout);
  }, [freshBlockIndex]);

  const load = useCallback(async () => {
    const activeNoteId = noteId || params.id;
    if (!activeNoteId) return;
    const [note, tasks] = await Promise.all([findNote(activeNoteId), listTasksForNote(activeNoteId)]);
    if (!note) return;
    setNoteId(note.id);
    setNoteSpaceId(note.spaceId);
    setTitle(note.title || '');
    setBlocks(withEditableLineAfterContent(parseNoteBlocks(note.content)));
    setLinkedTasks(tasks);
    setEditingBlockIndex(null);
  }, [noteId, params.id]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
      };
    }, [load]),
  );

  useEffect(
    () =>
      subscribeToNoteBlockChanges((changedNoteId) => {
        if (changedNoteId === (noteId || params.id)) {
          animateListLayout(reducedMotion);
          void load().catch(() => setStatus('Não foi possível atualizar os blocos'));
        }
      }),
    [load, noteId, params.id, reducedMotion],
  );

  const save = useCallback(async () => {
    const cleanBlocks = withEditableLineAfterContent(blocks);
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

  const addBlock = (block: NoteBlock) => {
    animateListLayout(reducedMotion);
    if (block.type !== 'text') playUISound('pop');
    selectedBlockIndex.current = null;
    setEditingBlockIndex(null);
    setFreshBlockIndex(blocks.length);
    setBlocks((current) => withEditableLineAfterContent([...current, block]));
  };
  const insertTextAfter = (index: number) => {
    animateListLayout(reducedMotion);
    setBlocks((current) => {
      if (current[index + 1]?.type === 'text') return current;
      return [...current.slice(0, index + 1), { type: 'text', text: '' }, ...current.slice(index + 1)];
    });
  };
  const updateText = (index: number, text: string) => {
    setBlocks((current) =>
      current.map((block, blockIndex) =>
        blockIndex === index && (block.type === 'text' || block.type === 'heading' || block.type === 'bullet')
          ? { ...block, text, marks: updateTextMarks(block.text, text, block.marks) }
          : block,
      ),
    );
  };
  const formatText = (style: NoteTextStyle) => {
    const index = selectedBlockIndex.current;
    if (index === null || !['text', 'heading', 'bullet'].includes(blocks[index]?.type)) {
      showSnackbar('Toque no texto que deseja formatar.', 'info');
      return;
    }
    setBlocks((current) =>
      current.map((block, blockIndex) =>
        blockIndex === index && (block.type === 'text' || block.type === 'heading' || block.type === 'bullet')
          ? { ...block, marks: toggleTextStyle(block.text, block.marks, selection.current, style) }
          : block,
      ),
    );
    setEditingBlockIndex(null);
    setFormatSheet(false);
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
    selectedBlockIndex.current = null;
    setEditingBlockIndex(null);
    animateListLayout(reducedMotion);
    playUISound('swipe-soft');
    setBlocks((current) => {
      const next = current.filter((_, blockIndex) => blockIndex !== index);
      return next.length > 0 ? next : [{ type: 'text', text: '' }];
    });
    if (block?.type === 'image' || block?.type === 'file' || block?.type === 'audio') {
      if (block.type === 'audio') stop(block.attachmentId);
      trashAttachment(block.attachmentId).catch(() => setStatus('NÃ£o foi possÃ­vel remover o anexo'));
    }
    showSnackbar(block?.type === 'checklist' ? 'Checklist removida' : 'Bloco removido', 'info');
  };
  const requestRemoveBlock = (index: number) => {
    const block = blocks[index];
    if (!block) return;
    const name = block.type === 'checklist' ? 'checklist' : block.type === 'audio' ? 'áudio' : 'bloco';
    showItemConfirmation({
      title: `Excluir ${name}?`,
      message: 'Este conteúdo será removido da nota.',
      confirmLabel: 'Excluir',
      onConfirm: () => removeBlock(index),
    });
  };
  const removeChecklistItem = (blockIndex: number, itemIndex: number) => {
    const block = blocks[blockIndex];
    if (block?.type !== 'checklist') return;
    if (block.items.length <= 1) {
      removeBlock(blockIndex);
      return;
    }
    animateListLayout(reducedMotion);
    playUISound('swipe-soft');
    setBlocks((current) =>
      current.map((currentBlock, index) =>
        index === blockIndex && currentBlock.type === 'checklist'
          ? { ...currentBlock, items: currentBlock.items.filter((_, indexInBlock) => indexInBlock !== itemIndex) }
          : currentBlock,
      ),
    );
    showSnackbar('Item removido', 'info');
  };
  const requestRemoveChecklistItem = (blockIndex: number, itemIndex: number) => {
    showItemConfirmation({
      title: 'Excluir item da checklist?',
      confirmLabel: 'Excluir',
      onConfirm: () => removeChecklistItem(blockIndex, itemIndex),
    });
  };
  const clearPendingSave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const ensureNote = async () => {
    clearPendingSave();
    const savedId = await save();
    if (savedId) return savedId;
    const note = await createNote({
      title: title.trim() || null,
      content: serializeNoteBlocks(withEditableLineAfterContent(blocks)),
      spaceId: params.spaceId || null,
    });
    setNoteId(note.id);
    setStatus('Salvo');
    return note.id;
  };

  const addFile = async () => {
    const id = await ensureNote();
    if (!id) return;
    clearPendingSave();
    const file = await pickFile();
    if (!file) return;
    const isImage = file.mimeType?.startsWith('image/') || false;
    const attachment = await createAttachment({
      itemId: id,
      itemType: 'note',
      type: isImage ? 'image' : 'file',
      originalName: file.name,
      localPath: file.uri,
      mimeType: file.mimeType,
      sizeBytes: file.size,
    });
    const block: NoteBlock = { type: isImage ? 'image' : 'file', attachmentId: attachment.id, label: file.name };
    await appendNoteBlock(id, block, false);
    animateListLayout(reducedMotion);
    playUISound('attach');
    setFreshBlockIndex(blocks.length);
    setBlocks((current) => withEditableLineAfterContent([...current, block]));
    selectedBlockIndex.current = null;
    showSnackbar('Arquivo anexado à nota', 'success');
  };

  const addImage = async (mode: 'camera' | 'gallery') => {
    const id = await ensureNote();
    if (!id) return;
    clearPendingSave();
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
    await appendNoteBlock(id, block, false);
    animateListLayout(reducedMotion);
    playUISound('attach');
    setFreshBlockIndex(blocks.length);
    setBlocks((current) => withEditableLineAfterContent([...current, block]));
    selectedBlockIndex.current = null;
    showSnackbar('Imagem anexada à nota', 'success');
  };

  const openAudio = async () => {
    const id = await ensureNote();
    clearPendingSave();
    if (id) router.push({ pathname: '/media/audio', params: { noteId: id } });
  };
  const openRelatedTask = async () => {
    try {
      const id = await ensureNote();
      router.push({ pathname: '/tasks/new', params: { relatedNoteId: id, spaceId: noteSpaceId || '' } });
    } catch {
      showSnackbar('Não foi possível salvar a nota para criar a tarefa', 'error');
    }
  };
  const toggleLinkedTask = async (task: Task) => {
    try {
      await toggleTask(task.id, !task.completedAt);
      if (noteId) setLinkedTasks(await listTasksForNote(noteId));
    } catch {
      showSnackbar('Não foi possível atualizar a tarefa', 'error');
    }
  };
  const openLinkedTask = async (task: Task) => {
    try {
      await save();
      router.push({ pathname: '/tasks/[id]', params: { id: task.id } });
    } catch {
      showSnackbar('Não foi possível salvar a nota', 'error');
    }
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
    try {
      const id = await save();
      if (id) {
        showSnackbar(params.id ? 'Nota atualizada' : 'Nota criada', params.id ? 'info' : 'success');
        router.replace({ pathname: '/notes/[id]', params: { id } });
      } else goBackOrHome();
    } catch {
      setStatus('Não foi possível salvar');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeRoot}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header
          title=""
          onBack={leave}
          action={() =>
            save()
              .then((id) => {
                if (id) showSnackbar(params.id ? 'Nota atualizada' : 'Nota salva', params.id ? 'info' : 'success');
              })
              .catch(() => setStatus('Não foi possível salvar'))
          }
          actionLabel={status || 'Salvar'}
        />
        <ScrollView contentContainerStyle={styles.editor} keyboardShouldPersistTaps="handled">
          <Input
            value={title}
            onChangeText={setTitle}
            onFocus={() => (selectedBlockIndex.current = null)}
            placeholder="Título"
            style={styles.titleInput}
          />
          {blocks.map((block, index) => {
            if (block.type === 'checklist')
              return (
                <MotionEntry key={`checklist-${index}`} fresh={freshBlockIndex === index}>
                  <View style={styles.checklistBlock}>
                    <LongPressItem
                      title="Checklist"
                      actions={[
                        { label: 'Excluir checklist', icon: 'trash-outline', destructive: true, onPress: () => requestRemoveBlock(index) },
                      ]}
                      style={styles.blockHeader}
                    >
                      <Text style={styles.blockLabel}>Checklist</Text>
                    </LongPressItem>
                    {block.items.map((item, itemIndex) => (
                      <LongPressItem
                        key={item.id}
                        containerRole="none"
                        title={item.text || 'Item da checklist'}
                        actions={[
                          {
                            label: 'Excluir item',
                            icon: 'trash-outline',
                            destructive: true,
                            onPress: () => requestRemoveChecklistItem(index, itemIndex),
                          },
                        ]}
                        style={styles.checklistRow}
                      >
                        <Checkbox
                          checked={item.checked}
                          label={item.text || 'Item da checklist'}
                          onPress={() => updateChecklistItem(index, itemIndex, { checked: !item.checked })}
                        />
                        <Input
                          value={item.text}
                          onChangeText={(text) => updateChecklistItem(index, itemIndex, { text })}
                          onFocus={() => (selectedBlockIndex.current = null)}
                          placeholder="Item da checklist"
                          onSubmitEditing={() => {
                            if (itemIndex === block.items.length - 1) insertTextAfter(index);
                          }}
                          style={[styles.blockInput, styles.checklistInput, item.checked && styles.checkedText]}
                        />
                      </LongPressItem>
                    ))}
                    <Pressable
                      onPress={() => {
                        animateListLayout(reducedMotion);
                        setBlocks((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index && item.type === 'checklist'
                              ? { ...item, items: [...item.items, createChecklistItem()] }
                              : item,
                          ),
                        );
                      }}
                      style={styles.addItem}
                    >
                      <Text style={styles.addItemText}>+ Adicionar item</Text>
                    </Pressable>
                  </View>
                </MotionEntry>
              );
            if (block.type === 'audio')
              return (
                <MotionEntry key={`${block.attachmentId}-${index}`} fresh={freshBlockIndex === index}>
                  <LongPressItem
                    title="Áudio"
                    containerRole="none"
                    style={styles.audioBlock}
                    actions={[
                      {
                        label: 'Compartilhar áudio',
                        icon: 'share-outline',
                        onPress: async () => {
                          const attachment = await findAttachment(block.attachmentId);
                          if (!attachment) return;
                          try {
                            if (!(await shareAttachment(attachment)))
                              showSnackbar('Compartilhamento indisponível neste dispositivo.', 'error');
                          } catch {
                            showSnackbar('Não foi possível compartilhar o áudio.', 'error');
                          }
                        },
                      },
                      { label: 'Excluir áudio', icon: 'trash-outline', destructive: true, onPress: () => requestRemoveBlock(index) },
                    ]}
                  >
                    <InlineAudioPlayer attachmentId={block.attachmentId} />
                  </LongPressItem>
                </MotionEntry>
              );
            if (block.type === 'image' || block.type === 'file')
              return (
                <MotionEntry key={`${block.attachmentId}-${index}`} fresh={freshBlockIndex === index}>
                  <View style={styles.editorAttachmentCard}>
                    {block.type === 'image' ? (
                      <AttachmentImagePreview
                        attachmentId={block.attachmentId}
                        onOpen={() => save().then(() => router.push({ pathname: '/media/preview', params: { id: block.attachmentId } }))}
                      />
                    ) : null}
                    {block.type === 'file' ? (
                      <LongPressItem
                        title={block.label || 'Arquivo'}
                        onPress={() => save().then(() => router.push({ pathname: '/media/preview', params: { id: block.attachmentId } }))}
                        style={styles.attachmentBlock}
                        pressedStyle={styles.editorAttachmentPressed}
                        actions={[
                          {
                            label: 'Abrir anexo',
                            icon: 'open-outline',
                            onPress: () => router.push({ pathname: '/media/preview', params: { id: block.attachmentId } }),
                          },
                          {
                            label: 'Compartilhar',
                            icon: 'share-outline',
                            onPress: async () => {
                              const attachment = await findAttachment(block.attachmentId);
                              if (!attachment) return;
                              try {
                                if (!(await shareAttachment(attachment)))
                                  showSnackbar('Compartilhamento indisponível neste dispositivo.', 'error');
                              } catch {
                                showSnackbar('Não foi possível compartilhar o anexo.', 'error');
                              }
                            },
                          },
                          {
                            label: 'Excluir',
                            icon: 'trash-outline',
                            destructive: true,
                            onPress: () => requestRemoveBlock(index),
                          },
                        ]}
                      >
                        <AppIcon name="document-attach-outline" />
                        <View style={styles.attachmentCopy}>
                          <Text style={styles.attachmentTitle}>{block.label || 'Arquivo'}</Text>
                          <Text style={styles.attachmentSubtitle}>Abrir anexo</Text>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                      </LongPressItem>
                    ) : null}
                  </View>
                </MotionEntry>
              );
            if (block.type === 'link')
              return (
                <MotionEntry key={`link-${index}`} fresh={freshBlockIndex === index}>
                  <LongPressItem
                    title={block.text}
                    onPress={() => Linking.openURL(block.url)}
                    style={styles.editorBlockRow}
                    actions={[
                      { label: 'Abrir link', icon: 'open-outline', onPress: () => Linking.openURL(block.url) },
                      {
                        label: 'Excluir link',
                        icon: 'trash-outline',
                        destructive: true,
                        onPress: () => requestRemoveBlock(index),
                      },
                    ]}
                  >
                    <View style={[styles.linkBlock, styles.editorBlockContent]}>
                      <AppIcon name="link-outline" />
                      <View style={styles.attachmentCopy}>
                        <Text style={styles.attachmentTitle}>{block.text}</Text>
                        <Text style={styles.attachmentSubtitle}>{block.url}</Text>
                      </View>
                    </View>
                  </LongPressItem>
                </MotionEntry>
              );
            if (block.type === 'text' || block.type === 'heading' || block.type === 'bullet')
              return (
                <LongPressItem
                  key={`block-${index}`}
                  containerRole="none"
                  title={block.type === 'heading' ? 'Título da seção' : block.type === 'bullet' ? 'Item da lista' : 'Texto da nota'}
                  style={styles.editorBlockRow}
                  actions={[{ label: 'Excluir bloco', icon: 'trash-outline', destructive: true, onPress: () => requestRemoveBlock(index) }]}
                >
                  {block.marks?.length && editingBlockIndex !== index ? (
                    <Pressable
                      onPress={() => {
                        selectedBlockIndex.current = index;
                        selection.current = { start: 0, end: 0 };
                        setEditingBlockIndex(index);
                      }}
                      style={[styles.editorBlockInput, styles.formattedPreview]}
                      accessibilityRole="button"
                      accessibilityLabel="Editar texto formatado"
                    >
                      <FormattedNoteText
                        text={block.text}
                        marks={block.marks}
                        style={[
                          styles.blockInput,
                          block.type === 'heading' && styles.headingInput,
                          block.type === 'bullet' && styles.bulletInput,
                        ]}
                      />
                    </Pressable>
                  ) : (
                    <Input
                      value={'text' in block ? block.text : ''}
                      onChangeText={(text) => updateText(index, text)}
                      autoFocus={editingBlockIndex === index && Boolean(block.marks?.length)}
                      onFocus={() => {
                        selectedBlockIndex.current = index;
                        selection.current = { start: 0, end: 0 };
                        setEditingBlockIndex(index);
                      }}
                      onBlur={() => setEditingBlockIndex((current) => (current === index ? null : current))}
                      onSelectionChange={(event) => {
                        if (selectedBlockIndex.current === index) selection.current = event.nativeEvent.selection;
                      }}
                      accessibilityLabel={block.type === 'text' ? 'Texto da nota' : undefined}
                      placeholder={
                        block.type === 'heading'
                          ? 'Título da seção'
                          : block.type === 'bullet'
                            ? 'Item da lista'
                            : block.type === 'text' && blocks.length === 1 && index === 0 && !block.text
                              ? 'Comece a escrever…'
                              : undefined
                      }
                      multiline
                      style={[
                        styles.blockInput,
                        styles.editorBlockInput,
                        block.type === 'heading' && styles.headingInput,
                        block.type === 'bullet' && styles.bulletInput,
                      ]}
                    />
                  )}
                </LongPressItem>
              );
            return null;
          })}
          {noteId && linkedTasks.length ? (
            <View style={styles.linkedTasks}>
              <Text style={styles.linkedTasksTitle}>Tarefas</Text>
              {linkedTasks.map((task) => (
                <LongPressItem
                  key={task.id}
                  title={task.title}
                  onPress={() => void openLinkedTask(task)}
                  style={styles.linkedTaskRow}
                  actions={[
                    {
                      label: 'Abrir tarefa',
                      icon: 'open-outline',
                      onPress: () => void openLinkedTask(task),
                    },
                  ]}
                >
                  <Checkbox checked={Boolean(task.completedAt)} label={task.title} onPress={() => toggleLinkedTask(task)} />
                  <Text style={[styles.linkedTaskName, task.completedAt && styles.checkedText]} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </LongPressItem>
              ))}
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.toolbar}>
          <IconButton icon="text-outline" onPress={() => setFormatSheet(true)} label="Formatação" />
          <IconButton
            icon="checkbox-outline"
            onPress={() => addBlock({ type: 'checklist', items: [createChecklistItem()] })}
            label="Checklist"
          />
          <IconButton icon="checkmark-circle-outline" onPress={() => void openRelatedTask()} label="Criar tarefa nesta nota" />
          <IconButton icon="attach-outline" onPress={() => setAttachmentSheet(true)} label="Anexo" />
        </View>
        <ActionSheet
          visible={attachmentSheet}
          title="Anexar à nota"
          onClose={() => setAttachmentSheet(false)}
          options={[
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
        <BottomSheet visible={formatSheet} title="Formatação" onClose={() => setFormatSheet(false)}>
          <Text style={styles.formatSectionTitle}>Estilo do texto</Text>
          <View style={styles.formatStyleRow}>
            {(
              [
                { style: 'bold', label: 'Negrito', glyph: 'B' },
                { style: 'italic', label: 'Itálico', glyph: 'I' },
                { style: 'underline', label: 'Sublinhado', glyph: 'U' },
                { style: 'strike', label: 'Riscado', glyph: 'S' },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.style}
                onPress={() => formatText(item.style)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={styles.formatStyleButton}
              >
                <Text
                  style={[
                    styles.formatStyleGlyph,
                    item.style === 'bold' && styles.formatBold,
                    item.style === 'italic' && styles.formatItalic,
                    item.style === 'underline' && styles.formatUnderline,
                    item.style === 'strike' && styles.formatStrike,
                  ]}
                >
                  {item.glyph}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.formatHint}>Selecione um trecho; sem seleção, o estilo vale para o bloco inteiro.</Text>
          <Text style={styles.formatSectionTitle}>Adicionar bloco</Text>
          <View style={styles.formatBlockGrid}>
            {(
              [
                { label: 'Texto', icon: 'text-outline', onPress: () => addBlock({ type: 'text', text: '' }) },
                { label: 'Título', icon: 'document-text-outline', onPress: () => addBlock({ type: 'heading', level: 2, text: '' }) },
                { label: 'Lista', icon: 'list-outline', onPress: () => addBlock({ type: 'bullet', text: '' }) },
                { label: 'Link', icon: 'link-outline', onPress: () => setLinkSheet(true) },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  setFormatSheet(false);
                  item.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Adicionar ${item.label.toLowerCase()}`}
                style={styles.formatBlockButton}
              >
                <AppIcon name={item.icon} size={19} />
                <Text style={styles.formatBlockLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </BottomSheet>
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
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    safeRoot: { flex: 1, backgroundColor: colors.surface },
    root: { flex: 1, backgroundColor: colors.surface },
    editor: { padding: spacing.lg, paddingBottom: 100, gap: spacing.sm },
    linkedTasks: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    linkedTasksTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.md },
    linkedTaskRow: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    linkedTaskName: { ...typography.bodyStrong, color: colors.ink, flex: 1 },
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
    editorBlockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      gap: spacing.xs,
      outlineStyle: 'none' as unknown as 'solid',
    },
    editorAttachmentCard: { gap: spacing.xs },
    audioBlock: { marginBottom: spacing.sm },
    editorAttachmentPressed: { backgroundColor: colors.surfacePressed },
    editorBlockInput: { flex: 1, minWidth: 0, outlineStyle: 'none' as unknown as 'solid' },
    formattedPreview: { minHeight: 48, justifyContent: 'center' },
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
    formatSectionTitle: { ...typography.caption, color: colors.inkMuted, fontWeight: '700', marginBottom: spacing.sm },
    formatStyleRow: { flexDirection: 'row', gap: spacing.sm },
    formatStyleButton: {
      flex: 1,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formatStyleGlyph: { fontSize: 19, color: colors.ink },
    formatBold: { fontWeight: '800' },
    formatItalic: { fontStyle: 'italic' },
    formatUnderline: { textDecorationLine: 'underline' },
    formatStrike: { textDecorationLine: 'line-through' },
    formatHint: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.sm, marginBottom: spacing.xl },
    formatBlockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    formatBlockButton: {
      flexBasis: '47%',
      flexGrow: 1,
      minHeight: 48,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    formatBlockLabel: { ...typography.body, color: colors.ink },
  });
