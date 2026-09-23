import { goBackOrHome } from '@/navigation/back';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Switch, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, resolveThemeColors, spacing, typography } from '@/design/theme';
import { useUIStore } from '@/stores/ui.store';
import { setSetting } from '@/database/repositories';
import {
  playTypingSound,
  playUISound,
  preloadTypingSound,
  preloadUISounds,
  stopTypingSound,
  stopUISounds,
} from '@/services/ui-sound-service';
import { useSnackbar } from '@/components/visual';
import { AnimatedPressable } from '@/motion/AnimatedPressable';

type IconName = keyof typeof Ionicons.glyphMap;

type SettingsItem = {
  label: string;
  icon: IconName;
  onPress?: () => void;
  destructive?: boolean;
};

export default function Settings() {
  const preference = useUIStore((state) => state.theme);
  const palette = resolveThemeColors(preference, useColorScheme());
  const uiSoundsEnabled = useUIStore((state) => state.uiSoundsEnabled);
  const setUISoundsEnabled = useUIStore((state) => state.setUISoundsEnabled);
  const typingSoundEnabled = useUIStore((state) => state.typingSoundEnabled);
  const setTypingSoundEnabled = useUIStore((state) => state.setTypingSoundEnabled);
  const { showSnackbar } = useSnackbar();
  const toggleUISounds = (enabled: boolean) => {
    setUISoundsEnabled(enabled);
    void setSetting('ui_sounds_enabled', String(enabled));
    if (enabled) {
      preloadUISounds();
      playUISound('selection-click');
    } else stopUISounds();
    showSnackbar(enabled ? 'Sons da interface ativados' : 'Sons da interface desativados', 'info');
  };
  const toggleTypingSound = (enabled: boolean) => {
    setTypingSoundEnabled(enabled);
    void setSetting('typing_sound_enabled', String(enabled));
    if (enabled) {
      preloadTypingSound();
      playTypingSound('', 'a');
    } else stopTypingSound();
    showSnackbar(enabled ? 'Som ao digitar ativado' : 'Som ao digitar desativado', 'info');
  };
  const items: SettingsItem[] = [
    { label: 'Ver apresentação do Nexo', icon: 'sparkles-outline', onPress: () => router.push('/onboarding') },
    { label: 'Conta e sincronização', icon: 'person-outline' },
    { label: 'Notificações', icon: 'notifications-outline', onPress: () => router.push('/settings/notifications') },
    { label: 'Aparência', icon: 'color-palette-outline', onPress: () => router.push('/settings/appearance') },
    { label: 'Privacidade', icon: 'lock-closed-outline' },
    { label: 'Exportar dados', icon: 'download-outline', onPress: () => router.push('/settings/backup') },
    { label: 'Ajuda e suporte', icon: 'help-circle-outline' },
    { label: 'Sair', icon: 'log-out-outline', destructive: true },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: palette.surface }]}>
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => goBackOrHome()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={10}
          style={styles.backButton}
          pressedScale={0.92}
        >
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </AnimatedPressable>
        <Text style={[styles.title, { color: palette.ink }]}>Configurações</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={[styles.row, { borderBottomColor: palette.line }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="volume-medium-outline" size={18} color={palette.inkSoft} />
          </View>
          <Text style={[styles.rowLabel, styles.rowCopy, { color: palette.ink }]}>Sons da interface</Text>
          <Switch
            accessibilityLabel="Sons da interface"
            value={uiSoundsEnabled}
            onValueChange={toggleUISounds}
            trackColor={{ false: palette.line, true: palette.accentSoft }}
            thumbColor={uiSoundsEnabled ? palette.accent : palette.surfaceMuted}
          />
        </View>
        <View style={[styles.row, styles.typingRow, { borderBottomColor: palette.line }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="keypad-outline" size={18} color={palette.inkSoft} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowLabel, { color: palette.ink }]}>Som ao digitar</Text>
            <Text style={[styles.rowDescription, { color: palette.inkMuted }]}>Efeito de máquina de escrever</Text>
          </View>
          <Switch
            accessibilityLabel="Som ao digitar"
            value={typingSoundEnabled}
            onValueChange={toggleTypingSound}
            trackColor={{ false: palette.line, true: palette.accentSoft }}
            thumbColor={typingSoundEnabled ? palette.accent : palette.surfaceMuted}
          />
        </View>
        {items.map((item) => {
          const color = item.destructive ? palette.danger : palette.inkSoft;
          return (
            <AnimatedPressable
              key={item.label}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: palette.line },
                pressed && item.onPress && { backgroundColor: palette.surfacePressed },
              ]}
              pressedScale={0.995}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={18} color={color} />
              </View>
              <Text style={[styles.rowLabel, { color: item.destructive ? palette.danger : palette.ink }]}>{item.label}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    minHeight: 62,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: { ...typography.bodyStrong, color: colors.ink, fontSize: 18 },
  headerSpacer: { width: 36, height: 36 },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowPressed: { backgroundColor: colors.surfacePressed },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...typography.body, color: colors.ink },
  rowCopy: { flex: 1 },
  typingRow: { minHeight: 64 },
  rowDescription: { ...typography.caption, marginTop: 2 },
  destructiveText: { color: colors.danger },
});
