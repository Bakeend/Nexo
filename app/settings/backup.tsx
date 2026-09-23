import { goBackOrHome } from '@/navigation/back';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { Header, PrimaryButton, SecondaryButton } from '@/components/ui';
import { AppDialog } from '@/components/visual';
import { createBackup, restoreBackup, validateBackup } from '@/services/backup-service';
import { reconcileReminders } from '@/services/notification-service';
import { playUISound } from '@/services/ui-sound-service';
import { AnimatedListItem } from '@/motion/AnimatedListItem';

export default function Backup() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [dialog, setDialog] = useState<{ title: string; message: string; destructive?: boolean } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<Awaited<ReturnType<typeof validateBackup>> | null>(null);
  const [busy, setBusy] = useState<'export' | 'import' | 'restore' | null>(null);
  const [restoreStep, setRestoreStep] = useState<'data' | 'reminders'>('data');
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const exportData = async () => {
    setFeedback(null);
    setBusy('export');
    try {
      const uri = await createBackup();
      playUISound('success-tick');
      setFeedback({ message: 'Backup exportado', tone: 'success' });
      setDialog({ title: 'Backup exportado', message: uri });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar o backup.';
      playUISound('error-soft');
      setFeedback({ message: 'Não foi possível exportar o backup', tone: 'error' });
      setDialog({ title: 'Erro', message });
    } finally {
      setBusy(null);
    }
  };
  const importData = async () => {
    setFeedback(null);
    setBusy('import');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const payload = await validateBackup(result.assets[0].uri);
      setPendingRestore(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'O arquivo não alterou seus dados.';
      playUISound('error-soft');
      setFeedback({ message: 'Arquivo inválido', tone: 'error' });
      setDialog({ title: 'Backup inválido', message });
    } finally {
      setBusy(null);
    }
  };
  const confirmRestore = async () => {
    if (!pendingRestore) return;
    setFeedback(null);
    setRestoreStep('data');
    setPendingRestore(null);
    setBusy('restore');
    try {
      const result = await restoreBackup(pendingRestore);
      setRestoreStep('reminders');
      await reconcileReminders();
      playUISound('success-tick');
      setFeedback({ message: 'Backup restaurado', tone: 'success' });
      const legacyCount = result.legacyAttachmentsOmitted;
      const legacyNotice = legacyCount
        ? ` ${legacyCount} ${legacyCount === 1 ? 'anexo de um backup antigo foi ignorado' : 'anexos de um backup antigo foram ignorados'} porque o arquivo não incluía o conteúdo físico.`
        : '';
      setDialog({
        title: 'Backup restaurado',
        message: `Os dados foram restaurados e os lembretes foram reconciliados.${legacyNotice}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível restaurar o backup. Tente novamente.';
      playUISound('error-soft');
      setFeedback({ message: 'Não foi possível restaurar o backup', tone: 'error' });
      setDialog({ title: 'Erro ao restaurar', message });
    } finally {
      setBusy(null);
    }
  };
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Backup" onBack={() => goBackOrHome()} />
      <View style={styles.content}>
        <Text style={styles.title}>Seus dados, no seu dispositivo</Text>
        <Text style={styles.body}>
          Exporte um arquivo Nexo Backup dos seus conteúdos ou restaure uma cópia anterior. A restauração é substitutiva e sempre pede
          confirmação.
        </Text>
        <PrimaryButton
          title={busy === 'export' ? 'Exportando backup…' : 'Exportar backup'}
          icon={feedback?.message === 'Backup exportado' ? 'checkmark' : 'download-outline'}
          onPress={exportData}
          loading={busy === 'export'}
          disabled={busy !== null}
        />
        <SecondaryButton
          title={busy === 'import' ? 'Verificando arquivo…' : 'Restaurar backup'}
          onPress={importData}
          loading={busy === 'import'}
          disabled={busy !== null}
        />
        {busy === 'restore' ? (
          <View style={styles.progress}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.progressText}>{restoreStep === 'data' ? 'Restaurando dados…' : 'Reagendando lembretes…'}</Text>
          </View>
        ) : null}
        {feedback ? (
          <AnimatedListItem key={feedback.message}>
            <View style={[styles.feedback, feedback.tone === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
              <Ionicons
                name={feedback.tone === 'success' ? 'checkmark-circle' : 'close-circle'}
                size={19}
                color={feedback.tone === 'success' ? colors.success : colors.danger}
              />
              <Text style={[styles.feedbackText, feedback.tone === 'success' ? styles.feedbackSuccessText : styles.feedbackErrorText]}>
                {feedback.message}
              </Text>
            </View>
          </AnimatedListItem>
        ) : null}
      </View>
      <AppDialog
        visible={Boolean(pendingRestore)}
        title="Substituir dados locais?"
        message="A restauração substitui as entidades atuais pelo arquivo. Essa ação não pode ser desfeita."
        confirmLabel="Restaurar"
        destructive
        onClose={() => setPendingRestore(null)}
        onConfirm={confirmRestore}
      />
      <AppDialog
        visible={Boolean(dialog)}
        title={dialog?.title || ''}
        message={dialog?.message}
        destructive={dialog?.destructive}
        confirmLabel="Entendi"
        onClose={() => setDialog(null)}
        onConfirm={() => setDialog(null)}
      />
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: spacing.lg, gap: spacing.md },
    title: { ...typography.heading, color: colors.ink },
    body: { ...typography.body, color: colors.inkMuted },
    progress: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
    },
    progressText: { ...typography.bodyStrong, color: colors.accentDark },
    feedback: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
    },
    feedbackSuccess: { backgroundColor: colors.successSoft },
    feedbackError: { backgroundColor: colors.dangerSoft },
    feedbackText: { ...typography.bodyStrong },
    feedbackSuccessText: { color: colors.success },
    feedbackErrorText: { color: colors.danger },
  });
