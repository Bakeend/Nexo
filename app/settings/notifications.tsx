import { goBackOrHome } from '@/navigation/back';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Platform, Animated, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { Header, PrimaryButton } from '@/components/ui';
import { useSnackbar } from '@/components/visual';
import { requestNotificationPermission, reconcileReminders } from '@/services/notification-service';
import { motionDuration } from '@/motion/tokens';
import { motionSpring } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';

export default function NotificationsSettings() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [permissionResult, setPermissionResult] = useState<boolean | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [statusVersion, setStatusVersion] = useState(0);
  const [statusOpacity] = useState(() => new Animated.Value(0));
  const [statusScale] = useState(() => new Animated.Value(0.9));
  const [summaryOpacity] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (permissionResult === null) return;
    statusOpacity.setValue(0);
    statusScale.setValue(reducedMotion ? 1 : 0.9);
    Animated.parallel([
      Animated.timing(statusOpacity, {
        toValue: 1,
        duration: reducedMotion ? motionDuration.fast : motionDuration.normal,
        useNativeDriver: Platform.OS !== 'web',
      }),
      ...(reducedMotion ? [] : [Animated.spring(statusScale, { toValue: 1, ...motionSpring.selection, useNativeDriver: Platform.OS !== 'web' })]),
    ]).start();
  }, [permissionResult, reducedMotion, statusOpacity, statusScale, statusVersion]);

  useEffect(() => {
    if (summary === null) return;
    summaryOpacity.setValue(0);
    Animated.timing(summaryOpacity, {
      toValue: 1,
      duration: reducedMotion ? motionDuration.fast : motionDuration.normal,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [summary, reducedMotion, summaryOpacity]);

  const checkPermission = async () => {
    setCheckingPermission(true);
    try {
      const granted = await requestNotificationPermission();
      setPermissionResult(granted);
      setStatusVersion((version) => version + 1);
      showSnackbar(granted ? 'Permissão concedida' : 'Permissão negada', granted ? 'success' : 'error');
    } catch {
      setPermissionResult(false);
      setStatusVersion((version) => version + 1);
      showSnackbar('Não foi possível verificar a permissão', 'error');
    } finally {
      setCheckingPermission(false);
    }
  };

  const verifySchedules = async () => {
    setSummary(null);
    setReconciling(true);
    try {
      const value = await reconcileReminders();
      setSummary(`${value.scheduledCount} notificações estão agendadas no dispositivo.`);
    } catch {
      setSummary('Não foi possível verificar os agendamentos. Tente novamente.');
      showSnackbar('Não foi possível verificar os agendamentos', 'error');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Notificações" onBack={() => goBackOrHome()} />
      <View style={styles.content}>
        <Text style={styles.title}>Lembretes locais</Text>
        <Text style={styles.description}>
          O Nexo agenda lembretes diretamente no dispositivo. Você pode continuar usando o app mesmo se negar a permissão.
        </Text>
        <PrimaryButton
          title={checkingPermission ? 'Verificando permissão…' : 'Permitir notificações'}
          loading={checkingPermission}
          disabled={reconciling}
          onPress={checkPermission}
        />
        {permissionResult === null ? (
          <Text style={styles.pending}>Ainda não verificado</Text>
        ) : (
          <Animated.View
            accessibilityRole="text"
            style={[
              styles.statusRow,
              permissionResult ? styles.statusGranted : styles.statusDenied,
              { opacity: statusOpacity, transform: [{ scale: statusScale }] },
            ]}
          >
            <Ionicons
              name={permissionResult ? 'checkmark-circle' : 'close-circle'}
              size={19}
              color={permissionResult ? colors.success : colors.danger}
            />
            <Text style={[styles.status, permissionResult ? styles.statusGrantedText : styles.statusDeniedText]}>
              {permissionResult ? 'Permissão concedida' : 'Permissão negada'}
            </Text>
          </Animated.View>
        )}
        <PrimaryButton
          title={reconciling ? 'Verificando agendamentos…' : 'Verificar agendamentos'}
          loading={reconciling}
          disabled={checkingPermission}
          onPress={verifySchedules}
        />
        {summary ? (
          <Animated.Text accessibilityRole="text" style={[styles.summary, { opacity: summaryOpacity }]}>
            {summary}
          </Animated.Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: spacing.lg, gap: spacing.md },
    title: { ...typography.heading, color: colors.ink },
    description: { ...typography.body, color: colors.inkMuted },
    pending: { ...typography.caption, color: colors.inkMuted, marginTop: -spacing.xs },
    statusRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
    status: { ...typography.bodyStrong },
    statusGranted: { backgroundColor: colors.successSoft, borderRadius: 12 },
    statusDenied: { backgroundColor: colors.dangerSoft, borderRadius: 12 },
    statusGrantedText: { color: colors.success },
    statusDeniedText: { color: colors.danger },
    summary: { ...typography.body, color: colors.inkSoft },
  });
