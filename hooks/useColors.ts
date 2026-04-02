import { useColorScheme } from 'react-native';

export type AppColorPalette = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  success: string;
  danger: string;
  warning: string;
  tabBarBg: string;
  tabBarBorder: string;
  inactive: string;
};

export function useColors(): AppColorPalette {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  return {
    background: dark ? '#0F172A' : '#F8FAFC',
    surface: dark ? '#1E293B' : '#FFFFFF',
    surfaceSecondary: dark ? '#334155' : '#F1F5F9',
    textPrimary: dark ? '#F1F5F9' : '#1E293B',
    textSecondary: dark ? '#94A3B8' : '#64748B',
    textTertiary: dark ? '#64748B' : '#94A3B8',
    border: dark ? '#334155' : '#E2E8F0',
    borderLight: dark ? '#1E293B' : '#F1F5F9',
    primary: '#4F46E5',
    primaryLight: dark ? '#312E81' : '#EEF2FF',
    success: '#10B981',
    danger: '#F43F5E',
    warning: '#F59E0B',
    tabBarBg: dark ? '#1E293B' : '#FFFFFF',
    tabBarBorder: dark ? '#334155' : '#E2E8F0',
    inactive: '#94A3B8',
  };
}
