import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { SettingsTheme } from '@/hooks/useSettingsTheme';
import type { IconColorKey } from '@/constants/iconColors';
import { getIconColors } from '@/constants/iconColors';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  iconKey: IconColorKey;
  title: string;
  subtitle?: string;
  onPress: () => void;
  theme: SettingsTheme;
  isDark: boolean;
  rightElement?: ReactNode;
  showBorder?: boolean;
};

export function SettingsMenuItem({
  icon,
  iconKey,
  title,
  subtitle,
  onPress,
  theme,
  isDark,
  rightElement,
  showBorder = true,
}: Props) {
  const colors = getIconColors(isDark, iconKey);
  const height = subtitle ? 72 : 56;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          height,
          backgroundColor: theme.cardBg,
          borderBottomColor: theme.border,
          borderBottomWidth: showBorder ? StyleSheet.hairlineWidth : 0,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.bg }]}>
        <Ionicons name={icon} size={22} color={colors.icon} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: theme.title }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: theme.subtitle }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightElement ?? <Ionicons name="chevron-forward" size={18} color={theme.chevron} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 2 },
});
