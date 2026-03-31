import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineNetworkBanner() {
  const { t } = useTranslation();
  const { isOnline, isConnecting } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const visible = !isConnecting && !isOnline;

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(visible ? 0 : -80, { duration: 220 }) }],
    opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
  }));

  if (isConnecting) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.wrap,
        { paddingTop: insets.top + 4 },
        anim,
      ]}
    >
      <View style={styles.bar}>
        <ThemedText style={styles.text}>{t('offline.banner')}</ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  bar: {
    marginHorizontal: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.95)',
  },
  text: { color: '#fff', fontWeight: '700', textAlign: 'center' },
});
