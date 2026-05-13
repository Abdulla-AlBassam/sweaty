// Dynamic Expo config so we can ship two side-by-side installs on the same
// device: a "Sweaty Dev" variant for iteration and "Sweaty" for preview/prod.
// Toggle is driven by APP_VARIANT, set per profile in eas.json. When running
// locally with `expo start`, set APP_VARIANT=development in the environment
// (or add it to a .env and load via direnv/dotenv) to match the dev build.
const IS_DEV = process.env.APP_VARIANT === 'development'

export default {
  expo: {
    name: IS_DEV ? 'Sweaty Dev' : 'Sweaty',
    slug: 'sweaty',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/app-icons/icon-dark.png',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    scheme: 'sweaty',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#14181c',
    },
    plugins: [
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '26.0',
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#0A0A0A',
        },
      ],
      'expo-dev-client',
      'expo-apple-authentication',
      [
        'expo-dynamic-app-icon',
        {
          light: {
            image: './assets/app-icons/icon-light.png',
            prerendered: true,
          },
          dark: {
            image: './assets/app-icons/icon-dark.png',
            prerendered: true,
          },
          monochrome: {
            image: './assets/app-icons/icon-monochrome.png',
            prerendered: true,
          },
        },
      ],
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? 'com.sweaty.app.dev' : 'com.sweaty.app',
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: IS_DEV ? 'com.sweaty.app.dev' : 'com.sweaty.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#14181c',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    runtimeVersion: {
      policy: 'fingerprint',
    },
    updates: {
      url: 'https://u.expo.dev/e90f0361-4435-411f-a4d6-6b89ba19945c',
    },
    extra: {
      eas: {
        projectId: 'e90f0361-4435-411f-a4d6-6b89ba19945c',
      },
    },
  },
}
