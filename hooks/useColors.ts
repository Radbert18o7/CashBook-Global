import { useColorScheme } from 'react-native';

import { getAppColorPalette, type AppColorPalette } from '@/theme/designTokens';

export type { AppColorPalette };

export function useColors(): AppColorPalette {
  const scheme = useColorScheme();
  return getAppColorPalette(scheme === 'dark');
}
