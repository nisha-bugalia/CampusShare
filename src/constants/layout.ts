import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Layout = {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
} as const;
