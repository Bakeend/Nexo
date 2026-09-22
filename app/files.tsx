import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, ListRow } from '@/components/ui';
import { AppDialog, useSnackbar } from '@/components/visual';
import { createAttachment, createInboxCapture } from '@/database/repositories';
import { pickFile } from '@/services/media-service';
export default function Files() {
  const { showSnackbar } = useSnackbar();
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = async () => {
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
        showSnackbar('Arquivo anexado');
      }
    } catch {
      setError('O arquivo não foi alterado. Tente novamente.');
    }
  };
  return (
    <View style={styles.root}>
      <Header title="Arquivos" onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.title}>Adicionar arquivo</Text>
        <Text style={styles.body}>
          Arquivos importados ficam no armazenamento local do Nexo e aparecem na Caixa de entrada para organização.
        </Text>
        <ListRow icon="document-attach-outline" title="Escolher arquivo" subtitle="PDF, documento ou outro formato" onPress={add} />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
      <AppDialog
        visible={Boolean(error)}
        title="Não foi possível adicionar"
        message={error || undefined}
        confirmLabel="Entendi"
        onClose={() => setError(null)}
        onConfirm={() => setError(null)}
      />
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
