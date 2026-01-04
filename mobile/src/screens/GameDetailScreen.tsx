import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import SweatDropIcon from '../components/SweatDropIcon'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, STATUS_LABELS, API_CONFIG } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useOpenCritic, useCommunityStats, useFriendsWhoPlayed } from '../hooks/useSupabase'
import { usePlatformFilter } from '../hooks/usePlatformFilter'
import { MainStackParamList } from '../navigation'
import LogGameModal from '../components/LogGameModal'
import GameReviews from '../components/GameReviews'
import StarRating from '../components/StarRating'
import TrailerSection from '../components/TrailerSection'
import TwitchStreamsSection from '../components/TwitchStreamsSection'
import { GameDetailSkeleton } from '../components/skeletons'

type Props = NativeStackScreenProps<MainStackParamList, 'GameDetail'>

interface GameVideo {
  videoId: string
  name: string
}

interface SimilarGame {
  id: number
  name: string
  coverUrl: string | null
}

interface GameDetails {
  id: number
  name: string
  slug?: string
  summary?: string
  coverUrl?: string
  cover_url?: string
  firstReleaseDate?: string
  first_release_date?: string
  genres?: string[]
  platforms?: string[]
  rating?: number
  videos?: GameVideo[]
  similarGames?: SimilarGame[]
}

interface UserGameLog {
  id: string
  status: string
  rating: number | null
  platform: string | null
  review: string | null
}

