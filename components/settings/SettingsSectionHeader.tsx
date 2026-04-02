import { Text, StyleSheet } from 'react-native';

import type { SettingsTheme } from '@/hooks/useSettingsTheme';

type Props = { title: string; theme: SettingsTheme };

export function SettingsSectionHeader({ title, theme }: Props) {
  return (
    <Text style={[styles.text, { color: theme.section }]} accessibilityRole="header">
      {title.trim().toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
});
