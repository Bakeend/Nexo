import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/design/theme';

type IconName = keyof typeof Ionicons.glyphMap;

type SettingsItem = {
  label: string;
  icon: IconName;
  onPress?: () => void;
  destructive?: boolean;
};

export default function Settings() {
  const items: SettingsItem[] = [
    { label: 'Conta e sincronização', icon: 'person-outline' },
    { label: 'Notificações', icon: 'notifications-outline', onPress: () => router.push('/settings/notifications') },
    { label: 'Aparência', icon: 'color-palette-outline', onPress: () => router.push('/settings/appearance') },
    { label: 'Privacidade', icon: 'lock-closed-outline' },
    { label: 'Exportar dados', icon: 'download-outline', onPress: () => router.push('/settings/backup') },
    { label: 'Ajuda e suporte', icon: 'help-circle-outline' },
    { label: 'Sair', icon: 'log-out-outline', destructive: true },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={10}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>Configurações</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {items.map((item) => {
          const color = item.destructive ? colors.danger : colors.inkSoft;
          return (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ pressed }) => [styles.row, pressed && item.onPress && styles.rowPressed]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={18} color={color} />
              </View>
              <Text style={[styles.rowLabel, item.destructive && styles.destructiveText]}>{item.label}</Text>
            </Pressable>
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
  destructiveText: { color: colors.danger },
});
