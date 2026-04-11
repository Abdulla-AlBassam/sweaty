import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Linking,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import SweatDropIcon from '../components/SweatDropIcon'
import PressableScale from '../components/PressableScale'
import EsrbBadge from '../components/EsrbBadge'
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
import StarRating from '../components/StarRating'
import TrailerSection from '../components/TrailerSection'
import TwitchStreamsSection from '../components/TwitchStreamsSection'
import GameReviews from '../components/GameReviews'
import { GameDetailSkeleton } from '../components/skeletons'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BANNER_HEIGHT = SCREEN_WIDTH * 0.75


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

interface StoreLink {
  storeId: number
  name: string
  url: string
}

interface RawgEnrichment {
  rawgId: number | null
  rawgSlug: string | null
  metacritic: number | null
  playtimeHours: number | null
  releasedDate: string | null
  esrbRating: string | null
  gameModes: string[]
  stores: StoreLink[]
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
  screenshotUrl?: string | null
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
  const insets = useSafeAreaInsets()

  const [game, setGame] = useState<GameDetails | null>(null)
  const [rawg, setRawg] = useState<RawgEnrichment | null>(null)
  const [userLog, setUserLog] = useState<UserGameLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0)
  const [coverOverlayVisible, setCoverOverlayVisible] = useState(false)
  const coverOverlayOpacity = useRef(new Animated.Value(0)).current
  const coverModalScale = useRef(new Animated.Value(0.3)).current
  const scrollY = useRef(new Animated.Value(0)).current

  // Fetch ratings data
  const { data: openCriticData } = useOpenCritic(gameId, game?.name || '')
  const { stats: communityStats, refetch: refetchCommunityStats } = useCommunityStats(gameId)

  // Fetch friends who played this game
  const { friends: friendsWhoPlayed } = useFriendsWhoPlayed(gameId, user?.id)

  // Fetch reviewers for avatar row
  const [reviewers, setReviewers] = useState<Array<{
    id: string
    rating: number | null
    review: string
    user: { id: string; username: string; display_name: string | null; avatar_url: string | null }
  }>>([])

  const fetchReviewers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('game_logs')
        .select(`id, rating, review, user:profiles!user_id(id, username, display_name, avatar_url)`)
        .eq('game_id', gameId)
        .not('review', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) {
        setReviewers(data.map((item: any) => ({
          ...item,
          user: Array.isArray(item.user) ? item.user[0] : item.user,
        })).filter((item: any) => item.user && item.review))
      }
    } catch {}
  }, [gameId])

  useEffect(() => {
    fetchGameDetails()
    fetchReviewers()
  }, [gameId])

  // Fetch RAWG enrichment (Metacritic, playtime, ESRB, stores, game modes, exact date)
  // once we have the core game info. Failures return silently so the screen degrades.
  useEffect(() => {
    if (!game?.name) return
    const slug = game.slug || ''
    const releaseDateRaw = game.firstReleaseDate || game.first_release_date
    const year = releaseDateRaw ? new Date(releaseDateRaw).getFullYear() : ''
    const url = `${API_CONFIG.baseUrl}/api/games/${gameId}/rawg?name=${encodeURIComponent(game.name)}&slug=${encodeURIComponent(slug)}&year=${year}`
    let cancelled = false
    fetch(url)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data || typeof data !== 'object') return
        setRawg(data as RawgEnrichment)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [gameId, game?.name, game?.slug, game?.firstReleaseDate, game?.first_release_date])

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
    fetchReviewers()
    refetchCommunityStats()
    setReviewRefreshKey(k => k + 1)
  }, [fetchUserLog, fetchReviewers, refetchCommunityStats])

  const openCoverModal = useCallback(() => {
    setCoverOverlayVisible(true)
    coverOverlayOpacity.setValue(0)
    coverModalScale.setValue(0.3)
    Animated.parallel([
      Animated.timing(coverOverlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(coverModalScale, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start()
  }, [coverOverlayOpacity, coverModalScale])

  const closeCoverModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(coverOverlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(coverModalScale, {
        toValue: 0.3,
        friction: 10,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start(() => setCoverOverlayVisible(false))
  }, [coverOverlayOpacity, coverModalScale])

  // Pull-to-refresh handler
  const getCoverUrl = () => {
    const url = game?.coverUrl || game?.cover_url
    return url ? getIGDBImageUrl(url, 'coverBig2x') : null
  }

  const getReleaseYear = () => {
    const date = game?.firstReleaseDate || game?.first_release_date
    if (!date) return null
    return new Date(date).getFullYear()
  }

  // Prefer RAWG exact date when available, otherwise fall back to the IGDB date.
  // Formatted in British style (e.g., "24 March 2023").
  const getFormattedReleaseDate = () => {
    const raw =
      rawg?.releasedDate || game?.firstReleaseDate || game?.first_release_date
    if (!raw) return null
    try {
      return new Date(raw).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }

  // Metacritic band colour (green 75+, yellow 50-74, red <50), matching
  // Metacritic's own conventions so users read it instantly.
  const getMetacriticColor = (score: number) => {
    if (score >= 75) return Colors.openCriticMighty
    if (score >= 50) return Colors.openCriticFair
    return Colors.openCriticWeak
  }

  const openStore = (url: string) => {
    Linking.openURL(url).catch(() => {})
  }

  // Map RAWG store_id to a brand icon. Unknowns fall back to a neutral storefront.
  const renderStoreIcon = (storeId: number) => {
    const size = 22
    const color = Colors.textMuted
    switch (storeId) {
      case 1: // Steam
        return <FontAwesome5 name="steam" size={size} color={color} />
      case 2: // Xbox Store
      case 7: // Xbox 360 Store
        return <FontAwesome5 name="xbox" size={size} color={color} />
      case 3: // PlayStation Store
        return <FontAwesome5 name="playstation" size={size} color={color} />
      case 4: // App Store
        return <FontAwesome5 name="app-store-ios" size={size} color={color} />
      case 6: // Nintendo Store
        return <MaterialCommunityIcons name="nintendo-switch" size={size} color={color} />
      case 8: // Google Play
        return <FontAwesome5 name="google-play" size={size} color={color} />
      case 9: // itch.io
        return <FontAwesome5 name="itch-io" size={size} color={color} />
      default: // GOG, Epic, anything else
        return <Ionicons name="storefront-outline" size={size} color={color} />
    }
  }

  // Get color based on OpenCritic tier
  const getOpenCriticColor = (tier: string | null) => {
    switch (tier) {
      case 'Mighty': return Colors.openCriticMighty
      case 'Strong': return Colors.openCriticStrong
      case 'Fair': return Colors.openCriticFair
      case 'Weak': return Colors.openCriticWeak
      default: return Colors.textMuted
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button" accessibilityHint="Returns to previous screen">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button" accessibilityHint="Returns to previous screen">
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
  const formattedReleaseDate = getFormattedReleaseDate()

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentWithBanner}
        bounces={true}
        overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Hero Banner - stretches on overscroll */}
        {game.screenshotUrl ? (
          <Animated.View style={[styles.bannerContainer, {
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [-200, 0],
                  outputRange: [-100, 0],
                  extrapolateRight: 'clamp',
                }),
              },
              {
                scale: scrollY.interpolate({
                  inputRange: [-200, 0],
                  outputRange: [1.5, 1],
                  extrapolateRight: 'clamp',
                }),
              },
            ],
          }]}>
            <Image
              source={{ uri: game.screenshotUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', Colors.gradientEnd, Colors.background]}
              locations={[0.3, 0.7, 1]}
              style={styles.bannerGradient}
            />
          </Animated.View>
        ) : (
          <View style={styles.bannerSpacer} />
        )}

        <View style={styles.contentBelowBanner}>
        {/* Cover and Info */}
        <View style={styles.gameInfo}>
          <Pressable onPress={coverUrl ? openCoverModal : undefined} accessibilityLabel="Enlarge cover" accessibilityRole="button">
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.cover} accessible={false} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <SweatDropIcon size={40} variant="static" />
              </View>
            )}
          </Pressable>

          <View style={styles.infoContainer}>
            <Text style={styles.title}>{game.name}</Text>
            {formattedReleaseDate && (
              <Text style={styles.year}>{formattedReleaseDate}</Text>
            )}

            {game.genres && game.genres.length > 0 && (
              <Text style={styles.genres}>{game.genres.slice(0, 3).join(', ')}</Text>
            )}
            {game.platforms && game.platforms.length > 0 && (
              <Text style={styles.platformsInline} numberOfLines={2}>{game.platforms.join(', ')}</Text>
            )}

            {/* Ratings Row */}
            <View style={styles.ratingsRow}>
              {openCriticData?.score != null && openCriticData.score >= 0 && (
                <View style={styles.ratingItem}>
                  <Image
                    source={require('../../assets/images/opencritic-icon.png')}
                    style={[styles.ocIcon, { tintColor: getOpenCriticColor(openCriticData.tier) }]}
                    accessible={false}
                  />
                  <Text style={[styles.ratingScore, { color: getOpenCriticColor(openCriticData.tier) }]}>
                    {openCriticData.score}
                  </Text>
                </View>
              )}
              {rawg?.metacritic != null && (
                <View style={styles.ratingItem}>
                  <View style={[styles.metacriticBadge, { borderColor: getMetacriticColor(rawg.metacritic) }]}>
                    <Text style={[styles.metacriticScore, { color: getMetacriticColor(rawg.metacritic) }]}>
                      {rawg.metacritic}
                    </Text>
                  </View>
                </View>
              )}
              {communityStats.averageRating ? (
                <View style={styles.ratingItem}>
                  <SweatDropIcon size={18} variant="static" />
                  <Text style={styles.ratingText}>{communityStats.averageRating}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Game modes chips (singleplayer / multiplayer / co-op) */}
        {rawg && rawg.gameModes.length > 0 && (
          <View style={styles.gameModesRow}>
            {rawg.gameModes.map((mode) => (
              <View key={mode} style={styles.gameModeChip}>
                <Text style={styles.gameModeText}>{mode}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Playtime + ESRB badge — sit directly above the summary */}
        {(rawg?.playtimeHours || rawg?.esrbRating) && (
          <View style={styles.metaIconsRow}>
            {rawg?.playtimeHours ? (
              <View style={styles.metaIconItem}>
                <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.metaIconText}>~{rawg.playtimeHours}h</Text>
              </View>
            ) : null}
            {rawg?.esrbRating ? <EsrbBadge rating={rawg.esrbRating} size={38} /> : null}
          </View>
        )}

        {/* Summary */}
        {game.summary && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSummaryExpanded(!summaryExpanded)}
            style={styles.summarySection}
          >
            <View>
              <Text
                style={styles.summaryText}
                numberOfLines={summaryExpanded ? undefined : 3}
              >
                {game.summary}
              </Text>
              {!summaryExpanded && (
                <LinearGradient
                  colors={['transparent', Colors.background]}
                  style={styles.summaryFade}
                />
              )}
            </View>
            <View style={styles.sectionSeparator} />
          </TouchableOpacity>
        )}

        {/* Played by - unified friends + reviews */}
        {(friendsWhoPlayed.length > 0 || reviewers.length > 0) && (
          <View style={styles.friendsSection}>
            <Text style={styles.sectionTitle}>Played by</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true}>
              {/* Friends first */}
              {friendsWhoPlayed.map((friend) => {
                const friendReview = reviewers.find(r => r.user.id === friend.id)
                return (
                  <TouchableOpacity
                    key={`friend-${friend.id}`}
                    style={styles.playedByItem}
                    onPress={() => friendReview
                      ? navigation.navigate('ReviewDetail', {
                          gameLogId: friendReview.id,
                          gameName: game.name,
                          gameId,
                          coverUrl: coverUrl || undefined,
                        })
                      : navigation.navigate('UserProfile', { username: friend.username })
                    }
                    accessibilityLabel={(friend.display_name || friend.username) + (friendReview ? ' review' : ' profile')}
                    accessibilityRole="button"
                    accessibilityHint={friendReview ? 'Opens review' : 'Opens user profile'}
                  >
                    <View style={styles.playedByAvatarContainer}>
                      {friend.avatar_url ? (
                        <Image source={{ uri: friend.avatar_url }} style={styles.playedByAvatar} accessible={false} />
                      ) : (
                        <View style={[styles.playedByAvatar, styles.friendAvatarPlaceholder]}>
                          <Ionicons name="person" size={16} color={Colors.textMuted} />
                        </View>
                      )}
                      {friendReview && (
                        <View style={styles.reviewBadge}>
                          <Ionicons name="chatbubble-outline" size={14} color={Colors.text} />
                        </View>
                      )}
                    </View>
                    {friend.rating && (
                      <StarRating rating={friend.rating} size={10} filledOnly />
                    )}
                  </TouchableOpacity>
                )
              })}
              {/* Community reviewers (non-friends) */}
              {reviewers
                .filter(r => !friendsWhoPlayed.some(f => f.id === r.user.id))
                .map((reviewer) => (
                  <TouchableOpacity
                    key={`review-${reviewer.id}`}
                    style={styles.playedByItem}
                    onPress={() => navigation.navigate('ReviewDetail', {
                      gameLogId: reviewer.id,
                      gameName: game.name,
                      gameId,
                      coverUrl: coverUrl || undefined,
                    })}
                    accessibilityLabel={(reviewer.user.display_name || reviewer.user.username) + ' review'}
                    accessibilityRole="button"
                    accessibilityHint="Opens review"
                  >
                    <View style={styles.playedByAvatarContainer}>
                      {reviewer.user.avatar_url ? (
                        <Image source={{ uri: reviewer.user.avatar_url }} style={styles.playedByAvatar} accessible={false} />
                      ) : (
                        <View style={[styles.playedByAvatar, styles.friendAvatarPlaceholder]}>
                          <Ionicons name="person" size={16} color={Colors.textMuted} />
                        </View>
                      )}
                      <View style={styles.reviewBadge}>
                        <Ionicons name="chatbubble-outline" size={14} color={Colors.text} />
                      </View>
                    </View>
                    {reviewer.rating && (
                      <StarRating rating={reviewer.rating} size={10} filledOnly />
                    )}
                  </TouchableOpacity>
                ))
              }
            </ScrollView>
            <View style={styles.sectionSeparator} />
          </View>
        )}

        {/* Community Reviews - sorted by most liked */}
        <GameReviews gameId={gameId} gameName={game.name} refreshKey={reviewRefreshKey} />

        {/* Live on Twitch */}
        <TwitchStreamsSection gameName={game.name} />

        {/* Trailers */}
        {game.videos && game.videos.length > 0 && (
          <TrailerSection videos={game.videos} />
        )}

        {/* Where to buy (RAWG stores) — icon-only tiles matching Settings platform tiles */}
        {rawg && rawg.stores.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where to buy</Text>
            <View style={styles.storesRow}>
              {rawg.stores.map((store) => (
                <PressableScale
                  key={store.storeId}
                  style={styles.storeTile}
                  onPress={() => openStore(store.url)}
                  haptic="light"
                  scale={0.94}
                  accessibilityLabel={`Open ${store.name}`}
                  accessibilityRole="link"
                  accessibilityHint="Opens the game in this store"
                >
                  {renderStoreIcon(store.storeId)}
                </PressableScale>
              ))}
            </View>
            <View style={styles.sectionSeparator} />
          </View>
        )}

        {/* Similar games */}
        {game.similarGames && game.similarGames.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Similar games</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarGamesRow}
              nestedScrollEnabled={true}
            >
              {game.similarGames.map((similarGame) => (
                <TouchableOpacity
                  key={similarGame.id}
                  style={styles.similarGameCard}
                  onPress={() => navigation.push('GameDetail', { gameId: similarGame.id })}
                  accessibilityLabel={similarGame.name}
                  accessibilityRole="button"
                  accessibilityHint="Opens game details"
                >
                  {similarGame.coverUrl ? (
                    <Image source={{ uri: similarGame.coverUrl }} style={styles.similarGameCover} accessible={false} />
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

        {/* RAWG attribution (required by their ToS when displaying RAWG data) */}
        {rawg?.rawgId && (
          <TouchableOpacity
            style={styles.rawgAttribution}
            onPress={() => Linking.openURL('https://rawg.io').catch(() => {})}
            accessibilityLabel="Powered by RAWG"
            accessibilityRole="link"
          >
            <Text style={styles.rawgAttributionText}>Powered by RAWG</Text>
          </TouchableOpacity>
        )}

        </View>
      </Animated.ScrollView>

      {/* Floating Header - overlaid on banner */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + Spacing.xs }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.floatingButton} accessibilityLabel="Go back" accessibilityRole="button" accessibilityHint="Returns to previous screen">
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="Log this game"
          accessibilityHint="Opens game logging form"
          accessibilityRole="button"
        >
          <Ionicons
            name={userLog ? 'pencil' : 'add'}
            size={18}
            color={Colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Log Game Modal */}
      <LogGameModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        game={game}
        existingLog={userLog}
        onSaveSuccess={handleLogSaveSuccess}
      />

      {/* Enlarged cover overlay */}
      {coverOverlayVisible && (
        <Pressable style={styles.coverOverlay} onPress={closeCoverModal}>
          <Animated.View style={[styles.coverOverlayBackdrop, { opacity: coverOverlayOpacity }]} />
          <Animated.Image
            source={{ uri: coverUrl || '' }}
            style={[styles.coverExpanded, { opacity: coverOverlayOpacity, transform: [{ scale: coverModalScale }] }]}
            resizeMode="contain"
          />
        </Pressable>
      )}

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    zIndex: 10,
  },
  floatingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26, 26, 28, 0.6)',
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  scrollContentWithBanner: {
    paddingBottom: Spacing.xxl,
  },
  bannerContainer: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BANNER_HEIGHT * 0.6,
  },
  bannerSpacer: {
    height: BANNER_HEIGHT,
  },
  contentBelowBanner: {
    paddingHorizontal: Spacing.lg,
    marginTop: -40,
  },
  gameInfo: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  cover: {
    width: SCREEN_WIDTH * 0.3,
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  coverPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: Spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.cream,
    marginBottom: Spacing.xs,
  },
  year: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  genres: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
  },
  platformsInline: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
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
  // Ratings Row
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ocIcon: {
    width: 22,
    height: 22,
  },
  ratingScore: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.md,
  },
  ratingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  // Playtime + ESRB inline icons, sitting above the summary
  metaIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metaIconItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIconText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  // Metacritic score — square badge in the ratings row
  metacriticBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metacriticScore: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.sm,
  },
  // Game modes chips (singleplayer / multiplayer / co-op)
  gameModesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  gameModeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
  },
  gameModeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xxs,
    color: Colors.textMuted,
  },
  // Where to buy — icon-only tiles matching platform tiles on SettingsScreen
  storesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  storeTile: {
    minWidth: 60,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  // RAWG attribution (ToS requirement)
  rawgAttribution: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  rawgAttributionText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xxs,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,
    color: Colors.cream,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  summarySection: {
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  summaryFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 30,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.md,
  },
  // Played by section styles
  friendsSection: {
    marginTop: Spacing.md,
  },
  friendAvatarPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playedByItem: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  playedByAvatarContainer: {
    position: 'relative',
    marginBottom: Spacing.xs,
  },
  playedByAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
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
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
  },
  similarGamePlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  coverOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  coverExpanded: {
    width: SCREEN_WIDTH * 0.75,
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.lg,
  },
})
