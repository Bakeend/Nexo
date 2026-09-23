import { goBackOrHome } from '@/navigation/back';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { Header, ListRow } from '@/components/ui';
import { AppDialog, useSnackbar } from '@/components/visual';
import { createAttachment, createInboxCapture } from '@/database/repositories';
import { captureImage, pickImage, resolveMediaUri } from '@/services/media-service';
import { playUISound } from '@/services/ui-sound-service';
import { motionDuration } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
export default function ImageCapture() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const { showSnackbar } = useSnackbar();
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const [previewProgress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!previewUri || processing) return;
    previewProgress.setValue(0);
    Animated.timing(previewProgress, {
      toValue: 1,
      duration: reducedMotion ? 80 : motionDuration.normal,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [previewUri, processing, reducedMotion, previewProgress]);
  const save = async (mode: 'camera' | 'gallery') => {
    if (processing) return;
    setStatus('');
    setProcessing(true);
    try {
      const image = mode === 'camera' ? await captureImage() : await pickImage();
      if (image) {
        const friendlyName = image.fileName || 'Nova imagem';
        const capture = await createInboxCapture(`Imagem: ${friendlyName}`, 'image');
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
        setPreviewUri(await resolveMediaUri(image.uri));
        playUISound('attach');
        showSnackbar('Imagem anexada', 'info');
      }
    } catch (error) {
      playUISound('error-soft');
      setError(error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Adicionar foto" onBack={() => goBackOrHome()} />
      <View style={styles.content}>
        <Text style={styles.title}>Guardar uma imagem</Text>
        <Text style={styles.body}>Escolha uma foto agora. Título, descrição e espaço podem ser organizados depois.</Text>
        <ListRow icon="camera-outline" title="Câmera" subtitle="Tirar uma nova foto" onPress={() => save('camera')} />
        <ListRow icon="images-outline" title="Galeria" subtitle="Escolher uma foto existente" onPress={() => save('gallery')} />
        {processing ? (
          <View style={styles.processing}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.status}>Salvando imagem…</Text>
          </View>
        ) : status && previewUri ? (
          <Animated.View
            style={[
              styles.previewCard,
              {
                opacity: previewProgress,
                transform: [{ scale: previewProgress.interpolate({ inputRange: [0, 1], outputRange: [reducedMotion ? 1 : 0.96, 1] }) }],
              },
            ]}
          >
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
            <View style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.successText}>{status}</Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
      <AppDialog
        visible={Boolean(error)}
        title="Não foi possível adicionar a imagem"
        message={error || undefined}
        confirmLabel="Entendi"
        onClose={() => setError(null)}
        onConfirm={() => setError(null)}
      />
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: spacing.lg },
    title: { ...typography.heading, color: colors.ink },
    body: { ...typography.body, color: colors.inkMuted, marginVertical: spacing.md },
    status: { ...typography.caption, color: colors.success, marginTop: spacing.lg },
    processing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
    previewCard: { marginTop: spacing.lg, padding: spacing.sm, borderRadius: 14, backgroundColor: colors.surface, gap: spacing.sm },
    previewImage: { width: '100%', height: 160, borderRadius: 10, backgroundColor: colors.surfaceMuted },
    successRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    successText: { ...typography.caption, color: colors.success },
  });
