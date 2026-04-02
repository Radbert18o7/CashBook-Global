import { StyleSheet, View, type ViewProps } from 'react-native';

import type { SettingsTheme } from '@/hooks/useSettingsTheme';

type Props = ViewProps & {
  theme: SettingsTheme;
  children: React.ReactNode;
};

export function SettingsCard({ theme, children, style, ...rest }: Props) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          shadowColor: '#000',
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});
