import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export type NetworkStatus = {
  /** True when connected to the internet. */
  isOnline: boolean;
  /** True while the connection state is not yet determined or is transitioning. */
  isConnecting: boolean;
};

export function useNetworkStatus(): NetworkStatus {
  const [state, setState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    let mounted = true;
    void NetInfo.fetch().then((s) => {
      if (mounted) setState(s);
    });
    const unsub = NetInfo.addEventListener((s) => {
      if (mounted) setState(s);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const isConnecting = state == null || state.isInternetReachable === null;
  const isOnline = state?.isConnected === true && state?.isInternetReachable !== false;

  return { isOnline, isConnecting };
}
