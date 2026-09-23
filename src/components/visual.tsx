import { Ionicons } from '@expo/vector-icons';
import { addMonths, subMonths } from 'date-fns';
import { createContext, PropsWithChildren, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, shadow, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { AnimatedPressable } from '@/motion/AnimatedPressable';
import { AnimatedListItem } from '@/motion/AnimatedListItem';
import { motionDuration, motionSpring } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';

type IconName = keyof typeof Ionicons.glyphMap;

export type SheetOption = {
  label: string;
  description?: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
};

type SnackbarTone = 'success' | 'error' | 'info';
type SnackbarState = { id: number; message: string; tone: SnackbarTone } | null;
type SnackbarContextValue = { showSnackbar: (message: string, tone?: SnackbarTone) => void };
type ItemConfirmation = {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};
type ItemActionsContextValue = {
  showItemActions: (title: string, options: SheetOption[], onClose?: () => void) => void;
  showItemConfirmation: (confirmation: ItemConfirmation) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);
const ItemActionsContext = createContext<ItemActionsContextValue | null>(null);

export function SnackbarProvider({ children }: PropsWithChildren) {
  const styles = useThemeStyles(makeStyles);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [snackbarMounted, setSnackbarMounted] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [itemActions, setItemActions] = useState<{ title: string; options: SheetOption[]; onClose?: () => void } | null>(null);
  const [confirmation, setConfirmation] = useState<ItemConfirmation | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snackbarId = useRef(0);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const dismissSnackbar = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setSnackbarVisible(false);
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = setTimeout(
      () => {
        exitTimeoutRef.current = null;
        setSnackbarMounted(false);
        setSnackbar(null);
      },
      reducedMotion ? 100 : motionDuration.normal,
    );
  }, [reducedMotion]);
  const showSnackbar = useCallback(
    (message: string, tone: SnackbarTone = 'success') => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      setSnackbar({ id: ++snackbarId.current, message, tone });
      setSnackbarMounted(true);
      setSnackbarVisible(true);
      if (tone === 'error') playUISound('error-soft');
      else if (tone === 'success') playUISound('success-tick');
      timeoutRef.current = setTimeout(
        () => {
          timeoutRef.current = null;
          dismissSnackbar();
        },
        tone === 'error' ? 4800 : 2400,
      );
    },
    [dismissSnackbar],
  );
  const showItemActions = useCallback((title: string, options: SheetOption[], onClose?: () => void) => {
    setItemActions({ title, options, onClose });
  }, []);
  const closeItemActions = useCallback(() => {
    setItemActions(null);
    itemActions?.onClose?.();
  }, [itemActions]);
  const showItemConfirmation = useCallback((next: ItemConfirmation) => setConfirmation(next), []);
  const confirmItemAction = useCallback(() => {
    const current = confirmation;
    setConfirmation(null);
    current?.onConfirm();
  }, [confirmation]);
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    },
    [],
  );
  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      <ItemActionsContext.Provider value={{ showItemActions, showItemConfirmation }}>
        <View style={styles.providerRoot}>
          {children}
          {snackbarMounted && snackbar ? (
            <Snackbar
              key={snackbar.id}
              message={snackbar.message}
              tone={snackbar.tone}
              topInset={insets.top}
              visible={snackbarVisible}
              onDismiss={dismissSnackbar}
            />
          ) : null}
          <ActionSheet
            visible={Boolean(itemActions)}
            title={itemActions?.title || ''}
            options={itemActions?.options || []}
            onClose={closeItemActions}
          />
          <AppDialog
            visible={Boolean(confirmation)}
            title={confirmation?.title || ''}
            message={confirmation?.message}
            confirmLabel={confirmation?.confirmLabel || 'Confirmar'}
            destructive={confirmation?.destructive || confirmation?.confirmLabel === 'Excluir'}
            onClose={() => setConfirmation(null)}
            onConfirm={confirmItemAction}
          />
        </View>
      </ItemActionsContext.Provider>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (!context) throw new Error('useSnackbar deve ser usado dentro de SnackbarProvider');
  return context;
}

