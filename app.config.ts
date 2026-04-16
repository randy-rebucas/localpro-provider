import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,

  /* ── Identity ──────────────────────────────────────────────── */
  name: process.env.EXPO_PUBLIC_APP_NAME ?? 'LocalPro Provider',
  slug: 'localpro-provider',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'localproprovider',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  
  /* ── Icons ─────────────────────────────────────────────────── */
  icon: './assets/images/icon.png',

  /* ── Splash screen ─────────────────────────────────────────── */
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#208AEF',
  },

  /* ── iOS ───────────────────────────────────────────────────── */
  ios: {
    icon: './assets/images/icon.png',
    bundleIdentifier: 'asia.localpro.provider',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription:
        'LocalPro needs camera access to take photos of your work and upload KYC documents.',
      NSPhotoLibraryUsageDescription:
        'LocalPro needs photo library access to upload portfolio images and KYC documents.',
      NSPhotoLibraryAddUsageDescription:
        'LocalPro needs permission to save photos to your library.',
      NSMicrophoneUsageDescription:
        'LocalPro needs microphone access for video recordings.',
    },
  },

  /* ── Android ───────────────────────────────────────────────── */
  android: {
    package: 'asia.localpro.provider',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ],
    softwareKeyboardLayoutMode: 'pan',
  },

  /* ── Web ───────────────────────────────────────────────────── */
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  /* ── Plugins ───────────────────────────────────────────────── */
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        resizeMode: 'contain',
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      },
    ],
    'expo-font',
    'expo-web-browser',
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission:
          'LocalPro needs access to your photos to upload portfolio images and KYC documents.',
        cameraPermission:
          'LocalPro needs camera access to capture photos of your work.',
        microphonePermission: false,
      },
    ],
    [
      'expo-notifications',
      {
        color: '#208AEF',
        defaultChannel: 'default',
        sounds: [],
      },
    ],
    [
      'expo-document-picker',
      {
        iCloudContainerEnvironment: 'Production',
      },
    ],
  ],

  /* ── Experiments ───────────────────────────────────────────── */
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  /* ── OTA Updates (EAS Update) ──────────────────────────────── */
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: 'https://u.expo.dev/1f6e3a93-8371-46bd-899e-5c8ae75540b5',
    fallbackToCacheTimeout: 0,
  },

  /* ── EAS ────────────────────────────────────────────────────── */
  owner: 'randyreb',
  extra: {
    eas: {
      projectId: '1f6e3a93-8371-46bd-899e-5c8ae75540b5',
    },
  },
});
