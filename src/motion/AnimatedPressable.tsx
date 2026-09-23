import { Platform, Animated, Pressable, PressableProps, PressableStateCallbackType, StyleProp, ViewStyle } from 'react-native';
import { useRef, useState } from 'react';
import { motionSpring } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  pressedScale?: number;
};

const NativeAnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({ style, pressedScale = 0.97, onPressIn, onPressOut, ...props }: Props) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const animateTo = (toValue: number) => {
    if (reducedMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, { toValue, ...motionSpring.press, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const animatedStyle = [typeof style === 'function' ? style({ pressed }) : style, { transform: [{ scale }] }];

  return (
    <NativeAnimatedPressable
      {...props}
      onPressIn={(event) => {
        setPressed(true);
        animateTo(pressedScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        animateTo(1);
        onPressOut?.(event);
      }}
      style={animatedStyle as never}
    />
  );
}
