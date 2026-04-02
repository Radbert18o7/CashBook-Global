import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { fetchAndActivate, getBoolean, getRemoteConfig } from '@react-native-firebase/remote-config';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function BannerAdPlaceholder() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const rc = getRemoteConfig(getApp());
        await fetchAndActivate(rc);
        const ok = getBoolean(rc, 'admob_enabled');
        if (!cancelled) setEnabled(!!ok);
      } catch {
        if (!cancelled) setEnabled(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="defaultSemiBold">{'AdMob banner (scaffold)'}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(127,127,127,0.25)',
    marginTop: 12,
  },
});

