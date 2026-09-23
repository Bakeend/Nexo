import { goBackOrHome } from '@/navigation/back';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { Header, ListRow } from '@/components/ui';
import { AppDialog, useSnackbar } from '@/components/visual';
import { createAttachment, createInboxCapture } from '@/database/repositories';
import { pickFile } from '@/services/media-service';
import { playUISound } from '@/services/ui-sound-service';
import { motionDuration } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
export default function Files() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const { showSnackbar } = useSnackbar();
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const [successProgress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!status || processing) return;
    successProgress.setValue(0);
    Animated.timing(successProgress, { toValue: 1, duration: reducedMotion ? 80 : motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [processing, reducedMotion, status, successProgress]);
  const add = async () => {
    if (processing) return;
    setStatus('');
    setProcessing(true);
    try {
      const file = await pickFile();
      if (file) {
        const capture = await createInboxCapture(`Arquivo: ${file.name}`, 'file');
        await createAttachment({
          itemId: capture.itemId,
          itemType: 'file',
          type: 'file',
          originalName: file.name,
          localPath: file.uri,
          mimeType: file.mimeType,
          sizeBytes: file.size,
        });
        setStatus('Arquivo salvo na Caixa de entrada');
        playUISound('attach');
        showSnackbar('Arquivo anexado', 'info');
      }
    } catch {
      playUISound('error-soft');
      setError('O arquivo não foi alterado. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Arquivos" onBack={() => goBackOrHome()} />
      <View style={styles.content}>
        <Text style={styles.title}>Adicionar arquivo</Text>
        <Text style={styles.body}>
          Arquivos importados ficam no armazenamento local do Nexo e aparecem na Caixa de entrada para organização.
        </Text>
        <ListRow icon="document-attach-outline" title="Escolher arquivo" subtitle="PDF, documento ou outro formato" onPress={add} />
        {processing ? (
          <View style={styles.processing}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.status}>Importando arquivo…</Text>
          </View>
        ) : status ? (
          <Animated.View
            style={[
              styles.successCard,
              {
                opacity: successProgress,
                transform: [{ scale: successProgress.interpolate({ inputRange: [0, 1], outputRange: [reducedMotion ? 1 : 0.96, 1] }) }],
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.successText}>{status}</Text>
          </Animated.View>
        ) : null}
      </View>
      <AppDialog
        visible={Boolean(error)}
        title="Não foi possível adicionar"
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
    successCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.successSoft,
    },
    successText: { ...typography.caption, color: colors.success },
  });
