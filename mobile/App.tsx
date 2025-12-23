import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { Colors } from './src/constants/colors'

function AppContent() {
  const { isLoading, user, profile } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Sweaty Mobile</Text>

      {user ? (
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>
            Welcome, {profile?.display_name || profile?.username || 'Gamer'}!
          </Text>
          <Text style={styles.mutedText}>
            Signed in as {user.email}
          </Text>
        </View>
      ) : (
        <Text style={styles.mutedText}>
          Sign in to start tracking your games
        </Text>
      )}
    </View>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
  },
  mutedText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
})
