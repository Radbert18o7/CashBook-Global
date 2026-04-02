/**
 * Consistent icon tint backgrounds for settings menus (light mode).
 * For dark mode, use `getIconColors`.
 */
export const ICON_COLORS = {
  indigo: { bg: '#EEF2FF', icon: '#4F46E5' },
  teal: { bg: '#F0FDFA', icon: '#0F766E' },
  green: { bg: '#F0FDF4', icon: '#16A34A' },
  blue: { bg: '#EFF6FF', icon: '#2563EB' },
  purple: { bg: '#FAF5FF', icon: '#7C3AED' },
  pink: { bg: '#FDF2F8', icon: '#DB2777' },
  orange: { bg: '#FFF7ED', icon: '#EA580C' },
  red: { bg: '#FEF2F2', icon: '#DC2626' },
  gray: { bg: '#F8FAFC', icon: '#475569' },
  gold: { bg: '#FEFCE8', icon: '#CA8A04' },
} as const;

export type IconColorKey = keyof typeof ICON_COLORS;

/** Dark mode: subtler fills + same icon hues (~20% opacity on icon color for chip contrast). */
export function getIconColors(isDark: boolean, key: IconColorKey): { bg: string; icon: string } {
  const base = ICON_COLORS[key];
  if (!isDark) return { bg: base.bg, icon: base.icon };
  const icon = base.icon;
  return {
    bg: `${icon}33`,
    icon,
  };
}
