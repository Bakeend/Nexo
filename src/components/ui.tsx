import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React, { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { useSnackbar } from '@/components/visual';
import { LongPressItem } from '@/components/long-press-item';
import type { SheetOption } from '@/components/visual';
import { AnimatedPressable } from '@/motion/AnimatedPressable';
import { AnimatedListItem } from '@/motion/AnimatedListItem';
import { motionDuration, motionScale, motionSpring } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playTypingSound, playUISound } from '@/services/ui-sound-service';
import { createInboxCapture } from '@/database/repositories';
import { parseCapture } from '@/utils/capture-parser';

type IconName = keyof typeof Ionicons.glyphMap;
const iconAliases: Record<string, IconName> = { 'file-outline': 'document-outline' };

export function contextEmoji(title: string) {
  const value = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (value.includes('configur')) return '⚙️';
  if (value.includes('calend')) return '📅';
  if (value.includes('tarefa')) return '✅';
  if (value.includes('lembrete')) return '🔔';
  if (value.includes('nota')) return '📝';
  if (value.includes('arquivo') || value.includes('anexo')) return '📎';
  if (value.includes('foto') || value.includes('imagem')) return '📷';
  if (value.includes('audio') || value.includes('gravar')) return '🎙️';
  if (value.includes('espaco')) return '🗂️';
  if (value.includes('entrada') || value.includes('inbox')) return '📥';
  if (value.includes('busca') || value.includes('pesquis')) return '🔎';
  if (value.includes('lixeira')) return '🗑️';
  if (value.includes('tag')) return '🏷️';
  if (value.includes('backup')) return '🛟';
  if (value.includes('notific')) return '🔔';
  if (value.includes('proximo')) return '✨';
  if (value.includes('agenda')) return '📅';
  if (value.includes('acesso rapido')) return '⚡️';
  if (value.includes('navegar')) return '🧭';
  if (value === 'hoje') return '☀️';
  return null;
}
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
  const styles = useThemeStyles(makeStyles);
  return (
    <View style={[styles.iconWrap, { backgroundColor: background }]}>
      <Ionicons name={(iconAliases[name] || name) as IconName} size={size} color={color} />
    </View>
  );
}
export function Screen({ children, scroll = true, style }: PropsWithChildren<{ scroll?: boolean; style?: object }>) {
  const styles = useThemeStyles(makeStyles);
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
  actionIcon,
  transparent = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: () => void;
  actionLabel?: string;
  actionIcon?: IconName;
  transparent?: boolean;
}) {
  const styles = useThemeStyles(makeStyles);
  return (
    <View style={[styles.header, transparent && { backgroundColor: 'transparent' }]}>
      {onBack ? <IconButton icon="chevron-back" onPress={onBack} label="Voltar" /> : <View style={styles.headerSpacer} />}
      <View style={styles.headerTitle}>
        <Text style={styles.headerText}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        actionIcon ? (
          <IconButton icon={actionIcon} onPress={action} label={actionLabel || 'Ação'} />
        ) : actionLabel ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={action}
            hitSlop={10}
            pressedScale={motionScale.secondary}
          >
            <Text style={styles.headerAction}>{actionLabel}</Text>
          </AnimatedPressable>
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
  color,
  size = 22,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  size?: number;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      pressedScale={motionScale.icon}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.ink} />
    </AnimatedPressable>
  );
}
export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  icon,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IconName;
  loading?: boolean;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.primaryPressed,
      ]}
      pressedScale={motionScale.primary}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.onInk} />
      ) : icon ? (
        <Ionicons name={icon} color={colors.onInk} size={18} />
      ) : null}
      <Text style={styles.primaryText}>{title}</Text>
    </AnimatedPressable>
  );
}
export function SecondaryButton({
  title,
  onPress,
  icon,
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.secondaryButton, (disabled || loading) && styles.disabled]}
      pressedScale={motionScale.secondary}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : icon ? (
        <Ionicons name={icon} color={colors.accent} size={17} />
      ) : null}
      <Text style={styles.secondaryText}>{title}</Text>
    </AnimatedPressable>
  );
}
export function Input({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  multiline = false,
  autoFocus = false,
  style,
  onSubmitEditing,
  onFocus,
  onBlur,
  onSelectionChange,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  style?: object;
  onSubmitEditing?: () => void;
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
  onSelectionChange?: TextInputProps['onSelectionChange'];
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel || placeholder}
      value={value}
      onChangeText={(next) => {
        playTypingSound(value, next);
        onChangeText(next);
      }}
      placeholder={placeholder}
      placeholderTextColor={colors.inkMuted}
      multiline={multiline}
      autoFocus={autoFocus}
      onSubmitEditing={onSubmitEditing}
      onFocus={onFocus}
      onBlur={onBlur}
      onSelectionChange={onSelectionChange}
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
  longPressTitle,
  longPressActions,
}: {
  icon?: IconName | string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  color?: string;
  muted?: boolean;
  longPressTitle?: string;
  longPressActions?: SheetOption[];
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
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
  if (longPressTitle && longPressActions)
    return (
      <LongPressItem
        title={longPressTitle}
        actions={longPressActions}
        onPress={onPress}
        accessibilityLabel={title}
        pressedStyle={styles.rowPressed}
      >
        {body}
      </LongPressItem>
    );
  return onPress ? (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.rowPressed]}
      pressedScale={motionScale.listItem}
    >
      {body}
    </AnimatedPressable>
  ) : (
    body
  );
}
export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const styles = useThemeStyles(makeStyles);
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionText}>{title}</Text>
      {action && onAction ? (
        <AnimatedPressable onPress={onAction} pressedScale={motionScale.secondary}>
          <Text style={styles.sectionAction}>{action}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}
export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const selection = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) {
      selection.setValue(selected ? 1 : 0);
      return;
    }
    Animated.spring(selection, { toValue: selected ? 1 : 0, ...motionSpring.selection, useNativeDriver: false }).start();
  }, [reducedMotion, selected, selection]);
  const backgroundColor = selection.interpolate({ inputRange: [0, 1], outputRange: [colors.surfaceMuted, colors.ink] });
  const textColor = selection.interpolate({ inputRange: [0, 1], outputRange: [colors.inkSoft, colors.onInk] });
  const content = <Animated.Text style={[styles.chipText, { color: textColor }]}>{label}</Animated.Text>;
  return onPress ? (
    <AnimatedPressable
      onPress={() => {
        playUISound('selection-click');
        onPress();
      }}
      pressedScale={motionScale.listItem}
      style={[styles.chip, { backgroundColor }] as never}
    >
      {content}
    </AnimatedPressable>
  ) : (
    <Animated.View style={[styles.chip, { backgroundColor }] as never}>{content}</Animated.View>
  );
}
export function Segmented({ values, selected, onChange }: { values: string[]; selected: string; onChange: (value: string) => void }) {
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const selectedIndex = Math.max(0, values.indexOf(selected));
  const [width, setWidth] = useState(0);
  const selection = useRef(new Animated.Value(selectedIndex)).current;
  useEffect(() => {
    if (reducedMotion) {
      selection.setValue(selectedIndex);
      return;
    }
    Animated.spring(selection, { toValue: selectedIndex, ...motionSpring.selection, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [reducedMotion, selectedIndex, selection]);
  const segmentWidth = values.length ? Math.max(0, (width - 6) / values.length) : 0;
  const translateX = selection.interpolate({
    inputRange: values.map((_, index) => index),
    outputRange: values.map((_, index) => index * segmentWidth),
  });
  return (
    <View style={styles.segmented} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Animated.View style={[styles.segmentIndicator, { width: segmentWidth, pointerEvents: 'none', transform: [{ translateX }] }]} />
      {values.map((value) => (
        <AnimatedPressable
          key={value}
          onPress={() => {
            if (value !== selected) playUISound('selection-click');
            onChange(value);
          }}
          pressedScale={motionScale.listItem}
          style={[styles.segment, selected === value && styles.segmentSelected]}
        >
          <Text style={[styles.segmentText, selected === value && styles.segmentTextSelected]}>{value}</Text>
        </AnimatedPressable>
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
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, { toValue: 1, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [progress, reducedMotion]);
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <Animated.View style={[styles.empty, { opacity: progress, transform: [{ scale }] }]}>
      <AppIcon name={icon} size={24} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action && onAction ? <SecondaryButton title={action} onPress={onAction} /> : null}
    </Animated.View>
  );
}
export function FloatingButton({
  onPress,
  label = 'Criar',
  bottom = 76,
  expanded = false,
  soundOnPress = true,
}: {
  onPress: () => void;
  label?: string;
  bottom?: number;
  expanded?: boolean;
  soundOnPress?: boolean;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) {
      rotation.setValue(expanded ? 1 : 0);
      return;
    }
    Animated.spring(rotation, { toValue: expanded ? 1 : 0, ...motionSpring.selection, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [expanded, reducedMotion, rotation]);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (soundOnPress) playUISound('pop');
        onPress();
      }}
      style={[styles.fab, { bottom }]}
      pressedScale={motionScale.fab}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="add" size={27} color={colors.accent} />
      </Animated.View>
    </AnimatedPressable>
  );
}
export function BottomNav({ onCreate, createExpanded = false }: { onCreate: () => void; createExpanded?: boolean }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const createRotation = useRef(new Animated.Value(createExpanded ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) createRotation.setValue(createExpanded ? 1 : 0);
    else
      Animated.spring(createRotation, {
        toValue: createExpanded ? 1 : 0,
        ...motionSpring.selection,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
  }, [createExpanded, createRotation, reducedMotion]);
  const createRotate = createRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const tabs = [
    { path: '/home', icon: 'home-outline' as IconName, label: 'Início' },
    { path: '/today', icon: 'today-outline' as IconName, label: 'Hoje' },
    { path: '/inbox', icon: 'file-tray-outline' as IconName, label: 'Entrada' },
    { path: '/spaces', icon: 'grid-outline' as IconName, label: 'Espaços' },
  ];
  const renderTab = (tab: (typeof tabs)[number]) => (
    <BottomNavItem key={tab.path} tab={tab} active={pathname === tab.path || pathname.startsWith(`${tab.path}/`)} />
  );
  return (
    <View style={[styles.bottomNav, { height: 78 + insets.bottom, paddingBottom: insets.bottom, pointerEvents: 'box-none' }]}>
      <View style={[styles.bottomNavSurface, { height: 78 + insets.bottom, pointerEvents: 'none' }]} />
      <View style={styles.bottomNavItems}>
        {tabs.slice(0, 2).map(renderTab)}
        <View style={styles.createSlot}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={createExpanded ? 'Fechar captura rápida' : 'Criar captura rápida'}
            onPress={() => {
              playUISound('pop');
              onCreate();
            }}
            style={styles.createButton}
            pressedScale={motionScale.fab}
          >
            <Animated.View style={{ transform: [{ rotate: createRotate }] }}>
              <Ionicons name="add" size={30} color={colors.onAccent} />
            </Animated.View>
          </AnimatedPressable>
          <Text style={styles.createLabel}>Criar</Text>
        </View>
        {tabs.slice(2).map(renderTab)}
      </View>
    </View>
  );
}

function BottomNavItem({ tab, active }: { tab: { path: string; icon: IconName; label: string }; active: boolean }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const selection = useRef(new Animated.Value(active ? 1 : 0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reducedMotion) {
      selection.setValue(active ? 1 : 0);
      iconScale.setValue(1);
      return;
    }
    Animated.spring(selection, { toValue: active ? 1 : 0, ...motionSpring.selection, useNativeDriver: false }).start();
    if (active) {
      iconScale.setValue(1);
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.11, duration: 90, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(iconScale, { toValue: 1, ...motionSpring.selection, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
  }, [active, iconScale, reducedMotion, selection]);
  const labelOpacity = selection.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1] });
  const labelColor = selection.interpolate({ inputRange: [0, 1], outputRange: [colors.inkMuted, colors.ink] });

  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (!active) router.replace(tab.path as never);
      }}
      style={styles.tab}
      pressedScale={motionScale.listItem}
    >
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Ionicons
          name={active ? (tab.icon.replace('-outline', '') as IconName) : tab.icon}
          size={21}
          color={active ? colors.ink : colors.inkMuted}
        />
      </Animated.View>
      <Animated.Text style={[styles.tabLabel, { opacity: labelOpacity, color: labelColor }]}>{tab.label}</Animated.Text>
    </AnimatedPressable>
  );
}

