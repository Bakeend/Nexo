import { Platform } from 'react-native';

export const colors = {
  canvas: '#F7F8FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F5FA',
  surfacePressed: '#EEF1F8',
  ink: '#111827',
  inkSoft: '#556078',
  inkMuted: '#8992A6',
  line: '#E7EAF1',
  accent: '#4B6FF3',
  accentSoft: '#EAF0FF',
  accentDark: '#294FC2',
  success: '#209B78',
  successSoft: '#E6F7F0',
  warning: '#E68B34',
  warningSoft: '#FFF2E4',
  danger: '#E05252',
  dangerSoft: '#FFF0F0',
  white: '#FFFFFF',
  scrim: 'rgba(17, 24, 39, 0.55)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  meta: { fontSize: 11, lineHeight: 15, fontWeight: '500' as const },
};

export const shadow = Platform.select({
  ios: { shadowColor: '#1C2745', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  android: { elevation: 3 },
  default: {},
});
