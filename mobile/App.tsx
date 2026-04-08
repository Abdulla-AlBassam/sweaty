import { useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme, NavigationContainerRef } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast, { BaseToast, ToastConfig } from 'react-native-toast-message'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { QuickLogProvider, useQuickLog } from './src/contexts/QuickLogContext'
import { CelebrationProvider } from './src/contexts/CelebrationContext'
import { useNotifications } from './src/hooks/useNotifications'
import { Colors } from './src/constants/colors'
import { FontAssets, Fonts } from './src/constants/fonts'
import Navigation from './src/navigation'
import QuickLogModal from './src/components/QuickLogModal'
import { MainStackParamList } from './src/navigation'

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync()

// Custom toast configuration
const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: Colors.accent,
        backgroundColor: Colors.surface,
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontFamily: Fonts.bodySemiBold,
        color: Colors.accent,
      }}
      text2Style={{
        fontSize: 13,
        fontFamily: Fonts.body,
        color: Colors.text,
      }}
    />
  ),
  xp: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: Colors.accent,
        backgroundColor: Colors.surface,
        borderRadius: 8,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontFamily: Fonts.bodyBold,
        color: Colors.accent,
      }}
      text2Style={{
        fontSize: 13,
        fontFamily: Fonts.body,
        color: Colors.textMuted,
      }}
    />
  ),
  levelUp: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#FFD700',
        backgroundColor: Colors.surface,
        borderRadius: 8,
        borderLeftWidth: 4,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontFamily: Fonts.bodyBold,
        color: '#FFD700',
      }}
      text2Style={{
        fontSize: 14,
        fontFamily: Fonts.bodySemiBold,
        color: Colors.text,
      }}
    />
  ),
  streak: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: Colors.fire,
        backgroundColor: Colors.surface,
        borderRadius: 8,
        borderLeftWidth: 3,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontFamily: Fonts.bodySemiBold,
        color: Colors.fire,
      }}
      text2Style={{
        fontSize: 13,
        fontFamily: Fonts.body,
        color: Colors.textMuted,
      }}
    />
  ),
}

const theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.accent,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.accent,
  },
}

function AppContent() {
  const { isQuickLogOpen, closeQuickLog } = useQuickLog()
  const { user } = useAuth()
  const navigationRef = useRef<NavigationContainerRef<MainStackParamList>>(null)

  // Initialise push notification listeners
  useNotifications(user?.id)

  // Handle notification taps for deep linking
  const lastNotificationResponse = Notifications.useLastNotificationResponse()
  useEffect(() => {
    if (!lastNotificationResponse || !navigationRef.current) return

    const data = lastNotificationResponse.notification.request.content.data as Record<string, string> | undefined
    if (!data?.type) return

    switch (data.type) {
      case 'new_follower':
        if (data.username) {
          navigationRef.current.navigate('UserProfile', { username: data.username })
        }
        break
      case 'friend_activity':
        if (data.gameId) {
          navigationRef.current.navigate('GameDetail', { gameId: Number(data.gameId) })
        }
        break
      // streak_reminder: just opens the app (no specific navigation)
    }
  }, [lastNotificationResponse])

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <StatusBar style="light" />
      <Navigation />
      <QuickLogModal visible={isQuickLogOpen} onClose={closeQuickLog} />
    </NavigationContainer>
  )
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false)

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync(FontAssets)
      } catch (e) {
        console.warn('Error loading fonts:', e)
      } finally {
        setFontsLoaded(true)
      }
    }
    loadFonts()
  }, [])

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return null
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <AuthProvider>
          <QuickLogProvider>
            <CelebrationProvider>
              <AppContent />
            </CelebrationProvider>
          </QuickLogProvider>
        </AuthProvider>
        <Toast config={toastConfig} topOffset={60} />
      </SafeAreaProvider>
    </View>
  )
}
