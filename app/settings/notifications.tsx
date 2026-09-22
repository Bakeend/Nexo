import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, PrimaryButton } from '@/components/ui';
import { requestNotificationPermission, reconcileReminders } from '@/services/notification-service';
export default function NotificationsSettings() {
  const [status, setStatus] = useState('Ainda não verificado');
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
            reconcileReminders().then((value) => Alert.alert('Agendamentos', `${value.scheduledCount} notificações no sistema.`))
          }
        />
      </View>
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
