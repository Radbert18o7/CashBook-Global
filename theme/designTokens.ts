/**
 * Design tokens — primitives and semantic colors for CashBook Global.
 * Hooks and layouts should consume semantic values here instead of ad-hoc hex.
 */

const slate = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  400: '#94A3B8',
  500: '#64748B',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
} as const;

export const primitive = {
  brand: {
    primary: '#4F46E5',
    primaryLightDark: '#312E81',
    primaryLightLight: '#EEF2FF',
  },
  slate,
  status: {
    success: '#10B981',
    danger: '#F43F5E',
    warning: '#F59E0B',
  },
} as const;

/** Runtime palette used by screens (`useColors`). */
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

export function getAppColorPalette(dark: boolean): AppColorPalette {
  const { brand, slate: s, status } = primitive;
  return {
    background: dark ? s[900] : s[50],
    surface: dark ? s[800] : '#FFFFFF',
    surfaceSecondary: dark ? s[700] : s[100],
    textPrimary: dark ? s[100] : s[800],
    textSecondary: dark ? s[400] : s[500],
    textTertiary: dark ? s[500] : s[400],
    border: dark ? s[700] : s[200],
    borderLight: dark ? s[800] : s[100],
    primary: brand.primary,
    primaryLight: dark ? brand.primaryLightDark : brand.primaryLightLight,
    success: status.success,
    danger: status.danger,
    warning: status.warning,
    tabBarBg: dark ? s[800] : '#FFFFFF',
    tabBarBorder: dark ? s[700] : s[200],
    inactive: s[400],
  };
}
