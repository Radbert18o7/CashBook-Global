import { useEffect, useState } from 'react';
import remoteConfig from '@react-native-firebase/remote-config';

export function useInterstitialAd() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await remoteConfig().fetchAndActivate();
        const v = remoteConfig().getValue('admob_enabled').asBoolean();
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

