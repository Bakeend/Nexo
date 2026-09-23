import { goBackOrHome } from '@/navigation/back';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, isSameDay, isSameMonth, isSameWeek, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Animated, Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaptureSheet, FloatingButton } from '@/components/ui';
import { AnimatedPressable } from '@/motion/AnimatedPressable';
import { motionDuration, motionEasing, motionSpring } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { completeReminder, listReminders, listTasks, toggleTask, trashReminder, trashTask, updateTask } from '@/database/repositories';
import type { Reminder, Task } from '@/types/domain';
import { LongPressItem } from '@/components/long-press-item';
import { useItemActions, useSnackbar } from '@/components/visual';
import { cancelReminder, createNextRecurringReminder, snoozeReminder } from '@/services/notification-service';

export default function Calendar() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [selected, setSelected] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [pageWidth, setPageWidth] = useState(Dimensions.get('window').width);
  const [preview, setPreview] = useState<{ date: Date; direction: number } | null>(null);
  const reducedMotion = useReducedMotion();
  const daySwipeX = useRef(new Animated.Value(0)).current;
  const dayIndicatorIndex = useRef(new Animated.Value(selected.getDay())).current;
  const previewDirection = useRef(0);
  const sliding = useRef(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;
  const previousSelected = useRef(selected);
  const { showItemConfirmation } = useItemActions();
  const { showSnackbar } = useSnackbar();

  const load = useCallback(async () => {
    const [nextTasks, nextReminders] = await Promise.all([listTasks('all'), listReminders()]);
    setTasks(nextTasks);
    setReminders(nextReminders);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const previous = previousSelected.current;
    previousSelected.current = selected;
    if (isSameMonth(previous, selected)) return;
    if (reducedMotion) {
      contentOpacity.setValue(1);
      contentTranslateY.setValue(0);
      return;
    }
    contentOpacity.setValue(0.5);
    contentTranslateY.setValue(4);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [contentOpacity, contentTranslateY, reducedMotion, selected]);

  const itemActions = (item: Task | Reminder) => {
    if ('dueAt' in item)
      return [
        {
          label: 'Editar',
          icon: 'create-outline' as const,
          onPress: () => router.push({ pathname: '/tasks/new', params: { id: item.id } }),
        },
        {
          label: item.completedAt ? 'Reabrir' : 'Concluir',
          icon: item.completedAt ? ('refresh-outline' as const) : ('checkmark-circle-outline' as const),
          onPress: async () => {
            await toggleTask(item.id, !item.completedAt);
            playUISound(item.completedAt ? 'undo-soft' : 'complete');
            showSnackbar(item.completedAt ? 'Tarefa reaberta' : 'Tarefa concluída', 'info');
            await load();
          },
        },
        {
          label: 'Adiar para amanhã',
          icon: 'time-outline' as const,
          onPress: async () => {
            const nextDate = new Date(item.dueAt || new Date());
            nextDate.setDate(nextDate.getDate() + 1);
            await updateTask(item.id, { dueAt: nextDate.toISOString() });
            playUISound('swipe-soft');
            showSnackbar('Tarefa adiada para amanhã', 'info');
            await load();
          },
        },
        {
          label: 'Excluir',
          icon: 'trash-outline' as const,
          destructive: true,
          onPress: () =>
            showItemConfirmation({
              title: 'Excluir esta tarefa?',
              confirmLabel: 'Excluir',
              onConfirm: async () => {
                await trashTask(item.id);
                playUISound('swipe-soft');
                showSnackbar('Tarefa excluída', 'info');
                await load();
              },
            }),
        },
      ];
    return [
      {
        label: 'Editar',
        icon: 'create-outline' as const,
        onPress: () => router.push({ pathname: '/reminders/new', params: { id: item.id } }),
      },
      {
        label: 'Adiar 10 minutos',
        icon: 'time-outline' as const,
        onPress: async () => {
          await snoozeReminder(item, new Date(Date.now() + 10 * 60 * 1000));
          playUISound('clock-tick');
          showSnackbar('Lembrete adiado por 10 minutos', 'info');
          await load();
        },
      },
      {
        label: 'Concluir',
        icon: 'checkmark-circle-outline' as const,
        onPress: async () => {
          if (item.repeatRule) await createNextRecurringReminder(item);
          else await completeReminder(item.id);
          playUISound('complete');
          showSnackbar('Lembrete concluído', 'info');
          await load();
        },
      },
      {
        label: 'Excluir',
        icon: 'trash-outline' as const,
        destructive: true,
        onPress: () =>
          showItemConfirmation({
            title: 'Excluir este lembrete?',
            confirmLabel: 'Excluir',
            onConfirm: async () => {
              await cancelReminder(item);
              await trashReminder(item.id);
              playUISound('swipe-soft');
              showSnackbar('Lembrete excluído', 'info');
              await load();
            },
          }),
      },
    ];
  };

  const showPreview = useCallback((date: Date, direction: number) => {
    if (previewDirection.current !== direction) {
      previewDirection.current = direction;
      setPreview({ date, direction });
    }
  }, []);

  const clearPreview = useCallback(() => {
    previewDirection.current = 0;
    setPreview(null);
  }, []);

  const slideTo = useCallback(
    (date: Date, direction: number) => {
      if (sliding.current) return;
      if (isSameDay(selected, date)) return;
      if (isSameMonth(selected, date)) {
        if (reducedMotion) dayIndicatorIndex.setValue(date.getDay());
        else {
          if (!isSameWeek(selected, date)) dayIndicatorIndex.setValue(direction > 0 ? -1 : 7);
          Animated.spring(dayIndicatorIndex, { toValue: date.getDay(), ...motionSpring.selection, useNativeDriver: Platform.OS !== 'web' }).start();
        }
        setSelected(date);
        return;
      }
      sliding.current = true;
      if (reducedMotion) {
        daySwipeX.setValue(0);
        clearPreview();
        dayIndicatorIndex.setValue(date.getDay());
        setSelected(date);
        sliding.current = false;
        return;
      }
      showPreview(date, direction);
      Animated.timing(daySwipeX, {
        toValue: -direction * pageWidth,
        duration: motionDuration.medium,
        easing: motionEasing.exit,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        daySwipeX.setValue(0);
        clearPreview();
        if (finished) {
          dayIndicatorIndex.setValue(date.getDay());
          setSelected(date);
        }
        sliding.current = false;
      });
    },
    [clearPreview, dayIndicatorIndex, daySwipeX, pageWidth, reducedMotion, selected, showPreview],
  );

  const dayPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          if (sliding.current || reducedMotion) return;
          const direction = gesture.dx < 0 ? 1 : -1;
          if (isSameMonth(selected, addDays(selected, direction))) {
            daySwipeX.setValue(0);
            clearPreview();
            return;
          }
          showPreview(addDays(selected, direction), direction);
          daySwipeX.setValue(Math.max(-pageWidth, Math.min(pageWidth, gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (sliding.current) return;
          const direction = gesture.dx < 0 ? 1 : -1;
          if (Math.abs(gesture.dx) < 36) {
            if (!reducedMotion)
              Animated.spring(daySwipeX, { toValue: 0, ...motionSpring.press, useNativeDriver: Platform.OS !== 'web' }).start(clearPreview);
            else {
              daySwipeX.setValue(0);
              clearPreview();
            }
            return;
          }
          slideTo(addDays(selected, direction), direction);
        },
        onPanResponderTerminate: () => {
          if (!reducedMotion) Animated.spring(daySwipeX, { toValue: 0, ...motionSpring.press, useNativeDriver: Platform.OS !== 'web' }).start(clearPreview);
          else {
            daySwipeX.setValue(0);
            clearPreview();
          }
        },
      }),
    [clearPreview, daySwipeX, pageWidth, reducedMotion, selected, showPreview, slideTo],
  );

  const itemsFor = (date: Date) =>
    [
      ...tasks.filter((task) => task.dueAt && isSameDay(new Date(task.dueAt), date)),
      ...reminders.filter((reminder) => isSameDay(new Date(reminder.scheduledAt), date)),
    ].sort(
      (a, b) =>
        new Date(('dueAt' in a ? a.dueAt : a.scheduledAt) || 0).getTime() -
        new Date(('dueAt' in b ? b.dueAt : b.scheduledAt) || 0).getTime(),
    );

  const moveDay = (amount: number) => {
    slideTo(addDays(selected, amount), amount > 0 ? 1 : -1);
  };

  const contentAnimatedStyle = { flex: 1, opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] };
  const renderDatePage = (date: Date, interactive: boolean) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const items = itemsFor(date);
    const dayWidth = (pageWidth - spacing.md * 2) / 7;
    const indicatorStyle = {
      left: spacing.md + (dayWidth - 34) / 2,
      transform: [{ translateX: interactive ? Animated.multiply(dayIndicatorIndex, dayWidth) : date.getDay() * dayWidth }],
    };
    return (
      <>
        <View style={styles.week}>
          <Animated.View style={[styles.dayIndicator, indicatorStyle]} />
          {weekDays.map((day, index) => {
            const has =
              tasks.some((task) => task.dueAt && isSameDay(new Date(task.dueAt), day)) ||
              reminders.some((reminder) => isSameDay(new Date(reminder.scheduledAt), day));
            return (
              <CalendarDayButton
                key={day.toISOString()}
                day={day}
                active={isSameDay(day, date)}
                hasItems={has}
                onPress={() => {
                  if (interactive && !sliding.current) slideTo(day, day > selected ? 1 : -1);
                }}
                weekLabel={['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][index]}
              />
            );
          })}
        </View>
        <Animated.ScrollView
          scrollEnabled={interactive}
          style={interactive ? contentAnimatedStyle : styles.dayContent}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.selectedDate}>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric' }).format(date)}</Text>
          {items.length ? (
            items.map((item) => {
              const itemDate = new Date(('dueAt' in item ? item.dueAt : item.scheduledAt) || '');
              const isTask = 'dueAt' in item;
              return (
                <LongPressItem
                  key={item.id}
                  title={item.title}
                  actions={interactive ? itemActions(item) : []}
                  onPress={() => {
                    if (interactive)
                      router.push({ pathname: isTask ? '/tasks/[id]' : '/reminders/[id]', params: { id: item.id } } as never);
                  }}
                  style={styles.timelineRow}
                  pressedStyle={styles.rowPressed}
                >
                  <Text style={styles.time}>{itemDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                  <View style={[styles.timelineBar, { backgroundColor: isTask ? colors.accent : colors.success }]} />
                  <Text style={styles.timelineTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </LongPressItem>
              );
            })
          ) : (
            <Text style={styles.muted}>Nenhum item nesta data.</Text>
          )}
        </Animated.ScrollView>
      </>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => goBackOrHome()}
            hitSlop={10}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-back" size={21} color={colors.ink} />
          </AnimatedPressable>
          <Text style={styles.month}>{format(selected, 'MMMM', { locale: ptBR })}</Text>
        </View>
        <View style={styles.monthControls}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Dia anterior"
            onPress={() => moveDay(-1)}
            hitSlop={10}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-back" size={19} color={colors.ink} />
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Próximo dia"
            onPress={() => moveDay(1)}
            hitSlop={10}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-forward" size={19} color={colors.ink} />
          </AnimatedPressable>
        </View>
      </View>

      <View style={styles.dayViewport} onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}>
        <Animated.View
          {...dayPanResponder.panHandlers}
          style={[styles.dayContent, { transform: [{ translateX: daySwipeX }] }]}
          accessibilityLabel="Navegação diária do calendário"
        >
          {renderDatePage(selected, true)}
        </Animated.View>
        {preview && !reducedMotion ? (
          <Animated.View
            style={[
              styles.previewPage,
              {
                pointerEvents: 'none',
                width: pageWidth,
                transform: [{ translateX: Animated.add(daySwipeX, preview.direction * pageWidth) }],
              },
            ]}
          >
            {renderDatePage(preview.date, false)}
          </Animated.View>
        ) : null}
      </View>

      <FloatingButton onPress={() => setCaptureOpen(true)} bottom={24} expanded={captureOpen} />
      <CaptureSheet visible={captureOpen} onClose={() => setCaptureOpen(false)} />
    </SafeAreaView>
  );
}

