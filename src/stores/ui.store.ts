import { create } from 'zustand';
import type { ThemePreference } from '@/design/theme';

type UIState = {
  theme: ThemePreference;
  uiSoundsEnabled: boolean;
  typingSoundEnabled: boolean;
  setTheme: (theme: UIState['theme']) => void;
  setUISoundsEnabled: (enabled: boolean) => void;
  setTypingSoundEnabled: (enabled: boolean) => void;
};
export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  uiSoundsEnabled: true,
  typingSoundEnabled: false,
  setTheme: (theme) => set({ theme }),
  setUISoundsEnabled: (uiSoundsEnabled) => set({ uiSoundsEnabled }),
  setTypingSoundEnabled: (typingSoundEnabled) => set({ typingSoundEnabled }),
}));