export function useItemActions() {
  const context = useContext(ItemActionsContext);
  if (!context) throw new Error('useItemActions deve ser usado dentro de SnackbarProvider');
  return context;
}

function Snackbar({
  message,
  tone,
  topInset,
  visible,
  onDismiss,
}: {
  message: string;
  tone: SnackbarTone;
  topInset: number;
  visible: boolean;
  onDismiss: () => void;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const icon = tone === 'error' ? 'alert-circle-outline' : tone === 'info' ? 'information-circle-outline' : 'checkmark-circle-outline';
  const color = tone === 'error' ? colors.danger : tone === 'info' ? colors.accent : colors.success;
  const backgroundColor = tone === 'error' ? colors.dangerSoft : tone === 'info' ? colors.accentSoft : colors.successSoft;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(visible ? 1 : 0);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: visible ? 0 : -8, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [opacity, reducedMotion, translateY, visible]);

  return (
    <Animated.View
      style={[styles.snackbarHost, { top: topInset + spacing.sm, opacity, pointerEvents: 'box-none', transform: [{ translateY }] }]}
    >
      <Animated.View accessibilityRole="alert" style={[styles.snackbar, { backgroundColor }]}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.snackbarText}>{message}</Text>
        {tone === 'error' ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Fechar aviso"
            onPress={onDismiss}
            hitSlop={8}
            style={styles.snackbarClose}
            pressedScale={0.92}
          >
            <Ionicons name="close" size={16} color={colors.inkMuted} />
          </AnimatedPressable>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

export function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label?: string }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const selection = useRef(new Animated.Value(checked ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) {
      selection.setValue(checked ? 1 : 0);
      return;
    }
    Animated.timing(selection, { toValue: checked ? 1 : 0, duration: motionDuration.normal, useNativeDriver: false }).start();
  }, [checked, reducedMotion, selection]);
  const backgroundColor = selection.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, colors.accent] });
  const borderColor = selection.interpolate({ inputRange: [0, 1], outputRange: [colors.inkMuted, colors.accent] });
  const checkScale = selection.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 0.75, 1] });

  return (
    <AnimatedPressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={(event) => {
        event.stopPropagation();
        playUISound(checked ? 'undo-soft' : 'complete');
        onPress();
      }}
      style={styles.checkboxHitArea}
      pressedScale={0.94}
    >
      <Animated.View style={[styles.checkbox, { backgroundColor, borderColor }]}>
        {checked ? (
          <Animated.View style={{ opacity: selection, transform: [{ scale: checkScale }] }}>
            <Ionicons name="checkmark" size={15} color={colors.onAccent} />
          </Animated.View>
        ) : null}
      </Animated.View>
    </AnimatedPressable>
  );
}

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: PropsWithChildren<{ visible: boolean; title?: string; onClose: () => void; footer?: ReactNode }>) {
  const styles = useThemeStyles(makeStyles);
  const [mounted, setMounted] = useState(visible);
  const mountedRef = useRef(visible);
  const reducedMotion = useReducedMotion();
  const transition = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const translateY = transition.interpolate({ inputRange: [0, 1], outputRange: [Dimensions.get('window').height, 0] });

  useEffect(() => {
    transition.stopAnimation();
    if (visible) {
      mountedRef.current = true;
      setMounted(true);
      transition.setValue(0);
      requestAnimationFrame(() => {
        if (reducedMotion)
          Animated.timing(transition, { toValue: 1, duration: motionDuration.fast, useNativeDriver: Platform.OS !== 'web' }).start();
        else Animated.spring(transition, { toValue: 1, ...motionSpring.sheet, useNativeDriver: Platform.OS !== 'web' }).start();
      });
      return;
    }
    if (mountedRef.current) {
      Animated.timing(transition, {
        toValue: 0,
        duration: reducedMotion ? 100 : motionDuration.sheetExit,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (!finished) return;
        mountedRef.current = false;
        setMounted(false);
      });
    }
  }, [reducedMotion, transition, visible]);

  if (!mounted) return null;
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.scrim, { opacity: transition, pointerEvents: 'none' }]} />
        <Pressable accessibilityLabel="Fechar" style={styles.dismissScrim} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function ActionSheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const choose = (option: SheetOption) => {
    option.onPress();
    onClose();
  };
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.optionList}>
        {options.map((option, index) => (
          <AnimatedListItem key={option.label} delay={index * 36}>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={() => choose(option)}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              {option.icon ? <Ionicons name={option.icon} size={21} color={option.destructive ? colors.danger : colors.accent} /> : null}
              <View style={styles.optionCopy}>
                <Text style={[styles.optionLabel, option.destructive && { color: colors.danger }]}>{option.label}</Text>
                {option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.inkMuted} />
            </AnimatedPressable>
          </AnimatedListItem>
        ))}
      </View>
    </BottomSheet>
  );
}

