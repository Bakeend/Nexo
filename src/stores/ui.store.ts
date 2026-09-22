import { create } from 'zustand';

type UIState = {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: UIState['theme']) => void;
};
export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
