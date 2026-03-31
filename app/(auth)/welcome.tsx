import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function WelcomeScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [fade, scale]);

  const containerStyle = useMemo(
    () => ({
      opacity: mounted ? fade : 0,
      transform: [{ scale: mounted ? scale : 0.9 }],
    }),
    [mounted, fade, scale],
  );

  return (
    <Animated.View style={[styles.container, { backgroundColor }, containerStyle]}>
      <View style={styles.logo} />
      <ThemedText type="title" style={styles.title}>
        CashBook Global
      </ThemedText>
      <ThemedText style={styles.subtitle}>Manage your business finances</ThemedText>

      <Link href="/sign-in" asChild>
        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Continue with Google</ThemedText>
        </Pressable>
      </Link>

      <Link href="/sign-in" asChild>
        <Pressable style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
          <ThemedText type="defaultSemiBold">Continue with Email</ThemedText>
        </Pressable>
      </Link>

      <Link href="/sign-in" asChild>
        <Pressable style={styles.guestButton}>
          <ThemedText type="subtitle">Continue as Guest</ThemedText>
        </Pressable>
      </Link>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 14,
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.9,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  outlineButton: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  guestButton: {
    marginTop: 4,
    paddingVertical: 8,
  },
  pressed: { opacity: 0.85 },
});

