import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { useGameLogs, useFollowCounts } from '../hooks/useSupabase'
import { calculateGamerXP, getGamerLevel, calculateSocialXP, getSocialLevel } from '../lib/xp'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import XPProgressBar from '../components/XPProgressBar'

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth()
  const { logs } = useGameLogs(user?.id)
  const { followers, following } = useFollowCounts(user?.id)

  const displayName = profile?.display_name || profile?.username || 'Gamer'
  const username = profile?.username || ''

  // Calculate stats
  const totalGames = logs.length
  const completed = logs.filter((l) => l.status === 'completed').length

  // Calculate XP
  const gamerXP = calculateGamerXP(logs)
  const gamerLevel = getGamerLevel(gamerXP)
  const socialXP = calculateSocialXP(logs, followers)
  const socialLevel = getSocialLevel(socialXP)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{username}</Text>
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalGames}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Ranks */}
        <View style={styles.ranksSection}>
          <Text style={styles.sectionTitle}>Ranks</Text>
          <XPProgressBar type="gamer" levelInfo={gamerLevel} />
          <XPProgressBar type="social" levelInfo={socialLevel} />
        </View>

        {/* Placeholder for game library */}
        <View style={styles.librarySection}>
          <Text style={styles.sectionTitle}>Game Library</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Full library view coming soon...
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  signOutText: {
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing.md,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  displayName: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.text,
  },
  username: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  bio: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  ranksSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  librarySection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  placeholder: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
})
