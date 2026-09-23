import { goBackOrHome } from '@/navigation/back';
import { useEffect, useState } from 'react';
import { Platform, Animated, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, resolveThemeColors, spacing, typography, type ThemePreference } from '@/design/theme';
import { Header, Segmented } from '@/components/ui';
import { useUIStore } from '@/stores/ui.store';
import { setSetting } from '@/database/repositories';
import { useSnackbar } from '@/components/visual';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { motionDuration } from '@/motion/tokens';

const options: Record<string, ThemePreference> = { Sistema: 'system', Claro: 'light', Escuro: 'dark' };
const labels: Record<ThemePreference, string> = { system: 'Sistema', light: 'Claro', dark: 'Escuro' };

export default function Appearance() {
  const { showSnackbar } = useSnackbar();
  const preference = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const palette = resolveThemeColors(preference, useColorScheme());
  const reducedMotion = useReducedMotion();
  const [previewOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion) return;
    previewOpacity.setValue(0.35);
    Animated.timing(previewOpacity, { toValue: 1, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [palette, previewOpacity, reducedMotion]);

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: palette.canvas }]}>
      <View style={styles.headerSurface}>
        <Header title="Aparência" onBack={() => goBackOrHome()} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: palette.ink }]}>Tema</Text>
        <Text style={[styles.description, { color: palette.inkMuted }]}>Escolha como o Nexo deve aparecer.</Text>
        <View style={styles.controlSurface}>
          <Segmented
            values={Object.keys(options)}
            selected={labels[preference]}
            onChange={(label) => {
              const nextTheme = options[label];
              if (!nextTheme || nextTheme === preference) return;
              setTheme(nextTheme);
              void setSetting('theme', nextTheme);
              showSnackbar('Aparência atualizada');
            }}
          />
        </View>
        <Animated.View style={[styles.preview, { backgroundColor: palette.surface, borderColor: palette.line, opacity: previewOpacity }]}>
          <View style={[styles.previewDot, { backgroundColor: palette.accent }]} />
          <View>
            <Text style={[styles.previewTitle, { color: palette.ink }]}>Prévia do tema</Text>
            <Text style={[styles.previewDetail, { color: palette.inkMuted }]}>{labels[preference]}</Text>
          </View>
        </Animated.View>
        <Text style={[styles.note, { color: palette.inkMuted }]}>A preferência é mantida localmente no dispositivo.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  headerSurface: { backgroundColor: colors.surface },
  content: { padding: spacing.lg },
  title: { ...typography.heading },
  description: { ...typography.body, marginVertical: spacing.md },
  controlSurface: { backgroundColor: colors.surface, borderRadius: 12 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: 12,
  },
  previewDot: { width: 20, height: 20, borderRadius: 10 },
  previewTitle: { ...typography.bodyStrong },
  previewDetail: { ...typography.caption },
  note: { ...typography.caption, marginTop: spacing.lg },
});
