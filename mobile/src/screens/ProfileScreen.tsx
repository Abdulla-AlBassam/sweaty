import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useGameLogs, useFollowCounts } from '../hooks/useSupabase'
import { calculateGamerXP, getGamerLevel, calculateSocialXP, getSocialLevel } from '../lib/xp'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'
import { supabase } from '../lib/supabase'
import XPProgressBar from '../components/XPProgressBar'
import LogGameModal from '../components/LogGameModal'

interface GameLogWithGame {
  id: string
  game_id: number
  status: string
  rating: number | null
  platform: string | null
  game: {
    id: number
    name: string
    cover_url: string | null
    platforms?: string[]
  }
}

export default function ProfileScreen() {
  const { user, profile } = useAuth()
  const { logs, refresh: refreshLogs } = useGameLogs(user?.id)
  const { followers, following } = useFollowCounts(user?.id)
  const navigation = useNavigation()

  const [gameLogs, setGameLogs] = useState<GameLogWithGame[]>([])
  const [selectedGame, setSelectedGame] = useState<GameLogWithGame | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)

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

  // Fetch game logs with game details
  const fetchGameLogs = useCallback(async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('game_logs')
        .select(`
          id,
          game_id,
          status,
          rating,
          platform,
          game:games_cache(id, name, cover_url, platforms)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (data) {
        const logsWithGames = data.map((log: any) => ({
          ...log,
          game: Array.isArray(log.game) ? log.game[0] : log.game
        })).filter((log: any) => log.game) as GameLogWithGame[]

        setGameLogs(logsWithGames)
      }
    } catch (error) {
      console.error('Error fetching game logs:', error)
    }
  }, [user])

  useEffect(() => {
    fetchGameLogs()
  }, [fetchGameLogs])

  const handleGamePress = (log: GameLogWithGame) => {
    setSelectedGame(log)
    setIsModalVisible(true)
  }

  const handleLogSaveSuccess = () => {
    fetchGameLogs()
    refreshLogs()
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as never)}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.text} />
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

        {/* Game Library */}
        <View style={styles.librarySection}>
          <Text style={styles.sectionTitle}>Game Library</Text>
          {gameLogs.length > 0 ? (
            <View style={styles.gamesGrid}>
              {gameLogs.map((log) => (
                <TouchableOpacity
                  key={log.id}
                  style={styles.gameCard}
                  onPress={() => handleGamePress(log)}
                >
                  {log.game?.cover_url ? (
                    <Image
                      source={{ uri: getIGDBImageUrl(log.game.cover_url, 'coverSmall') }}
                      style={styles.gameCover}
                    />
                  ) : (
                    <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
                      <Ionicons name="game-controller-outline" size={20} color={Colors.textDim} />
                    </View>
                  )}
                  <Text style={styles.gameTitle} numberOfLines={2}>{log.game?.name}</Text>
                  {log.rating && (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>★ {log.rating}</Text>
                    </View>
                  )}
                  <View style={styles.editBadge}>
                    <Ionicons name="create-outline" size={12} color={Colors.text} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="game-controller-outline" size={48} color={Colors.textDim} />
              <Text style={styles.emptyText}>No games logged yet</Text>
              <Text style={styles.emptySubtext}>Search for games to start tracking!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Log Game Modal */}
      {selectedGame && (
        <LogGameModal
          visible={isModalVisible}
          onClose={() => {
            setIsModalVisible(false)
            setSelectedGame(null)
          }}
          game={{
            id: selectedGame.game_id,
            name: selectedGame.game.name,
            cover_url: selectedGame.game.cover_url,
            platforms: selectedGame.game.platforms,
          }}
          existingLog={{
            id: selectedGame.id,
            status: selectedGame.status,
            rating: selectedGame.rating,
            platform: selectedGame.platform,
          }}
          onSaveSuccess={handleLogSaveSuccess}
        />
      )}
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
  settingsButton: {
    padding: Spacing.sm,
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
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gameCard: {
    width: '30%',
    marginBottom: Spacing.sm,
  },
  gameCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  gameCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitle: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  ratingText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: '600',
  },
  editBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 4,
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
})
