import { goBackOrHome } from '@/navigation/back';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Animated, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { Header, ListRow, PrimaryButton } from '@/components/ui';
import { LongPressItem } from '@/components/long-press-item';
import { useItemActions, useSnackbar } from '@/components/visual';
import { completeReminder, findReminder, trashReminder } from '@/database/repositories';
import { cancelReminder, createNextRecurringReminder, scheduleReminder, snoozeReminder } from '@/services/notification-service';
import type { Reminder } from '@/types/domain';
import { playUISound } from '@/services/ui-sound-service';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { motionDuration, motionSpring } from '@/motion/tokens';
import { useRef } from 'react';

export default function ReminderDetail() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reminder, setReminder] = useState<Reminder>();
  const reducedMotion = useReducedMotion();
  const enabledProgress = useRef(new Animated.Value(0)).current;
  const clockMotion = useRef(new Animated.Value(0)).current;
  const [finishing, setFinishing] = useState(false);
  const { showItemConfirmation } = useItemActions();
  const { showSnackbar } = useSnackbar();
  const load = useCallback(async () => {
    if (id) setReminder(await findReminder(id));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!reminder) return;
    if (reducedMotion) {
      enabledProgress.setValue(reminder.enabled ? 1 : 0);
      return;
    }
    Animated.spring(enabledProgress, {
      toValue: reminder.enabled ? 1 : 0,
      ...motionSpring.selection,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [enabledProgress, reducedMotion, reminder]);
  const onOpacity = enabledProgress;
  const offOpacity = enabledProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  if (!reminder)
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <Header title="Lembrete" onBack={() => goBackOrHome()} />
        <Text style={styles.muted}>Lembrete não encontrado.</Text>
      </SafeAreaView>
    );
  const finish = async () => {
    if (finishing || reminder.completedAt) return;
    setFinishing(true);
    await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 80 : motionDuration.normal));
    try {
      if (reminder.repeatRule) await createNextRecurringReminder(reminder);
      else await completeReminder(reminder.id);
      playUISound('complete');
      showSnackbar('Lembrete concluído', 'success');
      await load();
    } finally {
      setFinishing(false);
    }
  };
  const deleteReminder = async () => {
    await cancelReminder(reminder);
    await trashReminder(reminder.id);
    playUISound('swipe-soft');
    showSnackbar('Lembrete excluído', 'info');
    goBackOrHome();
  };
  const snooze = async () => {
    if (!reducedMotion) {
      Animated.sequence([
        Animated.timing(clockMotion, { toValue: 1, duration: motionDuration.fast, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(clockMotion, { toValue: 0, ...motionSpring.selection, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
    await snoozeReminder(reminder, new Date(Date.now() + 10 * 60 * 1000));
    playUISound('clock-tick');
    showSnackbar('Lembrete adiado por 10 minutos', 'info');
    await load();
  };
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Lembrete" onBack={() => goBackOrHome()} />
      <View style={styles.content}>
        <LongPressItem
          title={reminder.title}
          style={styles.titleActionTarget}
          actions={[
            { label: 'Adiar 10 minutos', icon: 'time-outline', onPress: snooze },
            {
              label: 'Editar',
              icon: 'create-outline',
              onPress: () => router.push({ pathname: '/reminders/new', params: { id: reminder.id } }),
            },
            {
              label: 'Tags',
              icon: 'pricetags-outline',
              onPress: () => router.push({ pathname: '/tags', params: { itemId: reminder.id, itemType: 'reminder' } } as never),
            },
            {
              label: reminder.enabled ? 'Desativar' : 'Ativar',
              icon: reminder.enabled ? 'pause-circle-outline' : 'play-circle-outline',
              onPress: async () => {
                if (reminder.enabled) await cancelReminder(reminder);
                else await scheduleReminder(reminder);
                playUISound('selection-click');
                showSnackbar(reminder.enabled ? 'Lembrete desativado' : 'Lembrete ativado', 'info');
                await load();
              },
            },
            {
              label: 'Excluir',
              icon: 'trash-outline',
              destructive: true,
              onPress: () =>
                showItemConfirmation({
                  title: 'Excluir lembrete?',
                  message: 'O lembrete será movido para a lixeira.',
                  confirmLabel: 'Excluir',
                  onConfirm: deleteReminder,
                }),
            },
          ]}
        >
          <Text style={[styles.title, finishing && styles.finishedTitle]}>{reminder.title}</Text>
          <View style={styles.metaRow}>
            <Animated.View
              style={{ transform: [{ rotate: clockMotion.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '16deg'] }) }] }}
            >
              <Ionicons name="time-outline" size={18} color={colors.inkMuted} />
            </Animated.View>
            <View style={styles.stateIcon}>
              <Animated.View style={[styles.stateGlyph, { opacity: offOpacity }]}>
                <Ionicons name="pause-circle-outline" size={18} color={colors.inkMuted} />
              </Animated.View>
              <Animated.View style={[styles.stateGlyph, { opacity: onOpacity }]}>
                <Ionicons name="play-circle-outline" size={18} color={colors.success} />
              </Animated.View>
            </View>
            <Text style={styles.meta}>
              {reminder.completedAt ? 'Concluído' : reminder.enabled ? 'Ativo' : 'Desativado'} · {reminder.notificationStatus}
            </Text>
          </View>
        </LongPressItem>
        <ListRow icon="calendar-outline" title="Quando" subtitle={new Date(reminder.scheduledAt).toLocaleString('pt-BR')} />
        <ListRow icon="repeat-outline" title="Repetição" subtitle={reminder.repeatRule?.type || 'Nunca'} />
        {reminder.description ? <Text style={styles.body}>{reminder.description}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton title={reminder.completedAt ? 'Concluído' : 'Concluir lembrete'} onPress={finish} />
        </View>
      </View>
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: { padding: spacing.lg },
    titleActionTarget: { borderRadius: 12, marginHorizontal: -spacing.xs, paddingHorizontal: spacing.xs },
    title: { ...typography.title, color: colors.ink },
    finishedTitle: { color: colors.inkMuted, textDecorationLine: 'line-through' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginVertical: spacing.lg },
    meta: { ...typography.body, color: colors.inkMuted },
    stateIcon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
    stateGlyph: { position: 'absolute' },
    body: { ...typography.body, color: colors.ink, marginVertical: spacing.lg },
    actions: { gap: spacing.sm, marginTop: spacing.xl },
    muted: { ...typography.body, color: colors.inkMuted, padding: spacing.lg },
  });
