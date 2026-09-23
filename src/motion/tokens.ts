import { Easing } from 'react-native';

export const motionDuration = {
  fast: 120,
  normal: 180,
  medium: 240,
  slow: 320,
  sheetEnter: 280,
  sheetExit: 200,
} as const;

export const motionEasing = {
  standard: Easing.inOut(Easing.cubic),
  enter: Easing.out(Easing.cubic),
  exit: Easing.in(Easing.cubic),
} as const;

export const motionSpring = {
  press: { damping: 18, stiffness: 300, mass: 0.7 },
  selection: { damping: 16, stiffness: 240, mass: 0.8 },
  sheet: { damping: 22, stiffness: 210, mass: 0.85 },
} as const;

export const motionScale = {
  primary: 0.97,
  secondary: 0.98,
  icon: 0.91,
  fab: 0.95,
  listItem: 0.995,
} as const;
