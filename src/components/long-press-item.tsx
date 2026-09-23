import { Platform, Animated, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { SheetOption, useItemActions } from '@/components/visual';
import { motionDuration, motionScale, motionSpring } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { playUISound } from '@/services/ui-sound-service';

export function LongPressItem({
  title,
  actions,
  onPress,
  children,
  style,
  pressedStyle,
  selectedStyle,
  accessibilityLabel,
  containerRole = 'button',
  delayLongPress = 380,
}: {
  title: string;
  actions: SheetOption[];
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  selectedStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  containerRole?: 'button' | 'none';
  delayLongPress?: number;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const { showItemActions } = useItemActions();
  const reducedMotion = useReducedMotion();
  const [selected, setSelected] = useState(false);
  const mounted = useRef(true);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const selection = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      scale.stopAnimation();
    };
  }, [scale]);
  useEffect(() => {
    if (reducedMotion) selection.setValue(selected ? 1 : 0);
    else Animated.timing(selection, { toValue: selected ? 1 : 0, duration: motionDuration.normal, useNativeDriver: false }).start();
  }, [reducedMotion, selected, selection]);
  const backgroundColor = selection.interpolate({ inputRange: [0, 1], outputRange: ['rgba(75, 111, 243, 0)', colors.accentSoft] });
  const borderColor = selection.interpolate({ inputRange: [0, 1], outputRange: ['rgba(75, 111, 243, 0)', colors.accent] });
  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(translateY, { toValue: 0, duration: motionDuration.normal, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [opacity, reducedMotion, translateY]);
  const onLongPress = useCallback(() => {
    setSelected(true);
    if (reducedMotion) {
      playUISound('selection-click');
      showItemActions(title, actions, () => {
        if (mounted.current) setSelected(false);
      });
      return;
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.975, duration: 75, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, ...motionSpring.selection, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(({ finished }) => {
      if (!mounted.current) return;
      if (!finished) {
        setSelected(false);
        return;
      }
      playUISound('selection-click');
      showItemActions(title, actions, () => {
        if (!mounted.current) return;
        setSelected(false);
        scale.setValue(1);
      });
    });
  }, [actions, reducedMotion, scale, showItemActions, title]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Animated.View style={[styles.animated, { backgroundColor, borderColor }]}>
        <Pressable
          accessibilityRole={containerRole}
          accessibilityLabel={accessibilityLabel || title}
          onPress={onPress}
          onPressIn={() => {
            if (!reducedMotion)
              Animated.spring(scale, {
                toValue: motionScale.listItem,
                ...motionSpring.press,
                useNativeDriver: Platform.OS !== 'web',
              }).start();
          }}
          onPressOut={() => {
            if (!reducedMotion && !selected)
              Animated.spring(scale, { toValue: 1, ...motionSpring.press, useNativeDriver: Platform.OS !== 'web' }).start();
          }}
          onLongPress={onLongPress}
          delayLongPress={delayLongPress}
          style={({ pressed }) => [style, selected && selectedStyle, pressed && pressedStyle]}
        >
          {children}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    animated: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  });
