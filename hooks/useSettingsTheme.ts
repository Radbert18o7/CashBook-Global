import { useColorScheme } from '@/hooks/use-color-scheme';

export type SettingsTheme = {
  isDark: boolean;
  screenBg: string;
  cardBg: string;
  title: string;
  subtitle: string;
  section: string;
  border: string;
  headerBg: string;
  chevron: string;
  track: string;
};

export function useSettingsTheme(): SettingsTheme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    isDark,
    screenBg: isDark ? '#0F172A' : '#F8FAFC',
    cardBg: isDark ? '#1E293B' : '#FFFFFF',
    title: isDark ? '#F1F5F9' : '#0F172A',
    subtitle: isDark ? '#94A3B8' : '#64748B',
    section: isDark ? '#64748B' : '#94A3B8',
    border: isDark ? '#334155' : '#F1F5F9',
    headerBg: isDark ? '#1E293B' : '#FFFFFF',
    chevron: '#94A3B8',
    track: isDark ? '#334155' : '#E2E8F0',
  };
}
