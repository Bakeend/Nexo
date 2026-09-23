import { useEffect, useState } from 'react';
import { Platform, Animated, StyleSheet, View } from 'react-native';
import { colors } from '@/design/theme';

const particles = [
  { x: -38, y: -24, color: colors.accent, angle: -110 },
  { x: -29, y: -39, color: colors.success, angle: 95 },
  { x: -12, y: -43, color: colors.warning, angle: -85 },
  { x: 9, y: -42, color: colors.accent, angle: 120 },
  { x: 30, y: -32, color: colors.warning, angle: -130 },
  { x: 43, y: -14, color: colors.success, angle: 90 },
  { x: -43, y: 4, color: colors.warning, angle: 125 },
  { x: -29, y: 25, color: colors.success, angle: -100 },
  { x: -4, y: 32, color: colors.accent, angle: 110 },
  { x: 22, y: 27, color: colors.warning, angle: -90 },
  { x: 42, y: 12, color: colors.accent, angle: 115 },
] as const;

export function ConfettiBurst() {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: 720, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.65, 1], outputRange: [0, 1, 0.9, 0] });

  return (
    <View style={[styles.burst, { pointerEvents: 'none' }]}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              backgroundColor: particle.color,
              borderRadius: index % 3 === 0 ? 4 : 1,
              opacity,
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.y] }) },
                { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${particle.angle}deg`] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  burst: { ...StyleSheet.absoluteFill, overflow: 'visible' },
  particle: { position: 'absolute', left: 14, top: 14, width: 5, height: 7 },
});
