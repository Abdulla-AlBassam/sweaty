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
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useGameLogs, useFollowCounts } from '../hooks/useSupabase'
import { calculateGamerXP, getGamerLevel, calculateSocialXP, getSocialLevel } from '../lib/xp'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'
import { supabase } from '../lib/supabase'
import XPProgressBar from '../components/XPProgressBar'
import LogGameModal from '../components/LogGameModal'
import EditFavoritesModal from '../components/EditFavoritesModal'
import FollowersModal from '../components/FollowersModal'

interface FavoriteGame {
  id: number
  name: string
  cover_url: string | null
}

interface GameLogWithGame {
  id: string
  game_id: number
  status: string
  rating: number | null
  platform: string | null
  review: string | null
  game: {
    id: number
    name: string
    cover_url: string | null
    platforms?: string[]
  }
}

export default function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth()
  const { logs, refresh: refreshLogs } = useGameLogs(user?.id)
  const { followers, following } = useFollowCounts(user?.id)
  const navigation = useNavigation()

  const [gameLogs, setGameLogs] = useState<GameLogWithGame[]>([])
  const [selectedGame, setSelectedGame] = useState<GameLogWithGame | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteGame[]>([])
  const [isFavoritesModalVisible, setIsFavoritesModalVisible] = useState(false)
  const [followersModalVisible, setFollowersModalVisible] = useState(false)
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers')

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
          review,
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

  // Fetch favorite games
  const fetchFavorites = useCallback(async () => {
    if (!profile?.favorite_games || profile.favorite_games.length === 0) {
      setFavorites([])
      return
    }

    try {
      const { data } = await supabase
        .from('games_cache')
        .select('id, name, cover_url')
        .in('id', profile.favorite_games)

      if (data) {
        // Sort by the order in favorite_games array
        const sorted = profile.favorite_games
          .map(id => data.find(g => g.id === id))
          .filter(Boolean) as FavoriteGame[]
        setFavorites(sorted)
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
    }
  }, [profile?.favorite_games])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const handleFavoritesSaveSuccess = () => {
    refreshProfile()
  }

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
          <TouchableOpacity
            style={styles.stat}
            onPress={() => {
              setFollowersModalType('followers')
              setFollowersModalVisible(true)
            }}
          >
            <Text style={styles.statValue}>{followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => {
              setFollowersModalType('following')
              setFollowersModalVisible(true)
            }}
          >
            <Text style={styles.statValue}>{following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Ranks */}
        <View style={styles.ranksSection}>
          <Text style={styles.sectionTitle}>Ranks</Text>
          <XPProgressBar type="gamer" levelInfo={gamerLevel} />
          <XPProgressBar type="social" levelInfo={socialLevel} />
        </View>

        {/* Favorites */}
        <View style={styles.favoritesSection}>
          <View style={styles.favoritesTitleRow}>
            <Text style={styles.sectionTitle}>Favorites</Text>
            <TouchableOpacity
              onPress={() => setIsFavoritesModalVisible(true)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.favoritesRow}>
            {[0, 1, 2].map((index) => {
              const game = favorites[index]
              if (game) {
                const coverUrl = game.cover_url
                  ? getIGDBImageUrl(game.cover_url, 'coverSmall')
                  : null
                return (
                  <View key={game.id} style={styles.favoriteSlot}>
                    {coverUrl ? (
                      <Image source={{ uri: coverUrl }} style={styles.favoriteCover} />
                    ) : (
                      <View style={[styles.favoriteCover, styles.favoriteCoverPlaceholder]}>
                        <Ionicons name="game-controller-outline" size={20} color={Colors.textDim} />
                      </View>
                    )}
                  </View>
                )
              }
              return (
                <TouchableOpacity
                  key={`empty-${index}`}
                  style={styles.favoriteSlot}
                  onPress={() => setIsFavoritesModalVisible(true)}
                >
                  <View style={[styles.favoriteCover, styles.emptyFavoriteSlot]}>
                    <Ionicons name="add" size={24} color={Colors.textDim} />
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
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
                  {log.review && (
                    <View style={styles.reviewBadge}>
                      <Ionicons name="chatbubble" size={10} color={Colors.text} />
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
            review: selectedGame.review,
          }}
          onSaveSuccess={handleLogSaveSuccess}
        />
      )}

      {/* Edit Favorites Modal */}
      {user && (
        <EditFavoritesModal
          visible={isFavoritesModalVisible}
          onClose={() => setIsFavoritesModalVisible(false)}
          currentFavorites={favorites}
          userId={user.id}
          onSaveSuccess={handleFavoritesSaveSuccess}
        />
      )}

      {/* Followers/Following Modal */}
      {user && (
        <FollowersModal
          visible={followersModalVisible}
          onClose={() => setFollowersModalVisible(false)}
          userId={user.id}
          type={followersModalType}
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
  favoritesSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  favoritesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  editButton: {
    padding: Spacing.sm,
  },
  editButtonText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '600',
  },
  favoritesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  favoriteSlot: {
    flex: 1,
  },
  favoriteCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  favoriteCoverPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFavoriteSlot: {
    borderStyle: 'dashed',
    borderColor: Colors.textDim,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
  reviewBadge: {
    position: 'absolute',
    top: 28,
    right: Spacing.xs,
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
