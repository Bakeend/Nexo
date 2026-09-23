import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { Platform, Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { getSetting } from '@/database/repositories';
import { useReducedMotion } from '@/motion/useReducedMotion';

export default function Entry() {
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion) entrance.setValue(1);
    else Animated.timing(entrance, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }).start();
    const timer = setTimeout(async () => router.replace((await getSetting('onboarding_completed')) ? '/home' : '/onboarding'), 900);
    return () => clearTimeout(timer);
  }, [entrance, reducedMotion]);
  const scale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.center, { opacity: entrance, transform: [{ scale }] }]}>
        <Text style={styles.logo}>Nexo</Text>
        <Text style={styles.tagline}>Suas ideias,{`\n`}sempre com você.</Text>
      </Animated.View>
      <View style={styles.progress}>
        <View style={styles.progressActive} />
        <View style={styles.progressRest} />
      </View>
    </SafeAreaView>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
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