export function AppDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [mounted, setMounted] = useState(visible);
  const mountedRef = useRef(visible);
  const reducedMotion = useReducedMotion();
  const transition = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scale = transition.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  const shake = useRef(new Animated.Value(0)).current;
  const confirmingRef = useRef(false);

  useEffect(() => {
    transition.stopAnimation();
    if (visible) {
      confirmingRef.current = false;
      mountedRef.current = true;
      setMounted(true);
      transition.setValue(0);
      requestAnimationFrame(() => {
        Animated.timing(transition, {
          toValue: 1,
          duration: reducedMotion ? 100 : motionDuration.normal,
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => {
          if (reducedMotion || !/erro|inválido|não foi possível/i.test(title)) return;
          Animated.sequence([
            Animated.timing(shake, { toValue: 3, duration: 35, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(shake, { toValue: -3, duration: 45, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: Platform.OS !== 'web' }),
          ]).start();
        });
      });
      return;
    }
    if (mountedRef.current) {
      Animated.timing(transition, {
        toValue: 0,
        duration: reducedMotion ? 90 : motionDuration.fast,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (!finished) return;
        mountedRef.current = false;
        setMounted(false);
      });
    }
  }, [reducedMotion, shake, title, transition, visible]);

  const confirm = () => {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    if (!destructive || reducedMotion) {
      onConfirm();
      return;
    }
    Animated.timing(transition, { toValue: 0, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }).start(
      ({ finished }) => {
        if (finished) onConfirm();
        else confirmingRef.current = false;
      },
    );
  };

  if (!mounted) return null;
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.dialogRoot}>
        <Animated.View style={[styles.scrim, { opacity: transition, pointerEvents: 'none' }]} />
        <Pressable accessibilityLabel="Fechar" style={styles.dismissScrim} onPress={onClose} />
        <Animated.View style={[styles.dialog, { opacity: transition, transform: [{ scale }, { translateX: shake }] }]}>
          <Text style={styles.dialogTitle}>{title}</Text>
          {message ? <Text style={styles.dialogMessage}>{message}</Text> : null}
          <View style={styles.dialogActions}>
            <AnimatedPressable accessibilityRole="button" onPress={onClose} style={styles.dialogButton} pressedScale={0.98}>
              <Text style={styles.dialogCancel}>{cancelLabel}</Text>
            </AnimatedPressable>
            <AnimatedPressable
              accessibilityRole="button"
              onPress={confirm}
              style={[styles.dialogButton, destructive && styles.dialogDanger]}
              pressedScale={0.97}
            >
              <Text style={[styles.dialogConfirm, destructive && { color: colors.danger }]}>{confirmLabel}</Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function DateTimeSheet({
  visible,
  title = 'Escolher data e horário',
  value,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title?: string;
  value: Date;
  onConfirm: (value: Date) => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const [month, setMonth] = useState(value);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) {
      setMonth(value);
      setDraft(value);
    }
  }, [value, visible]);
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return { offset: first.getDay(), count };
  }, [month]);
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(month);
  const setDay = (day: number) => {
    const next = new Date(draft);
    next.setFullYear(month.getFullYear(), month.getMonth(), day);
    setDraft(next);
  };
  const setTime = (part: 'hours' | 'minutes', value: number) => {
    setDraft((current) => {
      if ((part === 'hours' ? current.getHours() : current.getMinutes()) === value) return current;
      const next = new Date(current);
      if (part === 'hours') next.setHours(value);
      else next.setMinutes(value);
      return next;
    });
  };
  return (
    <BottomSheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            onConfirm(draft);
            onClose();
          }}
          style={styles.sheetPrimaryButton}
        >
          <Text style={styles.sheetPrimaryText}>Usar esta data</Text>
        </Pressable>
      }
    >
      <View style={styles.calendarHeader}>
        <Pressable accessibilityLabel="Mês anterior" onPress={() => setMonth(subMonths(month, 1))} style={styles.monthButton}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <Pressable accessibilityLabel="Próximo mês" onPress={() => setMonth(addMonths(month, 1))} style={styles.monthButton}>
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekLabel}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {Array.from({ length: days.offset }).map((_, index) => (
          <View key={`empty-${index}`} style={styles.calendarDay} />
        ))}
        {Array.from({ length: days.count }, (_, index) => index + 1).map((day) => {
          const selected = draft.getFullYear() === month.getFullYear() && draft.getMonth() === month.getMonth() && draft.getDate() === day;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              onPress={() => setDay(day)}
              style={[styles.calendarDay, selected && styles.calendarDaySelected]}
            >
              <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>{day}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.timeLabel}>Horário</Text>
      <View style={styles.timeRow}>
        <TimeWheel
          key={`hours-${visible}-${value.getTime()}`}
          label="Hora"
          value={draft.getHours()}
          max={23}
          onChange={(hour) => setTime('hours', hour)}
        />
        <Text style={styles.timeSeparator}>:</Text>
        <TimeWheel
          key={`minutes-${visible}-${value.getTime()}`}
          label="Minutos"
          value={draft.getMinutes()}
          max={59}
          onChange={(minute) => setTime('minutes', minute)}
        />
      </View>
    </BottomSheet>
  );
}

