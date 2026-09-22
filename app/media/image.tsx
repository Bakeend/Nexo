import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, ListRow } from '@/components/ui';
import { createAttachment, createInboxCapture } from '@/database/repositories';
import { captureImage, pickImage } from '@/services/media-service';
export default function ImageCapture() {
  const [status, setStatus] = useState('');
  const save = async (mode: 'camera' | 'gallery') => {
    try {
      const image = mode === 'camera' ? await captureImage() : await pickImage();
      if (image) {
        const capture = await createInboxCapture(`${image.fileName || 'imagem'}\n${image.uri}`, 'image');
        await createAttachment({
          itemId: capture.itemId,
          itemType: 'image',
          type: 'image',
          originalName: image.fileName || 'imagem.jpg',
          localPath: image.uri,
          mimeType: image.mimeType || 'image/jpeg',
          sizeBytes: image.fileSize,
        });
        setStatus('Imagem salva na Caixa de entrada');
      }
    } catch (error) {
      Alert.alert('Não foi possível adicionar a imagem', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };
  return (
    <View style={styles.root}>
      <Header title="Adicionar foto" onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.title}>Guardar uma imagem</Text>
        <Text style={styles.body}>Escolha uma foto agora. Título, descrição e espaço podem ser organizados depois.</Text>
        <ListRow icon="camera-outline" title="Câmera" subtitle="Tirar uma nova foto" onPress={() => save('camera')} />
        <ListRow icon="images-outline" title="Galeria" subtitle="Escolher uma foto existente" onPress={() => save('gallery')} />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg },
  title: { ...typography.heading, color: colors.ink },
  body: { ...typography.body, color: colors.inkMuted, marginVertical: spacing.md },
  status: { ...typography.caption, color: colors.success, marginTop: spacing.lg },
});
