import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useSafeArea() {
  const insets = useSafeAreaInsets();
  return {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    paddingTop: { paddingTop: insets.top },
    paddingBottom: { paddingBottom: insets.bottom + 8 },
    marginBottom: { marginBottom: insets.bottom + 8 },
    scrollBottomPad: insets.bottom + 16,
  };
}
