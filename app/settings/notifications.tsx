import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, PrimaryButton } from '@/components/ui';
import { AppDialog } from '@/components/visual';
import { requestNotificationPermission, reconcileReminders } from '@/services/notification-service';
export default function NotificationsSettings() {
  const [status, setStatus] = useState('Ainda não verificado');
  const [summary, setSummary] = useState<string | null>(null);
  return (
    <View style={styles.root}>
      <Header title="Notificações" onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.title}>Lembretes locais</Text>
        <Text style={styles.description}>
          O Nexo agenda lembretes diretamente no dispositivo. Você pode continuar usando o app mesmo se negar a permissão.
        </Text>
        <PrimaryButton
          title="Permitir notificações"
          onPress={async () => {
            const ok = await requestNotificationPermission();
            setStatus(ok ? 'Permissão concedida' : 'Permissão negada');
          }}
        />
        <Text style={styles.status}>{status}</Text>
        <PrimaryButton
          title="Verificar agendamentos"
          onPress={() =>
            reconcileReminders().then((value) => setSummary(`${value.scheduledCount} notificações estão agendadas no dispositivo.`))
          }
        />
      </View>
      <AppDialog
        visible={Boolean(summary)}
        title="Agendamentos"
        message={summary || undefined}
        confirmLabel="Entendi"
        onClose={() => setSummary(null)}
        onConfirm={() => setSummary(null)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.heading, color: colors.ink },
  description: { ...typography.body, color: colors.inkMuted },
  status: { ...typography.caption, color: colors.accent },
});
