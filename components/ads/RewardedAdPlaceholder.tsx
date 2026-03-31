import { useEffect, useState } from 'react';
import remoteConfig from '@react-native-firebase/remote-config';

export function useRewardedAdEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await remoteConfig().fetchAndActivate();
        const v = remoteConfig().getValue('admob_enabled');
        const ok = v.asBoolean();
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

