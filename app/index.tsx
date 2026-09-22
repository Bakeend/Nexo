import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, typography } from '@/design/theme';
import { getSetting } from '@/database/repositories';

export default function Entry() {
  useEffect(() => {
    const timer = setTimeout(async () => router.replace((await getSetting('onboarding_completed')) ? '/home' : '/onboarding'), 900);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.center}>
        <Text style={styles.logo}>Nexo</Text>
        <Text style={styles.tagline}>Suas ideias,{`\n`}sempre com você.</Text>
      </View>
      <View style={styles.progress}>
        <View style={styles.progressActive} />
        <View style={styles.progressRest} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { ...typography.display, fontSize: 36, fontWeight: '500', color: colors.ink },
  tagline: { ...typography.body, color: colors.inkSoft, textAlign: 'center', marginTop: spacing.sm },
  progress: {
    alignSelf: 'center',
    flexDirection: 'row',
    width: 72,
    height: 4,
    marginBottom: spacing.xxxl,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressActive: { width: 24, backgroundColor: colors.accent },
  progressRest: { flex: 1, backgroundColor: colors.ink, opacity: 0.25 },
});
