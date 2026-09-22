import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setSetting } from '@/database/repositories';
import { colors, radius, shadow, spacing, typography } from '@/design/theme';

const pages = [
  { title: 'Tudo em\num só lugar', text: 'Anote, organize e não esqueça o que importa.' },
  { title: 'Capture\nsem esforço', text: 'Guarde uma ideia em segundos e organize quando quiser.' },
  { title: 'Lembre do\nque importa', text: 'Tarefas e lembretes ficam juntos com as suas notas.' },
];

const previewItems = [
  { label: 'Notas', icon: 'document-text' as const },
  { label: 'Tarefas', icon: 'checkmark-circle' as const },
  { label: 'Lembretes', icon: 'notifications' as const },
  { label: 'Arquivos', icon: 'document' as const },
];

const cardTransforms = [
  { rotate: '-2deg', translateX: -4 },
  { rotate: '1deg', translateX: 4 },
  { rotate: '-1deg', translateX: -2 },
  { rotate: '2deg', translateX: 3 },
];

export default function Onboarding() {
  const [page, setPage] = useState(0);
  const current = pages[page];

  const finish = async () => {
    await setSetting('onboarding_completed', 'true');
    router.replace('/home');
  };

  const next = () => {
    if (page === pages.length - 1) {
      finish();
      return;
    }
    setPage((currentPage) => currentPage + 1);
  };

  const buttonLabel = page === 0 ? 'Começar' : page === pages.length - 1 ? 'Entrar no Nexo' : 'Continuar';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.topBar}>
        <Pressable onPress={finish} hitSlop={10} style={styles.skipButton}>
          <Text style={styles.skip}>Pular</Text>
        </Pressable>
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.text}</Text>
      </View>

      <View style={styles.preview}>
        <View style={styles.previewStack}>
          {previewItems.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.previewCard,
                index > 0 && styles.previewCardOverlap,
                {
                  transform: [
                    { translateX: cardTransforms[index].translateX },
                    { rotate: cardTransforms[index].rotate },
                  ],
                },
              ]}
            >
              <View style={styles.previewIcon}>
                <Ionicons name={item.icon} size={16} color={colors.accent} />
              </View>
              <Text style={styles.previewText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {pages.map((_, index) => (
            <View key={index} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>

        <Pressable onPress={next} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}>
          <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.xl },
  topBar: { minHeight: 50, alignItems: 'flex-end', justifyContent: 'center' },
  skipButton: { minHeight: 36, justifyContent: 'center' },
  skip: { ...typography.caption, color: colors.inkSoft, fontWeight: '600' },
  copy: { paddingTop: spacing.sm },
  title: { ...typography.display, color: colors.ink, fontSize: 31, lineHeight: 34, letterSpacing: -0.8 },
  subtitle: { ...typography.body, color: colors.inkSoft, marginTop: spacing.md, maxWidth: 250, lineHeight: 21 },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.md },
  previewStack: { width: 206 },
  previewCard: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadow,
  },
  previewCardOverlap: { marginTop: -4 },
  previewIcon: {
    width: 27,
    height: 27,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: { ...typography.caption, color: colors.ink, fontWeight: '600' },
  bottom: { paddingBottom: spacing.sm },
  dots: { height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.line },
  dotActive: { width: 20, backgroundColor: colors.accent },
  primaryButton: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: { opacity: 0.9 },
  primaryButtonText: { ...typography.bodyStrong, color: colors.white },
});