const timeWheelItemHeight = 48;

function TimeWheel({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  const styles = useThemeStyles(makeStyles);
  const scrollRef = useRef<ScrollView>(null);
  const initialValue = useRef(value).current;
  const ready = useRef(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: initialValue * timeWheelItemHeight, animated: false });
      ready.current = true;
    });
    return () => {
      cancelAnimationFrame(frame);
      if (snapTimer.current) clearTimeout(snapTimer.current);
    };
  }, [initialValue]);

  const select = (next: number) => {
    onChange(next);
    scrollRef.current?.scrollTo({ y: next * timeWheelItemHeight, animated: true });
  };

  return (
    <View style={styles.timeWheelColumn}>
      <View style={styles.timeWheelFrame}>
        <View style={styles.timeWheelSelection} />
        <ScrollView
          ref={scrollRef}
          accessibilityLabel={`Selecionar ${label.toLowerCase()}`}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          snapToInterval={timeWheelItemHeight}
          decelerationRate="fast"
          scrollEventThrottle={16}
          contentContainerStyle={styles.timeWheelContent}
          onScroll={(event) => {
            if (!ready.current) return;
            const offset = event.nativeEvent.contentOffset.y;
            const next = Math.max(0, Math.min(max, Math.round(offset / timeWheelItemHeight)));
            if (next !== value) onChange(next);
            if (Platform.OS === 'web') {
              if (snapTimer.current) clearTimeout(snapTimer.current);
              if (Math.abs(offset - next * timeWheelItemHeight) > 1)
                snapTimer.current = setTimeout(() => scrollRef.current?.scrollTo({ y: next * timeWheelItemHeight, animated: false }), 120);
            }
          }}
        >
          {Array.from({ length: max + 1 }, (_, item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`${String(item).padStart(2, '0')} ${label.toLowerCase()}`}
              accessibilityState={{ selected: item === value }}
              onPress={() => select(item)}
              style={styles.timeWheelItem}
            >
              <Text style={[styles.timeWheelNumber, item === value && styles.timeWheelNumberSelected]}>
                {String(item).padStart(2, '0')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <Text style={styles.timeWheelCaption}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    providerRoot: { flex: 1 },
    snackbarHost: {
      position: 'absolute',
      right: 0,
      left: 0,
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      zIndex: 100,
    },
    snackbar: {
      width: '100%',
      maxWidth: 380,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 0,
    },
    snackbarText: { ...typography.body, color: colors.ink, flexShrink: 1 },
    snackbarClose: { width: 28, height: 28, marginLeft: 'auto', alignItems: 'center', justifyContent: 'center' },
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    dialogRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
    dismissScrim: { ...StyleSheet.absoluteFill },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      maxHeight: '88%',
      paddingTop: spacing.sm,
      ...shadow,
    },
    handle: {
      alignSelf: 'center',
      width: 42,
      height: 4,
      borderRadius: 4,
      backgroundColor: colors.inkMuted,
      opacity: 0.45,
      marginBottom: spacing.md,
    },
    sheetTitle: { ...typography.heading, color: colors.ink, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    sheetContent: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
    sheetFooter: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    sheetPrimaryButton: { minHeight: 48, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
    sheetPrimaryText: { ...typography.bodyStrong, color: colors.onInk },
    optionList: { gap: 2 },
    option: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    optionPressed: { backgroundColor: colors.surfacePressed },
    optionCopy: { flex: 1 },
    optionLabel: { ...typography.bodyStrong, color: colors.ink },
    optionDescription: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
    dialog: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, ...shadow },
    dialogTitle: { ...typography.heading, color: colors.ink },
    dialogMessage: { ...typography.body, color: colors.inkMuted, marginTop: spacing.sm },
    dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xl },
    dialogButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md },
    dialogDanger: { backgroundColor: colors.dangerSoft },
    dialogCancel: { ...typography.bodyStrong, color: colors.inkMuted },
    dialogConfirm: { ...typography.bodyStrong, color: colors.accent },
    calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    monthButton: {
      width: 42,
      height: 42,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    monthTitle: { ...typography.bodyStrong, color: colors.ink, textTransform: 'capitalize' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.xs },
    weekLabel: { ...typography.meta, color: colors.inkMuted, width: '14.285%', textAlign: 'center' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarDay: { width: '14.285%', height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
    calendarDaySelected: { backgroundColor: colors.accent },
    calendarDayText: { ...typography.body, color: colors.ink },
    calendarDayTextSelected: { color: colors.onAccent, fontWeight: '700' },
    timeLabel: {
      ...typography.caption,
      color: colors.inkMuted,
      textTransform: 'uppercase',
      fontWeight: '700',
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    timeWheelColumn: { alignItems: 'center', gap: spacing.xs },
    timeWheelFrame: {
      width: 64,
      height: timeWheelItemHeight * 3,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    timeWheelSelection: {
      position: 'absolute',
      top: timeWheelItemHeight,
      left: 0,
      right: 0,
      height: timeWheelItemHeight,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      pointerEvents: 'none',
    },
    timeWheelContent: { paddingVertical: timeWheelItemHeight },
    timeWheelItem: { height: timeWheelItemHeight, alignItems: 'center', justifyContent: 'center' },
    timeWheelNumber: {
      color: colors.ink,
      fontSize: 20,
      fontWeight: '700',
      opacity: 0.42,
    },
    timeWheelNumberSelected: { opacity: 1 },
    timeWheelCaption: { ...typography.meta, color: colors.inkMuted },
    timeSeparator: { ...typography.title, color: colors.inkMuted },
    checkboxHitArea: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.inkMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  });
