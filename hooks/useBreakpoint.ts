import { useWindowDimensions } from 'react-native';

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();

  const isPhone = width < 480;
  const isTablet = width >= 480 && width < 1024;
  const isDesktop = width >= 1024;

  return { isPhone, isTablet, isDesktop, width, height };
}

