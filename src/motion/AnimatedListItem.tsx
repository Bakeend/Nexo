import { Platform, Animated, StyleProp, ViewStyle } from 'react-native';
import { PropsWithChildren, useEffect, useRef } from 'react';
import { motionDuration } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  exiting?: boolean;
  onExitComplete?: () => void;
  delay?: number;
}>;

export function AnimatedListItem({ children, style, exiting = false, onExitComplete, delay = 0 }: Props) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const scale = useRef(new Animated.Value(0.995)).current;
  const exitCompleteRef = useRef(onExitComplete);

  useEffect(() => {
    exitCompleteRef.current = onExitComplete;
  }, [onExitComplete]);

  useEffect(() => {
    if (exiting) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: reducedMotion ? 90 : motionDuration.normal,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateY, {
          toValue: 3,
          duration: reducedMotion ? 90 : motionDuration.fast,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scale, {
          toValue: 0.98,
          duration: reducedMotion ? 90 : motionDuration.fast,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(({ finished }) => {
        if (finished) exitCompleteRef.current?.();
      });
      return;
    }

    Animated.sequence([
      Animated.delay(reducedMotion ? 0 : delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: reducedMotion ? 100 : motionDuration.normal,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: reducedMotion ? 100 : motionDuration.normal,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: reducedMotion ? 100 : motionDuration.normal,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]).start();
  }, [delay, exiting, opacity, reducedMotion, scale, translateY]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }, { scale }] }]}>{children}</Animated.View>;
}