export function CaptureSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}) {
  const styles = useThemeStyles(makeStyles);
  const { showSnackbar } = useSnackbar();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(visible);
  const mountedRef = useRef(visible);
  const reducedMotion = useReducedMotion();
  const transition = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const sheetY = transition.interpolate({ inputRange: [0, 1], outputRange: [Dimensions.get('window').height, 0] });

  useEffect(() => {
    transition.stopAnimation();
    if (visible) {
      setSaved(false);
      mountedRef.current = true;
      setMounted(true);
      transition.setValue(0);
      requestAnimationFrame(() => {
        if (reducedMotion) {
          Animated.timing(transition, { toValue: 1, duration: motionDuration.fast, useNativeDriver: Platform.OS !== 'web' }).start();
        } else {
          Animated.spring(transition, { toValue: 1, ...motionSpring.sheet, useNativeDriver: Platform.OS !== 'web' }).start();
        }
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
  const create = async (kind: 'note' | 'task' | 'reminder' | 'file' | 'image' | 'audio' | 'quick_capture') => {
    if (busy) return;
    setBusy(true);
    try {
      if (kind === 'quick_capture') {
        await createInboxCapture(text || 'Captura rápida');
        await onCreated?.();
        setSaved(true);
        showSnackbar('Captura salva na Caixa de entrada');
        setText('');
        await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 80 : motionDuration.normal));
        onClose();
        return;
      }
      if (kind === 'note') router.push({ pathname: '/notes/new', params: { seed: text } });
      else if (kind === 'task') router.push({ pathname: '/tasks/new', params: { seed: text } });
      else if (kind === 'reminder') router.push({ pathname: '/reminders/new', params: { seed: text } });
      else if (kind === 'file') router.push('/files' as never);
      else if (kind === 'image') router.push('/media/image' as never);
      else router.push('/media/audio' as never);
      setText('');
      onClose();
    } catch {
      showSnackbar('Não foi possível salvar a captura', 'error');
    } finally {
      setBusy(false);
    }
  };
  const suggestion = parseCapture(text);
  if (!mounted) return null;
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.scrim, { opacity: transition, pointerEvents: 'none' }]} />
        <Pressable style={styles.dismissScrim} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
              ].map((item, index) => (
                <AnimatedListItem key={item.kind} delay={index * 42}>
                  <ListRow icon={item.icon} title={item.title} subtitle={item.detail} onPress={() => create(item.kind)} />
                </AnimatedListItem>
              ))}
            </View>
            {suggestion ? (
              <Pressable onPress={() => create(suggestion.type)} style={styles.suggestion}>
                <Text style={styles.suggestionTitle}>Criar como {suggestion.type === 'task' ? 'tarefa' : 'lembrete'}?</Text>
                <Text style={styles.suggestionText}>{suggestion.title}</Text>
                <Text style={styles.suggestionMeta}>Detectado automaticamente · toque para continuar</Text>
              </Pressable>
            ) : text ? (
              <PrimaryButton
                title={saved ? 'Captura salva' : 'Salvar na Caixa de entrada'}
                icon={saved ? 'checkmark' : undefined}
                loading={busy && !saved}
                disabled={busy}
                onPress={() => void create('quick_capture')}
              />
            ) : null}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
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
    primaryText: { color: colors.onInk, fontWeight: '700', fontSize: 14 },
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
    chip: { paddingHorizontal: 13, minHeight: 34, borderRadius: radius.pill, justifyContent: 'center' },
    chipSelected: { backgroundColor: colors.ink },
    chipText: { ...typography.caption, fontWeight: '500' },
    chipTextSelected: { color: colors.onInk, fontWeight: '700' },
    segmented: { backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 3, flexDirection: 'row', position: 'relative' },
    segmentIndicator: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 9, backgroundColor: colors.surface, ...shadow },
    segment: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, zIndex: 1 },
    segmentSelected: { backgroundColor: 'transparent' },
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
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 6,
      zIndex: 10,
    },
    bottomNavItems: {
      width: '100%',
      maxWidth: 560,
      height: 66,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
    },
    bottomNavSurface: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 58, paddingHorizontal: 2 },
    tabLabel: { ...typography.meta, fontSize: 10, lineHeight: 12, fontWeight: '600' },
    createSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    createButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 4,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      ...shadow,
    },
    createLabel: { ...typography.meta, fontSize: 10, lineHeight: 12, fontWeight: '700', color: colors.accent, marginTop: 1 },
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
    dismissScrim: { ...StyleSheet.absoluteFill },
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
