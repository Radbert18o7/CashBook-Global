import { create } from 'zustand';

import type { ThemeMode } from '@/utils/models';

type UiState = {
  theme: ThemeMode;
  language: string;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  theme: 'system',
  language: 'en',
  setTheme: (theme) => set(() => ({ theme })),
  setLanguage: (language) => set(() => ({ language })),
}));

