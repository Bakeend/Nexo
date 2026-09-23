import { Platform, useColorScheme } from 'react-native';
import { useMemo } from 'react';
import { useUIStore } from '@/stores/ui.store';

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
  onInk: '#FFFFFF',
  onAccent: '#FFFFFF',
  scrim: 'rgba(17, 24, 39, 0.55)',
};

export type ThemePreference = 'light' | 'dark' | 'system';
export type AppColors = typeof colors;

export const darkColors: AppColors = {
  canvas: '#10141F',
  surface: '#1A2030',
  surfaceMuted: '#252D40',
  surfacePressed: '#303A50',
  ink: '#F5F7FC',
  inkSoft: '#CDD4E3',
  inkMuted: '#A4AEC2',
  line: '#354057',
  accent: '#8BA4FF',
  accentSoft: '#28365B',
  accentDark: '#C4D0FF',
  success: '#65D1AC',
  successSoft: '#1C4239',
  warning: '#F4B66B',
  warningSoft: '#493824',
  danger: '#FF8989',
  dangerSoft: '#4A292E',
  white: '#FFFFFF',
  onInk: '#10141F',
  onAccent: '#10141F',
  scrim: 'rgba(0, 0, 0, 0.68)',
};

export function resolveThemeColors(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined,
): AppColors {
  return preference === 'dark' || (preference === 'system' && systemScheme === 'dark') ? darkColors : colors;
}

export function useThemeColors(): AppColors {
  const preference = useUIStore((state) => state.theme);
  return resolveThemeColors(preference, useColorScheme());
}

export function useThemeStyles<T>(factory: (palette: AppColors) => T): T {
  const palette = useThemeColors();
  return useMemo(() => factory(palette), [factory, palette]);
}

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
