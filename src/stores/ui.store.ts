import { create } from 'zustand';

type UIState = {
  captureOpen: boolean;
  setCaptureOpen: (open: boolean) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: UIState['theme']) => void;
};
export const useUIStore = create<UIState>((set) => ({
  captureOpen: false,
  setCaptureOpen: (captureOpen) => set({ captureOpen }),
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
