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
      <Text style={styles.title}>sweaty</Text>
      <Text style={styles.subtitle}>Track Your Games</Text>

      {user ? (
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>
            Welcome, {profile?.display_name || profile?.username || 'Gamer'}!
          </Text>
          <Text style={styles.mutedText}>
            You are signed in as {user.email}
          </Text>
        </View>
      ) : (
        <Text style={styles.mutedText}>
          Sign in to start tracking your games
        </Text>
      )}

      <View style={styles.badge}>
        <Text style={styles.badgeText}>Supabase Connected</Text>
      </View>
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
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.foregroundMuted,
    marginBottom: 32,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 20,
    color: Colors.foreground,
    marginBottom: 8,
  },
  mutedText: {
    fontSize: 14,
    color: Colors.foregroundMuted,
    textAlign: 'center',
  },
  badge: {
    marginTop: 40,
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  badgeText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
})
