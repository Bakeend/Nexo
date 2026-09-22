import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, PrimaryButton, SecondaryButton } from '@/components/ui';
import { createBackup, restoreBackup, validateBackup } from '@/services/backup-service';
import { reconcileReminders } from '@/services/notification-service';

export default function Backup() {
  const exportData = () =>
    createBackup()
      .then((uri) => Alert.alert('Backup exportado', uri))
      .catch(() => Alert.alert('Erro', 'Não foi possível criar o backup.'));
  const importData = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    try {
      const payload = await validateBackup(result.assets[0].uri);
      Alert.alert(
        'Substituir dados locais?',
        'A restauração substitui as entidades atuais pelos dados do arquivo. Essa ação não pode ser desfeita.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: async () => {
              await restoreBackup(payload);
              await reconcileReminders();
              Alert.alert('Backup restaurado', 'Os dados foram restaurados e os lembretes serão reconciliados.');
            },
          },
        ],
      );
    } catch {
      Alert.alert('Backup inválido', 'O arquivo não alterou seus dados. Escolha um backup do Nexo.');
    }
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
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.heading, color: colors.ink },
  body: { ...typography.body, color: colors.inkMuted },
});
