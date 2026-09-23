import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useRef, useState } from 'react';
import { Platform, Animated, StyleSheet, View } from 'react-native';
import { colors, spacing, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { EmptyState, FloatingButton, Header, ListRow } from '@/components/ui';
import { completeReminder, listReminders, trashReminder } from '@/database/repositories';
import type { Reminder } from '@/types/domain';
import { cancelReminder, createNextRecurringReminder, snoozeReminder } from '@/services/notification-service';
import { useItemActions, useSnackbar } from '@/components/visual';
import { playUISound } from '@/services/ui-sound-service';
import { AnimatedListItem } from '@/motion/AnimatedListItem';
import { animateListLayout } from '@/motion/layout';
import { motionDuration, motionSpring } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { goBackOrHome } from '@/navigation/back';

function ReminderMotionRow({
  item,
  exiting,
  onExitComplete,
  onSnooze,
  onComplete,
  onDelete,
}: {
  item: Reminder;
  exiting: boolean;
  onExitComplete: () => void;
  onSnooze: () => Promise<void>;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const nudge = useRef(new Animated.Value(0)).current;
  const [completing, setCompleting] = useState(false);
  const snooze = async () => {
    if (!reducedMotion) {
      Animated.sequence([
        Animated.timing(nudge, { toValue: 16, duration: motionDuration.fast, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(nudge, { toValue: 0, ...motionSpring.selection, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
    await onSnooze();
  };
  return (
    <AnimatedListItem exiting={exiting} onExitComplete={onExitComplete}>
      <Animated.View style={{ transform: [{ translateX: nudge }] }}>
        <ListRow
          icon={completing ? 'checkmark-circle-outline' : 'notifications-outline'}
          title={item.title}
          subtitle={`${new Date(item.scheduledAt).toLocaleString('pt-BR')} · ${item.notificationStatus}`}
          onPress={() => router.push({ pathname: '/reminders/[id]', params: { id: item.id } })}
          longPressTitle={item.title}
          longPressActions={[
            {
              label: 'Editar',
              icon: 'create-outline',
              onPress: () => router.push({ pathname: '/reminders/new', params: { id: item.id } }),
            },
            { label: 'Adiar 10 minutos', icon: 'time-outline', onPress: snooze },
            {
              label: 'Concluir',
              icon: 'checkmark-circle-outline',
              onPress: () => {
                setCompleting(true);
                onComplete();
              },
            },
            { label: 'Excluir', icon: 'trash-outline', destructive: true, onPress: onDelete },
          ]}
        />
      </Animated.View>
    </AnimatedListItem>
  );
}
export default function Reminders() {
  const styles = useThemeStyles(makeStyles);
  const [items, setItems] = useState<Reminder[]>([]);
  const [exitingIds, setExitingIds] = useState<Record<string, boolean>>({});
  const pendingExits = useRef(new Map<string, () => Promise<void>>());
  const reducedMotion = useReducedMotion();
  const { showItemConfirmation } = useItemActions();
  const { showSnackbar } = useSnackbar();
  const load = useCallback(
    () =>
      listReminders().then((next) => {
        animateListLayout(reducedMotion);
        setItems(next);
      }),
    [reducedMotion],
  );
  const exitThen = (id: string, action: () => Promise<void>, delay = 0) => {
    if (pendingExits.current.has(id)) return;
    pendingExits.current.set(id, action);
    setTimeout(() => setExitingIds((current) => ({ ...current, [id]: true })), reducedMotion ? 0 : delay);
  };
  const finishExit = async (id: string) => {
    const action = pendingExits.current.get(id);
    if (!action) return;
    pendingExits.current.delete(id);
    try {
      await action();
    } finally {
      setExitingIds((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  };
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header
        title="Lembretes"
        onBack={goBackOrHome}
        action={() => router.push('/reminders/new')}
        actionIcon="add"
        actionLabel="Novo lembrete"
      />
      <View style={styles.content}>
        {items.length ? (
          items.map((item) => (
            <ReminderMotionRow
              key={item.id}
              item={item}
              exiting={Boolean(exitingIds[item.id])}
              onExitComplete={() => void finishExit(item.id)}
              onSnooze={async () => {
                await snoozeReminder(item, new Date(Date.now() + 10 * 60 * 1000));
                playUISound('clock-tick');
                showSnackbar('Lembrete adiado por 10 minutos', 'info');
                await load();
              }}
              onComplete={() =>
                exitThen(
                  item.id,
                  async () => {
                    if (item.repeatRule) await createNextRecurringReminder(item);
                    else await completeReminder(item.id);
                    playUISound('complete');
                    showSnackbar('Lembrete concluído', 'success');
                    await load();
                  },
                  motionDuration.normal,
                )
              }
              onDelete={() =>
                showItemConfirmation({
                  title: 'Excluir este lembrete?',
                  message: 'O lembrete poderá ser restaurado pela lixeira.',
                  confirmLabel: 'Excluir',
                  onConfirm: () =>
                    exitThen(item.id, async () => {
                      await cancelReminder(item);
                      await trashReminder(item.id);
                      playUISound('swipe-soft');
                      showSnackbar('Lembrete excluído', 'info');
                      await load();
                    }),
                })
              }
            />
          ))
        ) : (
          <EmptyState
            icon="notifications-outline"
            title="Nenhum lembrete"
            description="Crie um lembrete para lembrar na hora certa."
            action="Criar lembrete"
            onAction={() => router.push('/reminders/new')}
          />
        )}
      </View>
      <FloatingButton onPress={() => router.push('/reminders/new')} bottom={24} />
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: {
      flex: 1,
      margin: spacing.lg,
      marginTop: 0,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 18,
    },
  });
