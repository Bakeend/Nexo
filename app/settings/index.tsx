import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, ListRow } from '@/components/ui';
export default function Settings() {
  return (
    <View style={styles.root}>
      <Header title="Configurações" onBack={() => router.back()} />
      <View style={styles.content}>
        <ListRow
          icon="notifications-outline"
          title="Notificações"
          subtitle="Permissões e comportamento"
          onPress={() => router.push('/settings/notifications')}
        />
        <ListRow
          icon="color-palette-outline"
          title="Aparência"
          subtitle="Tema claro, escuro ou sistema"
          onPress={() => router.push('/settings/appearance')}
        />
        <ListRow icon="shield-checkmark-outline" title="Privacidade local" subtitle="Seus dados permanecem no dispositivo" />
        <ListRow
          icon="archive-outline"
          title="Exportar dados"
          subtitle="Exportar ou importar um backup local"
          onPress={() => router.push('/settings/backup')}
        />
        <ListRow icon="trash-outline" title="Lixeira" subtitle="Restaurar itens excluídos" onPress={() => router.push('/trash')} />
        <ListRow icon="pricetags-outline" title="Tags" subtitle="Gerenciar assuntos" onPress={() => router.push('/tags')} />
        <ListRow icon="help-circle-outline" title="Ajuda e diagnóstico" subtitle="Versão 0.1.0" />
        <View style={styles.about}>
          <Text style={styles.aboutTitle}>Nexo</Text>
          <Text style={styles.aboutText}>Capture primeiro. Organize depois.</Text>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, margin: spacing.lg, marginTop: 0, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: 18 },
  about: { marginTop: 'auto', paddingVertical: spacing.xl, alignItems: 'center' },
  aboutTitle: { ...typography.heading, color: colors.ink },
  aboutText: { ...typography.caption, color: colors.inkMuted, marginTop: 4 },
});
