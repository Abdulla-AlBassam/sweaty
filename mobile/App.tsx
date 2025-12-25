import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast, { BaseToast, ToastConfig } from 'react-native-toast-message'
import * as Font from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider } from './src/contexts/AuthContext'
import { QuickLogProvider, useQuickLog } from './src/contexts/QuickLogContext'
import { Colors } from './src/constants/colors'
import { FontAssets, Fonts } from './src/constants/fonts'
import Navigation from './src/navigation'
import QuickLogModal from './src/components/QuickLogModal'

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

  return (
    <>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Navigation />
      </NavigationContainer>
      <QuickLogModal visible={isQuickLogOpen} onClose={closeQuickLog} />
    </>
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
            <AppContent />
          </QuickLogProvider>
        </AuthProvider>
        <Toast config={toastConfig} topOffset={60} />
      </SafeAreaProvider>
    </View>
  )
}
