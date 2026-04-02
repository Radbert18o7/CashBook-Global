import { useEffect, useState } from 'react';
import { getApp } from '@react-native-firebase/app';
import { fetchAndActivate, getBoolean, getRemoteConfig } from '@react-native-firebase/remote-config';

export function useInterstitialAd() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const rc = getRemoteConfig(getApp());
        await fetchAndActivate(rc);
        const v = getBoolean(rc, 'admob_enabled');
        if (!cancelled) setEnabled(!!v);
      } catch {
        if (!cancelled) setEnabled(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const showAd = async () => {
    // Scaffold: if enabled, wire AdMob later. For now, no-op.
    if (!enabled) return;
  };

  return { showAd, enabled };
}

export async function showInterstitialAd() {
  // kept for backwards compatibility if imported elsewhere
}

