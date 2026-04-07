import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

/** LocalPro primary deep blue palette */
export const Primary = {
  50:  '#E6F4FE',
  100: '#C0DFFE',
  200: '#91C5FD',
  300: '#5EAAFC',
  400: '#3C9FFE',
  500: '#208AEF',  // brand primary
  600: '#0274DF',
  700: '#015CB5',
  800: '#01448B',
  900: '#012D62',
} as const;

export const Status = {
  success:       '#16a34a',
  successBg:     '#dcfce7',
  warning:       '#d97706',
  warningBg:     '#fef3c7',
  error:         '#dc2626',
  errorBg:       '#fee2e2',
  info:          '#0891b2',
  infoBg:        '#cffafe',
  pending:       '#7c3aed',
  pendingBg:     '#ede9fe',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
