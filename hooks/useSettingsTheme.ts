import { useColorScheme } from '@/hooks/use-color-scheme';

import { getAppColorPalette, primitive } from '@/theme/designTokens';

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
  /** Brand accent; links, switches, header actions. */
  primary: string;
};

export function useSettingsTheme(): SettingsTheme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const c = getAppColorPalette(isDark);
  const { slate: s } = primitive;
  return {
    isDark,
    screenBg: c.background,
    cardBg: c.surface,
    title: c.textPrimary,
    subtitle: c.textSecondary,
    section: c.textTertiary,
    border: isDark ? s[700] : s[100],
    headerBg: c.surface,
    chevron: s[400],
    track: isDark ? s[700] : s[200],
    primary: c.primary,
  };
}
