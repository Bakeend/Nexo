import { Ionicons } from '@expo/vector-icons';
import { addMonths, subMonths } from 'date-fns';
import { PropsWithChildren, ReactNode, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '@/design/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export type SheetOption = {
  label: string;
  description?: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
};

export function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.checkboxHitArea}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}
      </View>
    </Pressable>
  );
}

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: PropsWithChildren<{ visible: boolean; title?: string; onClose: () => void; footer?: ReactNode }>) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="Fechar" style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
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
  const choose = (option: SheetOption) => {
    option.onPress();
    onClose();
  };
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.optionList}>
        {options.map((option) => (
          <Pressable
            key={option.label}
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
          </Pressable>
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogRoot}>
        <Pressable accessibilityLabel="Fechar" style={styles.scrim} onPress={onClose} />
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{title}</Text>
          {message ? <Text style={styles.dialogMessage}>{message}</Text> : null}
          <View style={styles.dialogActions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.dialogButton}>
              <Text style={styles.dialogCancel}>{cancelLabel}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onConfirm} style={[styles.dialogButton, destructive && styles.dialogDanger]}>
              <Text style={[styles.dialogConfirm, destructive && { color: colors.danger }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
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
  const setTime = (part: 'hours' | 'minutes', raw: string) => {
    const next = new Date(draft);
    const value = Math.max(0, Math.min(part === 'hours' ? 23 : 59, Number(raw.replace(/\D/g, '').slice(0, 2)) || 0));
    if (part === 'hours') next.setHours(value);
    else next.setMinutes(value);
    setDraft(next);
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
        <TextInput
          accessibilityLabel="Hora"
          keyboardType="number-pad"
          value={String(draft.getHours()).padStart(2, '0')}
          onChangeText={(text) => setTime('hours', text)}
          style={styles.timeInput}
          maxLength={2}
        />
        <Text style={styles.timeSeparator}>:</Text>
        <TextInput
          accessibilityLabel="Minutos"
          keyboardType="number-pad"
          value={String(draft.getMinutes()).padStart(2, '0')}
          onChangeText={(text) => setTime('minutes', text)}
          style={styles.timeInput}
          maxLength={2}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  dialogRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
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
  sheetPrimaryText: { ...typography.bodyStrong, color: colors.white },
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
  calendarDayTextSelected: { color: colors.white, fontWeight: '700' },
  timeLabel: {
    ...typography.caption,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  timeInput: {
    width: 64,
    height: 48,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    textAlign: 'center',
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
  },
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
