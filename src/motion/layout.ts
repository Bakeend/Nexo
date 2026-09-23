import { LayoutAnimation } from 'react-native';
import { motionDuration } from '@/motion/tokens';

export function animateListLayout(reducedMotion = false) {
  const duration = reducedMotion ? 100 : motionDuration.normal;
  LayoutAnimation.configureNext({
    duration,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity, duration },
    update: { type: LayoutAnimation.Types.easeInEaseOut, duration },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity, duration },
  });
}