export default function GameDetailScreen({ navigation, route }: Props) {
  const { gameId } = route.params
  const { user } = useAuth()
  const { platformsParam, excludePcOnly } = usePlatformFilter()

  const [game, setGame] = useState<GameDetails | null>(null)
  const [userLog, setUserLog] = useState<UserGameLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch ratings data
  const { data: openCriticData } = useOpenCritic(gameId, game?.name || '')
  const { stats: communityStats, refetch: refetchCommunityStats } = useCommunityStats(gameId)

  // Fetch friends who played this game
  const { friends: friendsWhoPlayed } = useFriendsWhoPlayed(gameId, user?.id)

  useEffect(() => {
    console.log('=== GAME DETAIL SCREEN MOUNTED === gameId:', gameId)
    fetchGameDetails()
  }, [gameId])

  useEffect(() => {
    if (user) {
      fetchUserLog()
    }
  }, [gameId, user])

  const fetchGameDetails = async () => {
    console.log('=== FETCHING GAME DETAILS ===')
    console.log('Game ID:', gameId)
    console.log('API URL:', `${API_CONFIG.baseUrl}/api/games/${gameId}/details`)

    try {
      // First try to get from cache for quick display
      const { data: cached } = await supabase
        .from('games_cache')
        .select('*')
        .eq('id', gameId)
        .single()

      if (cached) {
        console.log('Loaded from cache:', cached.name)
        setGame({
          id: cached.id,
          name: cached.name,
          slug: cached.slug,
          summary: cached.summary,
          cover_url: cached.cover_url,
          first_release_date: cached.first_release_date,
          genres: cached.genres,
          platforms: cached.platforms,
          rating: cached.rating,
        })
        setIsLoading(false)
      }

      // Always fetch from API to get videos and similar games (cache doesn't store them)
      try {
        let detailsUrl = `${API_CONFIG.baseUrl}/api/games/${gameId}/details`
        const params: string[] = []
        // Add platform filter for similar games
        if (platformsParam) {
          params.push(`platforms=${encodeURIComponent(platformsParam)}`)
        }
        // Add exclude PC-only filter
        if (excludePcOnly) {
          params.push('exclude_pc_only=true')
        }
        if (params.length > 0) {
          detailsUrl += `?${params.join('&')}`
        }
        const response = await fetch(detailsUrl)
        console.log('API Response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('API Response videos:', data.videos?.length || 0, 'videos')
          if (data.videos) {
            console.log('Video IDs:', data.videos.map((v: GameVideo) => v.videoId))
          }

          setGame(prev => ({
            ...prev,
            ...data,
          }))
        } else {
          console.log('API returned non-OK status, continuing without videos')
        }
      } catch (apiError) {
        // API fetch failed - continue without videos, game still works from cache
        console.log('Could not fetch from API (videos unavailable):', apiError)
      }
    } catch (error) {
      console.error('Error fetching game:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserLog = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('game_logs')
        .select('id, status, rating, platform, review')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .single()

      setUserLog(data || null)
    } catch (error) {
      // Game not logged yet, that's fine
      setUserLog(null)
    }
  }, [user, gameId])

  const handleLogSaveSuccess = useCallback(() => {
    // Refresh the user's log, reviews, and community stats after saving
    fetchUserLog()
    setReviewsRefreshKey(prev => prev + 1)
    refetchCommunityStats()
  }, [fetchUserLog, refetchCommunityStats])

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      fetchGameDetails(),
      fetchUserLog(),
    ])
    setReviewsRefreshKey(prev => prev + 1)
    refetchCommunityStats()
    setRefreshing(false)
  }, [fetchUserLog, refetchCommunityStats])

  const getCoverUrl = () => {
    const url = game?.coverUrl || game?.cover_url
    return url ? getIGDBImageUrl(url, 'coverBig2x') : null
  }

  const getReleaseYear = () => {
    const date = game?.firstReleaseDate || game?.first_release_date
    if (!date) return null
    return new Date(date).getFullYear()
  }

  // Get color based on OpenCritic tier
  const getOpenCriticColor = (tier: string | null) => {
    switch (tier) {
      case 'Mighty': return '#66CC33' // Green
      case 'Strong': return '#4A90D9' // Blue
      case 'Fair': return '#FFCC33' // Amber/Yellow
      case 'Weak': return '#FF6633' // Red/Orange
      default: return Colors.textMuted
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>loading...</Text>
        </View>
        <ScrollView style={styles.scrollView}>
          <GameDetailSkeleton />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (!game) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>not found</Text>
        </View>
        <View style={styles.centered}>
          <SweatDropIcon size={64} variant="static" />
          <Text style={styles.errorText}>game not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const coverUrl = getCoverUrl()
  const releaseYear = getReleaseYear()

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{game.name}</Text>
        <TouchableOpacity
          style={styles.headerFab}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons
            name={userLog ? 'pencil' : 'add'}
            size={20}
            color={Colors.background}
          />
        </TouchableOpacity>
      </View>

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
        {/* Cover and Info */}
        <View style={styles.gameInfo}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <SweatDropIcon size={40} variant="static" />
            </View>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.title}>{game.name}</Text>
            {releaseYear && (
              <Text style={styles.year}>{releaseYear}</Text>
            )}
            {game.genres && game.genres.length > 0 && (
              <Text style={styles.genres}>{game.genres.slice(0, 3).join(', ')}</Text>
            )}

            {/* Rating Pills */}
            <View style={styles.ratingPills}>
              {openCriticData?.score && (
                <View style={[styles.ratingPill, { borderColor: getOpenCriticColor(openCriticData.tier) }]}>
                  <Text style={[styles.ratingPillScore, { color: getOpenCriticColor(openCriticData.tier) }]}>
                    {openCriticData.score}
                  </Text>
                </View>
              )}
              {communityStats.averageRating ? (
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingPillText}>{communityStats.averageRating}</Text>
                </View>
              ) : null}
              <View style={styles.ratingPill}>
                <SweatDropIcon size={14} variant="static" />
                <Text style={styles.ratingPillText}>{communityStats.totalLogs || 0} logs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* User Status */}
        {userLog && (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
            <Text style={styles.statusText}>
              {STATUS_LABELS[userLog.status] || userLog.status}
            </Text>
            {userLog.rating && (
              <View style={styles.statusRating}>
                <Text style={styles.statusText}> • </Text>
                <StarRating rating={userLog.rating} size={14} />
              </View>
            )}
          </View>
        )}

        {/* Friends who played */}
        {friendsWhoPlayed.length > 0 && (
          <View style={styles.friendsSection}>
            <Text style={styles.sectionTitle}>Friends who played</Text>
            <View style={styles.friendsRow}>
              {friendsWhoPlayed.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  onPress={() => navigation.navigate('UserProfile', { username: friend.username })}
                >
                  {friend.avatar_url ? (
                    <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
                  ) : (
                    <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
                      <Ionicons name="person" size={14} color={Colors.textMuted} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.sectionSeparator} />
          </View>
        )}

        {/* Reviews */}
        <GameReviews gameId={gameId} refreshKey={reviewsRefreshKey} />

        {/* About */}
        {game.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.summaryText}>{game.summary}</Text>
            <View style={styles.sectionSeparator} />
          </View>
        )}

        {/* Live on Twitch */}
        <TwitchStreamsSection gameName={game.name} />

        {/* Trailers */}
        {game.videos && game.videos.length > 0 && (
          <TrailerSection videos={game.videos} />
        )}

        {/* Similar games */}
        {game.similarGames && game.similarGames.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similar games</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarGamesRow}
            >
              {game.similarGames.map((similarGame) => (
                <TouchableOpacity
                  key={similarGame.id}
                  style={styles.similarGameCard}
                  onPress={() => navigation.push('GameDetail', { gameId: similarGame.id })}
                >
                  {similarGame.coverUrl ? (
                    <Image source={{ uri: similarGame.coverUrl }} style={styles.similarGameCover} />
                  ) : (
                    <View style={[styles.similarGameCover, styles.similarGamePlaceholder]}>
                      <SweatDropIcon size={24} variant="static" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.sectionSeparator} />
          </View>
        )}

        {/* Platforms */}
        {game.platforms && game.platforms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Platforms</Text>
            <Text style={styles.platformsText}>{game.platforms.join(', ')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Log Game Modal */}
      <LogGameModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        game={game}
        existingLog={userLog}
        onSaveSuccess={handleLogSaveSuccess}
      />

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  headerFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    fontSize: FontSize.md,
    marginTop: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  gameInfo: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  cover: {
    width: 120,
    height: 160,
    borderRadius: BorderRadius.md,
  },
  coverPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  year: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  genres: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  statusText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  statusRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Rating Pills
  ratingPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  ratingPillScore: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.sm,
  },
  ratingPillText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  platformsText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.lg,
  },
  // Friends who played styles
  friendsSection: {
    marginBottom: Spacing.lg,
  },
  friendsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  friendAvatarPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Similar Games styles
  similarGamesRow: {
    gap: Spacing.sm,
  },
  similarGameCard: {
    width: 105,
  },
  similarGameCover: {
    width: 105,
    height: 140,
    borderRadius: BorderRadius.sm,
  },
  similarGamePlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
