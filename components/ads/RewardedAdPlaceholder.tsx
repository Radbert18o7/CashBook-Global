import { useEffect, useState } from 'react';
import { getApp } from '@react-native-firebase/app';
import { fetchAndActivate, getBoolean, getRemoteConfig } from '@react-native-firebase/remote-config';

export function useRewardedAdEnabled() {
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

  return enabled;
}

export function showRewardedAd(onRewardGranted: () => void) {
  // Scaffold: without wiring the real AdMob SDK, we just grant immediately when disabled.
  // When enabled, integrate later.
  try {
    onRewardGranted();
  } catch {
    // ignore
  }
}

