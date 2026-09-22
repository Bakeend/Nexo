import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React, { PropsWithChildren, ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing, typography } from '@/design/theme';
import { createInboxCapture } from '@/database/repositories';
import { parseCapture } from '@/utils/capture-parser';

type IconName = keyof typeof Ionicons.glyphMap;
const iconAliases: Record<string, IconName> = { 'file-outline': 'document-outline' };
export function AppIcon({
  name,
  color = colors.accent,
  size = 20,
  background = colors.accentSoft,
}: {
  name: IconName | string;
  color?: string;
  size?: number;
  background?: string;
}) {
  return (
    <View style={[styles.iconWrap, { backgroundColor: background }]}>
      <Ionicons name={(iconAliases[name] || name) as IconName} size={size} color={color} />
    </View>
  );
}
export function Screen({ children, scroll = true, style }: PropsWithChildren<{ scroll?: boolean; style?: object }>) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, style]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}
export function Header({
  title,
  subtitle,
  onBack,
  action,
  actionLabel,
  transparent = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: () => void;
  actionLabel?: string;
  transparent?: boolean;
}) {
  return (
    <View style={[styles.header, transparent && { backgroundColor: 'transparent' }]}>
      {onBack ? <IconButton icon="chevron-back" onPress={onBack} label="Voltar" /> : <View style={styles.headerSpacer} />}
      <View style={styles.headerTitle}>
        <Text style={styles.headerText}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        actionLabel ? (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={action} hitSlop={10}>
            <Text style={styles.headerAction}>{actionLabel}</Text>
          </Pressable>
        ) : (
          <IconButton icon="ellipsis-horizontal" onPress={action} label="Mais opções" />
        )
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}
export function IconButton({
  icon,
  onPress,
  label,
  color = colors.ink,
  size = 22,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}
export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && !disabled && styles.primaryPressed]}
    >
      {icon ? <Ionicons name={icon} color={colors.white} size={18} /> : null}
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
}
export function SecondaryButton({ title, onPress, icon }: { title: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}>
      {icon ? <Ionicons name={icon} color={colors.accent} size={17} /> : null}
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}
export function Input({
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoFocus = false,
  style,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  style?: object;
  onSubmitEditing?: () => void;
}) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.inkMuted}
      multiline={multiline}
      autoFocus={autoFocus}
      onSubmitEditing={onSubmitEditing}
      style={[styles.input, multiline && styles.multiline, style]}
    />
  );
}
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  color = colors.accent,
  muted = false,
}: {
  icon?: IconName | string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  color?: string;
  muted?: boolean;
}) {
  const body = (
    <View style={[styles.row, muted && { opacity: 0.5 }]}>
      {icon ? <AppIcon name={icon} color={color} /> : <View style={styles.rowBullet} />}
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && styles.rowPressed]}>
      {body}
    </Pressable>
  ) : (
    body
  );
}
export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionText}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const content = <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>;
  return onPress ? (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      {content}
    </Pressable>
  ) : (
    <View style={[styles.chip, selected && styles.chipSelected]}>{content}</View>
  );
}
export function Segmented({ values, selected, onChange }: { values: string[]; selected: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.segmented}>
      {values.map((value) => (
        <Pressable key={value} onPress={() => onChange(value)} style={[styles.segment, selected === value && styles.segmentSelected]}>
          <Text style={[styles.segmentText, selected === value && styles.segmentTextSelected]}>{value}</Text>
        </Pressable>
      ))}
    </View>
  );
}
export function EmptyState({
  icon = 'sparkles-outline',
  title,
  description,
  action,
  onAction,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <AppIcon name={icon} size={24} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action && onAction ? <SecondaryButton title={action} onPress={onAction} /> : null}
    </View>
  );
}
export function FloatingButton({ onPress, label = 'Criar' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
    >
      <Ionicons name="add" size={27} color={colors.accent} />
    </Pressable>
  );
}
export function BottomNav() {
  const pathname = usePathname();
  const tabs = [
    { path: '/home', icon: 'home-outline' as IconName, active: 'home', label: 'Início' },
    { path: '/today', icon: 'today-outline' as IconName, active: 'Hoje', label: 'Hoje' },
    { path: '/inbox', icon: 'file-tray-outline' as IconName, active: 'Inbox', label: 'Inbox' },
    { path: '/spaces', icon: 'grid-outline' as IconName, active: 'Espaços', label: 'Espaços' },
  ];
  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const active = pathname === tab.path || pathname.startsWith(tab.path);
        return (
          <Pressable
            key={tab.path}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            onPress={() => router.push(tab.path as never)}
            style={styles.tab}
          >
            <Ionicons
              name={active ? (tab.icon.replace('-outline', '') as IconName) : tab.icon}
              size={21}
              color={active ? colors.ink : colors.inkMuted}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CaptureSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated?: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const create = async (kind: 'note' | 'task' | 'reminder' | 'file' | 'image' | 'audio' | 'quick_capture') => {
    if (busy) return;
    setBusy(true);
    try {
      if (kind === 'quick_capture') {
        await createInboxCapture(text || 'Captura rápida');
        onCreated?.();
        onClose();
        return;
      }
      if (kind === 'note') router.push({ pathname: '/notes/new', params: { seed: text } });
      else if (kind === 'task') router.push({ pathname: '/tasks/new', params: { seed: text } });
      else if (kind === 'reminder') router.push({ pathname: '/reminders/new', params: { seed: text } });
      else if (kind === 'file') router.push('/files' as never);
      else if (kind === 'image') router.push('/media/image' as never);
      else router.push('/media/audio' as never);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  const suggestion = parseCapture(text);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>O que você quer guardar?</Text>
          <Input value={text} onChangeText={setText} placeholder="Apenas escreva..." autoFocus />
          <View style={styles.sheetOptions}>
            {[
              { kind: 'note' as const, icon: 'document-text-outline' as IconName, title: 'Nota', detail: 'Escrever algo' },
              { kind: 'task' as const, icon: 'checkmark-circle-outline' as IconName, title: 'Tarefa', detail: 'Transformar em tarefa' },
              { kind: 'reminder' as const, icon: 'notifications-outline' as IconName, title: 'Lembrete', detail: 'Com data e horário' },
              { kind: 'file' as const, icon: 'document-attach-outline' as IconName, title: 'Arquivo', detail: 'Adicionar arquivo' },
              { kind: 'image' as const, icon: 'image-outline' as IconName, title: 'Foto', detail: 'Tirar ou escolher da galeria' },
              { kind: 'audio' as const, icon: 'mic-outline' as IconName, title: 'Áudio', detail: 'Gravar áudio' },
            ].map((item) => (
              <ListRow key={item.kind} icon={item.icon} title={item.title} subtitle={item.detail} onPress={() => create(item.kind)} />
            ))}
          </View>
          {suggestion ? (
            <Pressable onPress={() => create(suggestion.type)} style={styles.suggestion}>
              <Text style={styles.suggestionTitle}>Criar como {suggestion.type === 'task' ? 'tarefa' : 'lembrete'}?</Text>
              <Text style={styles.suggestionText}>{suggestion.title}</Text>
              <Text style={styles.suggestionMeta}>Detectado automaticamente · toque para continuar</Text>
            </Pressable>
          ) : text ? (
            <SecondaryButton title="Salvar na Caixa de entrada" onPress={() => create('quick_capture')} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: 96 },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.canvas,
  },
  headerSpacer: { width: 42 },
  headerTitle: { flex: 1, alignItems: 'center' },
  headerText: { ...typography.heading, color: colors.ink },
  headerSubtitle: { ...typography.meta, color: colors.inkMuted, marginTop: 2 },
  headerAction: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.surfacePressed },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  primaryPressed: { opacity: 0.85 },
  primaryText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.45 },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: spacing.md,
  },
  secondaryText: { color: colors.accent, fontWeight: '700' },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 13,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    color: colors.ink,
    ...typography.body,
  },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  row: {
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowPressed: { backgroundColor: colors.surfacePressed },
  rowCopy: { flex: 1 },
  rowTitle: { ...typography.bodyStrong, color: colors.ink },
  rowSubtitle: { ...typography.caption, color: colors.inkMuted, marginTop: 2 },
  rowBullet: { width: 10 },
  sectionTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionText: { ...typography.caption, color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '700' },
  sectionAction: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  chip: { paddingHorizontal: 13, minHeight: 34, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  chipSelected: { backgroundColor: colors.ink },
  chipText: { ...typography.caption, color: colors.inkSoft },
  chipTextSelected: { color: colors.white, fontWeight: '700' },
  segmented: { backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 3, flexDirection: 'row' },
  segment: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segmentSelected: { backgroundColor: colors.surface, ...shadow },
  segmentText: { ...typography.caption, color: colors.inkMuted },
  segmentTextSelected: { color: colors.accent, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyTitle: { ...typography.heading, color: colors.ink, textAlign: 'center' },
  emptyDescription: { ...typography.body, color: colors.inkMuted, textAlign: 'center', maxWidth: 270 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 76,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...shadow,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 9,
  },
  tab: { alignItems: 'center', gap: 3, minWidth: 58 },
  tabLabel: { ...typography.meta, color: colors.inkMuted },
  tabLabelActive: { color: colors.ink, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
    ...shadow,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.inkMuted,
    opacity: 0.45,
    marginBottom: spacing.lg,
  },
  sheetTitle: { ...typography.heading, color: colors.ink, marginBottom: spacing.md },
  sheetOptions: { marginTop: spacing.sm },
  suggestion: { backgroundColor: colors.accentSoft, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  suggestionTitle: { ...typography.bodyStrong, color: colors.accentDark },
  suggestionText: { ...typography.body, color: colors.ink, marginTop: 4 },
  suggestionMeta: { ...typography.meta, color: colors.accentDark, marginTop: 4 },
});
