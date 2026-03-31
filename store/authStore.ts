import { create } from 'zustand';

import type { ThemeMode, UserProfile } from '@/utils/models';

export type AuthUser = UserProfile;

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setLanguage: (language: string) => void;
  setTheme: (theme: ThemeMode) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  setUser: (user) =>
    set(() => ({
      user,
      isAuthenticated: true,
      isLoading: false,
    })),
  clearUser: () =>
    set(() => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })),
  setLoading: (loading) => set(() => ({ isLoading: loading })),
  setLanguage: (language) =>
    set((state) => {
      if (!state.user) return state;
      return { user: { ...state.user, language } };
    }),
  setTheme: (theme) =>
    set((state) => {
      if (!state.user) return state;
      return { user: { ...state.user, theme } };
    }),
}));

