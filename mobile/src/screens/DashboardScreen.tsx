import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { useGameLogs, useActivityFeed, useFollowCounts } from '../hooks/useSupabase'
import { calculateGamerXP, getGamerLevel, calculateSocialXP, getSocialLevel } from '../lib/xp'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'
import StatCard from '../components/StatCard'
import XPProgressBar from '../components/XPProgressBar'
import ActivityItem from '../components/ActivityItem'

// Gaming-themed welcome messages (same as web)
const WELCOME_MESSAGES = [
  { text: 'Press Start', isQuestion: false },
  { text: 'Continue', isQuestion: true },
  { text: 'New quest awaits', isQuestion: false },
  { text: 'The hero returns', isQuestion: false },
  { text: 'Quest log updated', isQuestion: false },
  { text: "You've respawned", isQuestion: false },
  { text: 'Ready to game', isQuestion: true },
  { text: 'One more game', isQuestion: true },
  { text: 'Touch grass later', isQuestion: false },
]

function getRandomWelcomeMessage() {
  return WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)]
}

export default function DashboardScreen() {
  const { user, profile, signOut } = useAuth()
  const { logs, isLoading: logsLoading, refetch: refetchLogs } = useGameLogs(user?.id)
  const { activities, isLoading: activitiesLoading, refetch: refetchActivities } = useActivityFeed(user?.id)
  const { followers } = useFollowCounts(user?.id)

  const [refreshing, setRefreshing] = useState(false)
  const [welcomeMessage] = useState(getRandomWelcomeMessage)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetchLogs(), refetchActivities()])
    setRefreshing(false)
  }, [refetchLogs, refetchActivities])

  // Calculate stats
  const stats = useMemo(() => {
    const total = logs.length
    const completed = logs.filter((l) => l.status === 'completed').length
    const playing = logs.filter((l) => l.status === 'playing').length
    const ratings = logs.filter((l) => l.rating).map((l) => l.rating as number)
    const avgRating = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : '—'
    return { total, completed, playing, avgRating }
  }, [logs])

  // Calculate XP and levels
  const gamerXP = useMemo(() => calculateGamerXP(logs), [logs])
  const gamerLevel = useMemo(() => getGamerLevel(gamerXP), [gamerXP])
  const socialXP = useMemo(() => calculateSocialXP(logs, followers), [logs, followers])
  const socialLevel = useMemo(() => getSocialLevel(socialXP), [socialXP])

  // Currently playing games
  const currentlyPlaying = useMemo(() => {
    return logs
      .filter((l) => l.status === 'playing')
      .slice(0, 10)
  }, [logs])

  const displayName = profile?.display_name || profile?.username || 'Gamer'

  const handleUserPress = (userId: string, username: string) => {
    // TODO: Navigate to profile screen
    console.log('Navigate to profile:', username)
  }

  const handleGamePress = (gameId: number) => {
    // TODO: Navigate to game detail screen
    console.log('Navigate to game:', gameId)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>sweaty</Text>
          <TouchableOpacity onPress={signOut} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            {welcomeMessage.text}, {displayName}{welcomeMessage.isQuestion ? '?' : '!'}
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          {logsLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : (
            <View style={styles.statsGrid}>
              <StatCard label="Games Logged" value={stats.total} />
              <StatCard label="Completed" value={stats.completed} />
              <StatCard label="Playing" value={stats.playing} />
              <StatCard label="Avg Rating" value={stats.avgRating} icon="★" />
            </View>
          )}
        </View>

        {/* Ranks Section */}
        <View style={styles.ranksSection}>
          <Text style={styles.sectionTitle}>Ranks</Text>
          <XPProgressBar type="gamer" levelInfo={gamerLevel} />
          <XPProgressBar type="social" levelInfo={socialLevel} />
        </View>

        {/* Currently Playing */}
        {currentlyPlaying.length > 0 && (
          <View style={styles.currentlyPlayingSection}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.lg }]}>
              Currently Playing
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {currentlyPlaying.map((log: any) => {
                const game = log.games_cache
                if (!game) return null
                const coverUrl = game.cover_url
                  ? getIGDBImageUrl(game.cover_url, 'coverBig')
                  : null
                return (
                  <TouchableOpacity
                    key={log.id}
                    style={styles.gameCard}
                    onPress={() => handleGamePress(game.id)}
                  >
                    {coverUrl ? (
                      <Image source={{ uri: coverUrl }} style={styles.gameCover} />
                    ) : (
                      <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
                        <Text style={styles.placeholderText}>?</Text>
                      </View>
                    )}
                    <Text style={styles.gameTitle} numberOfLines={2}>
                      {game.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* Activity Feed */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Activity</Text>
          {activitiesLoading ? (
            <ActivityIndicator color={Colors.accent} style={styles.loader} />
          ) : activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Follow users to see their activity
              </Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {activities.slice(0, 10).map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  onUserPress={handleUserPress}
                  onGamePress={handleGamePress}
                />
              ))}
            </View>
          )}
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
  logo: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  settingsButton: {
    padding: Spacing.sm,
  },
  welcomeSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  welcomeText: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.text,
  },
  statsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  ranksSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  currentlyPlayingSection: {
    marginBottom: Spacing.lg,
  },
  horizontalScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  gameCard: {
    width: 100,
  },
  gameCover: {
    width: 100,
    height: 133,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  gameCoverPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: FontSize.xxl,
    color: Colors.textDim,
  },
  gameTitle: {
    fontSize: FontSize.xs,
    color: Colors.text,
    textAlign: 'center',
  },
  activitySection: {
    paddingHorizontal: Spacing.lg,
  },
  activityList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
})
