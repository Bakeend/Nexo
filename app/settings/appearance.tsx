import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, Segmented } from '@/components/ui';
import { useUIStore } from '@/stores/ui.store';
import { setSetting } from '@/database/repositories';
import { useSnackbar } from '@/components/visual';
export default function Appearance() {
  const { showSnackbar } = useSnackbar();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  return (
    <View style={styles.root}>
      <Header title="Aparência" onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.title}>Tema</Text>
        <Text style={styles.description}>Escolha como o Nexo deve aparecer.</Text>
        <Segmented
          values={['light', 'dark', 'system']}
          selected={theme}
          onChange={(value) => {
            const nextTheme = value as typeof theme;
            setTheme(nextTheme);
            void setSetting('theme', nextTheme);
            showSnackbar('Aparência atualizada');
          }}
        />
        <Text style={styles.note}>A preferência é mantida localmente no dispositivo.</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg },
  title: { ...typography.heading, color: colors.ink },
  description: { ...typography.body, color: colors.inkMuted, marginVertical: spacing.md },
  note: { ...typography.caption, color: colors.inkMuted, marginTop: spacing.lg },
});
