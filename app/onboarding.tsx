import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '@/design/theme';
import { AppIcon, PrimaryButton } from '@/components/ui';
import { setSetting } from '@/database/repositories';

const pages = [
  { title: 'Tudo em\num só lugar', text: 'Anote, organize e não esqueça o que importa.', icon: 'layers-outline' as const },
  { title: 'Capture primeiro', text: 'Uma ideia rápida não precisa de uma estrutura perfeita.', icon: 'flash-outline' as const },
  { title: 'Lembre do que importa', text: 'O Nexo avisa você na hora certa, sem complicar.', icon: 'notifications-outline' as const },
];
export default function Onboarding() {
  const [page, setPage] = useState(0);
  const finish = async () => {
    await setSetting('onboarding_completed', 'true');
    router.replace('/home');
  };
  const current = pages[page];
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.skip} onPress={finish}>
          Pular
        </Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.text}</Text>
        <View style={styles.preview}>
          <View style={styles.previewStack}>
            {['document-text-outline', 'checkmark-circle-outline', 'notifications-outline', 'folder-outline'].map((icon, index) => (
              <View key={icon} style={[styles.previewItem, { transform: [{ translateY: index * 8 }] }]}>
                <AppIcon name={icon} size={17} />
                <Text style={styles.previewText}>{['Notas', 'Tarefas', 'Lembretes', 'Arquivos'][index]}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {pages.map((_, index) => (
            <View key={index} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton
          title={page === pages.length - 1 ? 'Começar' : 'Continuar'}
          onPress={() => (page === pages.length - 1 ? finish() : setPage(page + 1))}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.lg, backgroundColor: colors.canvas },
  top: { alignItems: 'flex-end', paddingTop: spacing.sm },
  skip: { ...typography.body, color: colors.inkMuted },
  copy: { flex: 1, paddingTop: 42 },
  title: { ...typography.display, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft, marginTop: spacing.md, maxWidth: 260 },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewStack: { width: 210, gap: 8, transform: [{ rotate: '-2deg' }] },
  previewItem: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadow,
  },
  previewText: { ...typography.caption, color: colors.ink },
  bottom: { paddingBottom: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotActive: { width: 22, backgroundColor: colors.accent },
});
