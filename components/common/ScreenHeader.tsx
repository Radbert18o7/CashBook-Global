import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import type { SettingsTheme } from '@/hooks/useSettingsTheme';
import type { AppColorPalette } from '@/hooks/useColors';

type Props = {
  title: string;
  theme: SettingsTheme;
  /** When set, overrides header background, title, and border from `theme`. */
  colors?: AppColorPalette;
  onBack?: () => void;
  rightLabel?: string;
  rightAction?: () => void;
  rightElement?: React.ReactNode;
};

export function ScreenHeader({
  title,
  theme,
  colors,
  onBack,
  rightLabel,
  rightAction,
  rightElement,
}: Props) {
  const router = useRouter();
  const headerBg = colors?.surface ?? theme.headerBg;
  const titleColor = colors?.textPrimary ?? theme.title;
  const borderColor = colors?.border ?? theme.border;

  return (
    <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
      <View style={styles.sideLeft}>
        <Pressable
          onPress={onBack ?? (() => router.back())}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={titleColor} />
        </Pressable>
      </View>
      <View style={styles.titleCenter} pointerEvents="none">
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={[styles.sideRight, rightElement ? styles.sideRightRow : null]}>
        {rightElement}
        {!rightElement && rightLabel && rightAction ? (
          <Pressable onPress={rightAction} hitSlop={8}>
            <Text style={styles.rightLabel}>{rightLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
    position: 'relative',
  },
  sideLeft: { width: 44, justifyContent: 'center', zIndex: 1 },
  sideRight: { minWidth: 44, alignItems: 'flex-end', justifyContent: 'center', zIndex: 1 },
  sideRightRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 88 },
  titleCenter: {
    position: 'absolute',
    left: 56,
    right: 56,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    width: '100%',
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  rightLabel: { fontSize: 16, fontWeight: '600', color: '#4F46E5' },
});
