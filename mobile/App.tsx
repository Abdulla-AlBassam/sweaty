import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast, { BaseToast, ToastConfig } from 'react-native-toast-message'
import { AuthProvider } from './src/contexts/AuthContext'
import { Colors } from './src/constants/colors'
import Navigation from './src/navigation'

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
        fontWeight: '600',
        color: Colors.accent,
      }}
      text2Style={{
        fontSize: 13,
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
        fontWeight: 'bold',
        color: Colors.accent,
      }}
      text2Style={{
        fontSize: 13,
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
        fontWeight: 'bold',
        color: '#FFD700',
      }}
      text2Style={{
        fontSize: 14,
        fontWeight: '600',
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

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="light" />
          <Navigation />
        </NavigationContainer>
        <Toast config={toastConfig} />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
