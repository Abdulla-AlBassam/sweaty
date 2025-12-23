import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './src/contexts/AuthContext'
import { Colors } from './src/constants/colors'
import Navigation from './src/navigation'

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: Colors.accent,
              background: Colors.background,
              card: Colors.surface,
              text: Colors.text,
              border: Colors.border,
              notification: Colors.accent,
            },
          }}
        >
          <StatusBar style="light" />
          <Navigation />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
