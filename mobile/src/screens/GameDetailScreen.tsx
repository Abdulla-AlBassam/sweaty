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
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl, STATUS_LABELS, API_CONFIG } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MainStackParamList } from '../navigation'
import LogGameModal from '../components/LogGameModal'
import GameReviews from '../components/GameReviews'
import StarRating from '../components/StarRating'
import TrailerSection from '../components/TrailerSection'
import { GameDetailSkeleton } from '../components/skeletons'

type Props = NativeStackScreenProps<MainStackParamList, 'GameDetail'>

interface GameVideo {
  videoId: string
  name: string
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

  const [game, setGame] = useState<GameDetails | null>(null)
  const [userLog, setUserLog] = useState<UserGameLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

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

      // Always fetch from API to get videos (cache doesn't store them)
      try {
        const response = await fetch(`${API_CONFIG.baseUrl}/api/games/${gameId}/details`)
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
    // Refresh the user's log and reviews after saving
    fetchUserLog()
    setReviewsRefreshKey(prev => prev + 1)
  }, [fetchUserLog])

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      fetchGameDetails(),
      fetchUserLog(),
    ])
    setReviewsRefreshKey(prev => prev + 1)
    setRefreshing(false)
  }, [fetchUserLog])

  const getCoverUrl = () => {
    const url = game?.coverUrl || game?.cover_url
    return url ? getIGDBImageUrl(url, 'coverBig2x') : null
  }

  const getReleaseYear = () => {
    const date = game?.firstReleaseDate || game?.first_release_date
    if (!date) return null
    return new Date(date).getFullYear()
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
          <Ionicons name="game-controller-outline" size={64} color={Colors.textDim} />
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
              <Ionicons name="game-controller" size={40} color={Colors.textDim} />
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

        {/* Action Button */}
        <TouchableOpacity
          style={styles.logButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons
            name={userLog ? 'create-outline' : 'add'}
            size={userLog ? 24 : 28}
            color={Colors.background}
          />
        </TouchableOpacity>

        {/* Reviews */}
        <GameReviews gameId={gameId} refreshKey={reviewsRefreshKey} />

        {/* About */}
        {game.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.summaryText}>{game.summary}</Text>
          </View>
        )}

        {/* Trailers */}
        {game.videos && game.videos.length > 0 && (
          <TrailerSection videos={game.videos} />
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
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
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
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  year: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  genres: {
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
    fontSize: FontSize.sm,
    color: Colors.accentLight,
    fontWeight: '500',
  },
  statusRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logButton: {
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  platformsText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
})