function CalendarDayButton({
  day,
  active,
  hasItems,
  weekLabel,
  onPress,
}: {
  day: Date;
  active: boolean;
  hasItems: boolean;
  weekLabel: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Selecionar ${format(day, 'd MMMM', { locale: ptBR })}`}
      onPress={onPress}
      style={styles.day}
      pressedScale={0.96}
    >
      <Text style={styles.weekLabel}>{weekLabel}</Text>
      <View style={styles.dayNumberWrap}>
        <Text style={[styles.dayText, { color: active ? colors.onAccent : colors.ink }]}>{day.getDate()}</Text>
      </View>
      <View style={styles.dotSlot}>{hasItems ? <View style={[styles.dot, active && styles.dotActive]} /> : null}</View>
    </AnimatedPressable>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    header: {
      minHeight: 58,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
    monthControls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    month: { ...typography.heading, color: colors.ink, textTransform: 'capitalize' },
    dayContent: { flex: 1 },
    dayViewport: { flex: 1, overflow: 'hidden' },
    previewPage: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: colors.surface },
    week: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    weekLabel: { ...typography.meta, color: colors.inkMuted, textAlign: 'center', marginBottom: 5 },
    day: { width: '14.285%', alignItems: 'center' },
    dayIndicator: {
      position: 'absolute',
      top: 20,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accent,
      pointerEvents: 'none',
    },
    dayNumberWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    dayText: { ...typography.caption, color: colors.ink, fontWeight: '700' },
    dotSlot: { height: 8, alignItems: 'center', justifyContent: 'center' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent },
    dotActive: { backgroundColor: colors.white },
    content: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
    selectedDate: {
      ...typography.bodyStrong,
      color: colors.ink,
      marginTop: spacing.md,
      marginBottom: spacing.md,
      textTransform: 'capitalize',
    },
    timelineRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingRight: spacing.sm,
    },
    rowPressed: { backgroundColor: colors.surfacePressed },
    time: { ...typography.caption, color: colors.inkSoft, width: 58 },
    timelineBar: { width: 2, alignSelf: 'stretch', marginVertical: 6, borderRadius: 2 },
    timelineTitle: { ...typography.body, color: colors.ink, flex: 1, paddingLeft: spacing.md },
    muted: { ...typography.body, color: colors.inkMuted, paddingVertical: spacing.xl },
  });
