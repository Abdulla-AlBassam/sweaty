import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'

export default function DashboardScreen() {
  const { user, profile, signOut } = useAuth()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>sweaty</Text>
        </View>

        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.welcomeText}>
            Welcome, {profile?.display_name || profile?.username || 'Gamer'}!
          </Text>
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>

        {/* Placeholder */}
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Dashboard coming soon...</Text>
          <Text style={styles.placeholderSubtext}>
            Game search, library, and more features are on the way!
          </Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  welcome: {
    paddingVertical: Spacing.xl,
  },
  welcomeText: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emailText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: FontSize.lg,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  placeholderSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  signOutButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  signOutText: {
    color: Colors.text,
    fontSize: FontSize.md,
  },
})
