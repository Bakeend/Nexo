import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, PrimaryButton, SecondaryButton } from '@/components/ui';
import { AppDialog } from '@/components/visual';
import { createBackup, restoreBackup, validateBackup } from '@/services/backup-service';
import { reconcileReminders } from '@/services/notification-service';

export default function Backup() {
  const [dialog, setDialog] = useState<{ title: string; message: string; destructive?: boolean } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<Awaited<ReturnType<typeof validateBackup>> | null>(null);
  const exportData = () =>
    createBackup()
      .then((uri) => setDialog({ title: 'Backup exportado', message: uri }))
      .catch(() => setDialog({ title: 'Erro', message: 'Não foi possível criar o backup.' }));
  const importData = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    try {
      const payload = await validateBackup(result.assets[0].uri);
      setPendingRestore(payload);
    } catch {
      setDialog({ title: 'Backup inválido', message: 'O arquivo não alterou seus dados. Escolha um backup do Nexo.' });
    }
  };
  const confirmRestore = async () => {
    if (!pendingRestore) return;
    await restoreBackup(pendingRestore);
    await reconcileReminders();
    setPendingRestore(null);
    setDialog({ title: 'Backup restaurado', message: 'Os dados foram restaurados e os lembretes foram reconciliados.' });
  };
  return (
    <View style={styles.root}>
      <Header title="Backup" onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.title}>Seus dados, no seu dispositivo</Text>
        <Text style={styles.body}>
          Exporte um arquivo Nexo Backup dos seus conteúdos ou restaure uma cópia anterior. A restauração é substitutiva e sempre pede
          confirmação.
        </Text>
        <PrimaryButton title="Exportar backup" onPress={exportData} />
        <SecondaryButton title="Restaurar backup" onPress={importData} />
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
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.heading, color: colors.ink },
  body: { ...typography.body, color: colors.inkMuted },
});
