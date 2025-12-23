import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl, STATUS_LABELS, API_CONFIG } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MainStackParamList } from '../navigation'

type Props = NativeStackScreenProps<MainStackParamList, 'GameDetail'>

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const HEADER_HEIGHT = 250

interface GameDetails {
  id: number
  name: string
  slug?: string
  summary?: string
  coverUrl?: string
  cover_url?: string
  artworkUrls?: string[]
  screenshotUrls?: string[]
  firstReleaseDate?: string
  first_release_date?: string
  genres?: string[]
  platforms?: string[]
  rating?: number
}

interface UserGameLog {
  id: string
  status: string
  rating: number | null
  platform: string | null
}

interface CommunityRating {
  averageRating: number
  count: number
}

export default function GameDetailScreen({ navigation, route }: Props) {
  const { gameId } = route.params
  const { user } = useAuth()

  const [game, setGame] = useState<GameDetails | null>(null)
  const [userLog, setUserLog] = useState<UserGameLog | null>(null)
  const [communityRating, setCommunityRating] = useState<CommunityRating | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showFullSummary, setShowFullSummary] = useState(false)

  useEffect(() => {
    fetchGameDetails()
    if (user) {
      fetchUserLog()
      fetchCommunityRating()
    }
  }, [gameId, user])

  const fetchGameDetails = async () => {
    try {
      // First try to get from cache
      const { data: cached } = await supabase
        .from('games_cache')
        .select('*')
        .eq('id', gameId)
        .single()

      if (cached) {
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
        return
      }

      // If not cached, fetch from API
      const response = await fetch(`${API_CONFIG.baseUrl}/api/games/${gameId}`)
      if (response.ok) {
        const data = await response.json()
        setGame(data.game)
      }
    } catch (error) {
      console.error('Error fetching game:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserLog = async () => {
    if (!user) return
    const { data } = await supabase
      .from('game_logs')
      .select('id, status, rating, platform')
      .eq('user_id', user.id)
      .eq('game_id', gameId)
      .single()

    if (data) {
      setUserLog(data)
    }
  }

  const fetchCommunityRating = async () => {
    const { data } = await supabase
      .from('game_logs')
      .select('rating')
      .eq('game_id', gameId)
      .not('rating', 'is', null)

    if (data && data.length > 0) {
      const ratings = data.map((d) => d.rating as number)
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
      setCommunityRating({
        averageRating: Math.round(avg * 10) / 10,
        count: ratings.length,
      })
    }
  }

  const getCoverUrl = () => {
    const url = game?.coverUrl || game?.cover_url
    return url ? getIGDBImageUrl(url, 'coverBig') : null
  }

  const getBackgroundUrl = () => {
    // Try artwork first, then screenshot, then cover
    if (game?.artworkUrls && game.artworkUrls.length > 0) {
      return getIGDBImageUrl(game.artworkUrls[0], 'hd')
    }
    if (game?.screenshotUrls && game.screenshotUrls.length > 0) {
      return getIGDBImageUrl(game.screenshotUrls[0], 'hd')
    }
    const cover = game?.coverUrl || game?.cover_url
    return cover ? getIGDBImageUrl(cover, 'hd') : null
  }

  const getReleaseYear = () => {
    const date = game?.firstReleaseDate || game?.first_release_date
    if (!date) return null
    return new Date(date).getFullYear()
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    )
  }

  if (!game) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Game not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const coverUrl = getCoverUrl()
  const backgroundUrl = getBackgroundUrl()
  const releaseYear = getReleaseYear()
  const summary = game.summary || ''
  const shouldTruncate = summary.length > 300

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        {/* Header Image */}
        <View style={styles.headerContainer}>
          {backgroundUrl ? (
            <Image source={{ uri: backgroundUrl }} style={styles.headerImage} />
          ) : (
            <View style={[styles.headerImage, styles.headerPlaceholder]} />
          )}
          <LinearGradient
            colors={['transparent', Colors.background]}
            style={styles.headerGradient}
          />
        </View>

        {/* Back Button */}
        <SafeAreaView style={styles.backButtonContainer} edges={['top']}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Game Info */}
        <View style={styles.gameInfo}>
          {/* Cover */}
          <View style={styles.coverContainer}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons name="game-controller" size={40} color={Colors.textDim} />
              </View>
            )}
          </View>

          {/* Title and Meta */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{game.name}</Text>
            <View style={styles.metaRow}>
              {releaseYear && (
                <Text style={styles.metaText}>{releaseYear}</Text>
              )}
              {game.platforms && game.platforms.length > 0 && (
                <Text style={styles.metaText} numberOfLines={1}>
                  {game.platforms.slice(0, 3).join(' • ')}
                </Text>
              )}
            </View>
            {game.genres && game.genres.length > 0 && (
              <View style={styles.genresRow}>
                {game.genres.slice(0, 3).map((genre, index) => (
                  <View key={index} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* User Status */}
        {userLog && (
          <View style={styles.userStatus}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
            <Text style={styles.userStatusText}>
              {STATUS_LABELS[userLog.status] || userLog.status}
              {userLog.rating && ` • ★ ${userLog.rating}`}
            </Text>
          </View>
        )}

        {/* Action Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => {
              // TODO: Open log game modal
              console.log('Log game:', gameId)
            }}
          >
            <Ionicons
              name={userLog ? 'create-outline' : 'add-circle-outline'}
              size={20}
              color={Colors.background}
            />
            <Text style={styles.logButtonText}>
              {userLog ? 'Edit Log' : 'Log Game'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.summaryText}>
              {showFullSummary || !shouldTruncate
                ? summary
                : `${summary.slice(0, 300)}...`}
            </Text>
            {shouldTruncate && (
              <TouchableOpacity onPress={() => setShowFullSummary(!showFullSummary)}>
                <Text style={styles.readMore}>
                  {showFullSummary ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Community Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Rating</Text>
          {communityRating ? (
            <View style={styles.ratingContainer}>
              <View style={styles.ratingBig}>
                <Ionicons name="star" size={24} color={Colors.accent} />
                <Text style={styles.ratingValue}>{communityRating.averageRating}</Text>
              </View>
              <Text style={styles.ratingCount}>
                Based on {communityRating.count} {communityRating.count === 1 ? 'rating' : 'ratings'}
              </Text>
            </View>
          ) : (
            <Text style={styles.noRatings}>No ratings yet</Text>
          )}
        </View>

        {/* Reviews Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <Text style={styles.placeholder}>Reviews coming soon...</Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    marginBottom: Spacing.md,
  },
  backLink: {
    color: Colors.accent,
    fontSize: FontSize.md,
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    width: SCREEN_WIDTH,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerPlaceholder: {
    backgroundColor: Colors.surface,
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: Spacing.sm,
    marginLeft: Spacing.md,
    marginTop: Spacing.sm,
  },
  gameInfo: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginTop: -60,
  },
  coverContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  titleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    paddingTop: 70,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    marginBottom: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  genreTag: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  genreText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  userStatusText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '500',
  },
  actionSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  logButton: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  logButtonText: {
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  readMore: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    marginTop: Spacing.sm,
  },
  ratingContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  ratingBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  ratingCount: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  noRatings: {
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  placeholder: {
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  bottomPadding: {
    height: Spacing.xxl,
  },
})
