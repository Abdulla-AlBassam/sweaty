import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  Easing,
  LayoutAnimation,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import LoadingSpinner from '../components/LoadingSpinner'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useScrollToTop } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import { MainStackParamList } from '../navigation'
import { Ionicons } from '@expo/vector-icons'

type NavigationProp = NativeStackNavigationProp<MainStackParamList>
import { useGameLogs, useCuratedLists, useCommunityReviews } from '../hooks/useSupabase'
import { useFriendsPlaying } from '../hooks/useFriendsPlaying'
import { useBecauseYouLoved, useFriendsFavorites } from '../hooks/useRecommendations'
import { usePlatformFilter } from '../hooks/usePlatformFilter'
import { useHeroBanners } from '../hooks/useHeroBanners'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import CuratedListRow from '../components/CuratedListRow'
import SweatDropIcon from '../components/SweatDropIcon'
import PressableScale from '../components/PressableScale'
import StackedAvatars from '../components/StackedAvatars'
import WatchSection from '../components/WatchSection'
import Skeleton from '../components/Skeleton'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ── COLOR SCHEME TEST ──────────────────────────────────────
// Temporary overrides to preview a warmer, lighter palette.
// Only affects DashboardScreen. Delete this block to revert.
const TestBg = {
  background: '#1A1A1C',         // Warm dark gray (was #0A0A0A)
  surface: '#2A2A2E',            // Elevated surface (was #151515)
  surfaceLight: '#333338',       // Brighter surface (was #1E1E1E)
  alternate: '#1E1E21',          // Alternating section bg
  gradientEnd: 'rgba(26, 26, 28, 0.85)',
  gradientStart: 'rgba(26, 26, 28, 0.6)',
  // Text bumped for contrast on lighter bg
  textDim: '#999999',            // Was #808080 — now 4.5:1 on new bg
  textMuted: '#A3A3A3',          // Was #8E8E8E — now 5:1 on new bg
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
}
// ── END COLOR SCHEME TEST ─────────────────────────────────

// Background colors for section groups
const SectionBg = {
  base: TestBg.background,
  alternate: TestBg.alternate,
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)
  const { user, profile } = useAuth()
  const { logs, refetch: refetchLogs } = useGameLogs(user?.id)

  // Platform filter for content filtering
  const { platforms, excludePcOnly } = usePlatformFilter()

  // Curated lists with PC-only filter
  const { lists: curatedLists, isLoading: listsLoading, refetch: refetchLists } = useCuratedLists(excludePcOnly)

  // Friends playing
  const { games: friendsPlaying, isLoading: friendsLoading, refetch: refetchFriends } = useFriendsPlaying(user?.id)

  // Personalized recommendations (filtered by user's platform preferences and PC-only setting)
  const { basedOnGame, recommendations: becauseYouLovedGames, isLoading: lovedLoading, refetch: refetchLoved } = useBecauseYouLoved(user?.id, platforms, excludePcOnly)
  const { games: friendsFavorites, isLoading: favoritesLoading, refetch: refetchFavorites } = useFriendsFavorites(user?.id)

  // Community activity (recent reviews)
  const { reviews: communityReviews, isLoading: communityLoading, refetch: refetchCommunity } = useCommunityReviews()

  // Hero banners for featured screenshots
  const { currentBanner, shuffleBanner, refetch: refetchBanners } = useHeroBanners()

  const [refreshing, setRefreshing] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  // Refresh logo animation
  const refreshOpacity = useRef(new Animated.Value(0)).current
  const refreshScale = useRef(new Animated.Value(0.3)).current
  const refreshFlip = useRef(new Animated.Value(0)).current
  const refreshFlipLoop = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (refreshing) {
      // Pop in
      Animated.parallel([
        Animated.timing(refreshOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(refreshScale, { toValue: 1, tension: 150, friction: 8, useNativeDriver: true }),
      ]).start()

      // Continuous flip
      refreshFlip.setValue(0)
      refreshFlipLoop.current = Animated.loop(
        Animated.timing(refreshFlip, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        })
      )
      refreshFlipLoop.current.start()
    } else {
      // Stop flip + pop out
      refreshFlipLoop.current?.stop()
      Animated.parallel([
        Animated.timing(refreshOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.spring(refreshScale, { toValue: 1.3, tension: 200, friction: 10, useNativeDriver: true }),
      ]).start(() => {
        refreshScale.setValue(0.3)
        refreshFlip.setValue(0)
      })
    }
  }, [refreshing])

  const refreshRotateY = refreshFlip.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Custom pull-to-refresh: track scroll position
  const PULL_THRESHOLD = 70
  const REFRESH_HEIGHT = 60
  const scrollY = useRef(new Animated.Value(0)).current

  // Pull-phase animations driven by scroll position (before refresh triggers)
  const pullOpacity = scrollY.interpolate({
    inputRange: [-PULL_THRESHOLD, -15, 0],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  })
  const pullScale = scrollY.interpolate({
    inputRange: [-PULL_THRESHOLD, -10, 0],
    outputRange: [1, 0.3, 0.1],
    extrapolate: 'clamp',
  })
  const pullRotateY = scrollY.interpolate({
    inputRange: [-PULL_THRESHOLD * 2, 0],
    outputRange: ['360deg', '0deg'],
    extrapolate: 'clamp',
  })

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.setValue(e.nativeEvent.contentOffset.y)
  }, [scrollY])

  const handleScrollEndDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y < -PULL_THRESHOLD && !refreshing) {
      onRefresh()
    }
  }, [refreshing, onRefresh])

  // Pulsing animation for "Currently Playing" indicator
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  const onRefresh = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setRefreshing(true)
    setRefreshCount((prev) => prev + 1) // Trigger news shuffle
    shuffleBanner() // Show a different hero banner
    await Promise.all([
      refetchLogs(),
      refetchLists(),
      refetchFriends(),
      refetchLoved(),
      refetchFavorites(),
      refetchCommunity(),
    ])
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setRefreshing(false)
  }, [refetchLogs, refetchLists, refetchFriends, refetchLoved, refetchFavorites, refetchCommunity, shuffleBanner])


  // Currently playing games
  const currentlyPlaying = useMemo(() => {
    return logs
      .filter((l) => l.status === 'playing')
      .slice(0, 10)
  }, [logs])

  // Get 2025 Essentials curated list (or first available)
  const featuredCuratedList = useMemo(() => {
    const essentials = curatedLists.find(list => list.slug === '2025-essentials')
    return essentials || curatedLists[0] || null
  }, [curatedLists])

  const handleGamePress = (gameId: number) => {
    navigation.navigate('GameDetail', { gameId })
  }

  // Skeleton for horizontal game rows
  const HorizontalSkeleton = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalScroll}
    >
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} width={105} height={140} borderRadius={BorderRadius.md} />
      ))}
    </ScrollView>
  )

  // Section Group Header
  const SectionGroupHeader = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
    <View style={styles.groupHeader}>
      <Text style={styles.groupHeaderText}>{title}</Text>
      {onSeeAll && (
        <PressableScale onPress={onSeeAll} haptic="light" accessibilityLabel={'See all ' + title} accessibilityRole="button" accessibilityHint="Shows all items in this section">
          <Ionicons name="chevron-forward" size={20} color={Colors.cream} />
        </PressableScale>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
      >
        {/* Custom refresh indicator — negative margin hides it above content.
            Pull-down rubber-band reveals it. LayoutAnimation expands space during refresh. */}
        <View style={[styles.refreshContainer, {
          height: REFRESH_HEIGHT + insets.top,
          paddingTop: insets.top,
          marginTop: refreshing ? 0 : -(REFRESH_HEIGHT + insets.top),
        }]}>
          <Animated.View
            style={{
              opacity: refreshing ? refreshOpacity : pullOpacity,
              transform: [
                { scale: refreshing ? refreshScale : pullScale },
                { perspective: 800 },
                { rotateY: refreshing ? refreshRotateY : pullRotateY },
              ],
            }}
            pointerEvents="none"
          >
            <SweatDropIcon size={32} isRefreshing={refreshing} variant="static" />
          </Animated.View>
        </View>

        {/* Hero Banner - Featured Game Screenshot (edge-to-edge, behind status bar) */}
        {currentBanner && (
          <PressableScale
            style={[styles.heroBannerContainer, { height: SCREEN_HEIGHT * 0.30 + insets.top }]}
            onPress={() => handleGamePress(currentBanner.game_id)}
            haptic="light"
            scale={0.99}
            accessibilityLabel={currentBanner.game_name}
            accessibilityRole="button"
            accessibilityHint="Opens game details"
          >
            <Image
              source={{ uri: currentBanner.screenshot_url }}
              style={styles.heroBannerImage}
              resizeMode="cover"
              accessibilityLabel={currentBanner.game_name + ' screenshot'}
            />
            {/* Top gradient for containment */}
            <LinearGradient
              colors={[TestBg.gradientStart, 'transparent']}
              style={styles.heroBannerGradientTop}
            />
            {/* Bottom gradient for page continuation */}
            <LinearGradient
              colors={['transparent', TestBg.gradientEnd, TestBg.background]}
              locations={[0, 0.6, 1]}
              style={styles.heroBannerGradient}
            />
            {/* Game name - subtle, bottom right */}
            <View style={styles.heroBannerContent}>
              <Text style={styles.heroBannerGameName}>{currentBanner.game_name}</Text>
            </View>
          </PressableScale>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* YOUR GAMES Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        {currentlyPlaying.length > 0 && (
          <View style={[styles.sectionGroup, { backgroundColor: SectionBg.base, paddingTop: currentBanner ? Spacing.lg : Spacing.lg + insets.top, marginTop: currentBanner ? -70 : 0, zIndex: 1 }]}>
            <SectionGroupHeader title="Your Games" />

            {/* NOW PLAYING */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Now Playing</Text>
                  <Animated.View style={[styles.pulsingDot, { opacity: pulseAnim }]} />
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {currentlyPlaying.map((log: any) => {
                  const game = log.games_cache
                  if (!game) return null
                  const coverUrl = game.cover_url
                    ? getIGDBImageUrl(game.cover_url, 'coverBig2x')
                    : null
                  return (
                    <PressableScale
                      key={log.id}
                      onPress={() => handleGamePress(game.id)}
                      haptic="light"
                      scale={0.95}
                      accessibilityLabel={game.name}
                      accessibilityRole="button"
                      accessibilityHint="Opens game details"
                    >
                      {coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={styles.gameCover} accessibilityLabel={game.name + ' cover art'} />
                      ) : (
                        <View style={[styles.gameCover, styles.coverPlaceholder]}>
                          <Text style={styles.placeholderText}>?</Text>
                        </View>
                      )}
                    </PressableScale>
                  )
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* SOCIAL Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={[styles.sectionGroup, { backgroundColor: SectionBg.alternate, paddingTop: (!currentBanner && currentlyPlaying.length === 0) ? Spacing.lg + insets.top : Spacing.lg, marginTop: (currentBanner && currentlyPlaying.length === 0) ? -70 : 0, zIndex: 1 }]}>
          <SectionGroupHeader title="Social" />

          {/* FRIENDS ARE PLAYING */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Friends Are Playing</Text>
            </View>
            {friendsLoading ? (
              <HorizontalSkeleton />
            ) : friendsPlaying.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {friendsPlaying.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.friendsGameCard}
                    onPress={() => handleGamePress(game.id)}
                    activeOpacity={0.8}
                    accessibilityLabel={game.name}
                    accessibilityRole="button"
                    accessibilityHint="Opens game details"
                  >
                    <Image
                      source={{ uri: getIGDBImageUrl(game.cover_url) }}
                      style={styles.gameCover}
                      accessibilityLabel={game.name + ' cover art'}
                    />
                    <StackedAvatars users={game.friends} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>
                  None of your friends are playing right now.{'\n'}
                  <Text style={styles.emptyStateLink} onPress={() => navigation.navigate('Search')} accessibilityRole="link">
                    Find people to follow
                  </Text>
                </Text>
              </View>
            )}
          </View>

          {/* FRIENDS' FAVORITES */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Friends' Favorites</Text>
              {friendsFavorites.length > 10 && (
                <PressableScale
                  onPress={() => navigation.navigate('CuratedListDetail', {
                    listSlug: 'friends-favorites',
                    listTitle: "Friends' Favorites",
                    gameIds: friendsFavorites.map(g => g.id),
                    games: friendsFavorites.map(g => ({
                      id: g.id,
                      name: g.name,
                      cover_url: g.coverUrl,
                    })),
                  })}
                  haptic="light"
                  accessibilityLabel={"See all Friends' Favorites"}
                  accessibilityRole="button"
                  accessibilityHint="Shows all items in this section"
                >
                  <Ionicons name="chevron-forward" size={20} color={Colors.cream} />
                </PressableScale>
              )}
            </View>
            {favoritesLoading ? (
              <HorizontalSkeleton />
            ) : friendsFavorites.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {friendsFavorites.slice(0, 10).map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.friendsGameCard}
                    onPress={() => handleGamePress(game.id)}
                    activeOpacity={0.8}
                    accessibilityLabel={game.name}
                    accessibilityRole="button"
                    accessibilityHint="Opens game details"
                  >
                    <Image
                      source={{ uri: getIGDBImageUrl(game.coverUrl) }}
                      style={styles.gameCover}
                      accessibilityLabel={game.name + ' cover art'}
                    />
                    <StackedAvatars users={game.friends} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>
                  Follow people to see their favorite games here.{'\n'}
                  <Text style={styles.emptyStateLink} onPress={() => navigation.navigate('Search')} accessibilityRole="link">
                    Find people to follow
                  </Text>
                </Text>
              </View>
            )}
          </View>

            {/* COMMUNITY ACTIVITY */}
            {(communityLoading || communityReviews.length > 0) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Community Activity</Text>
                </View>
                {communityLoading ? (
                  <HorizontalSkeleton />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {communityReviews.slice(0, 10).map((review) => (
                      <PressableScale
                        key={review.id}
                        onPress={() => handleGamePress(review.game.id)}
                        haptic="light"
                        scale={0.95}
                        style={styles.communityCard}
                        accessibilityLabel={(review.user.display_name || review.user.username) + ' review of ' + review.game.name}
                        accessibilityRole="button"
                        accessibilityHint="Opens game details"
                      >
                        <Image
                          source={{ uri: getIGDBImageUrl(review.game.cover_url) }}
                          style={styles.communityCover}
                          accessibilityLabel={review.game.name + ' cover art'}
                        />
                        <View style={styles.communityContent}>
                          <View style={styles.communityHeader}>
                            {review.user.avatar_url ? (
                              <Image
                                source={{ uri: review.user.avatar_url }}
                                style={styles.communityAvatar}
                                accessibilityLabel={(review.user.display_name || review.user.username) + ' avatar'}
                              />
                            ) : (
                              <View style={[styles.communityAvatar, styles.avatarPlaceholder]}>
                                <Ionicons name="person" size={10} color={TestBg.textDim} />
                              </View>
                            )}
                            <Text style={styles.communityUsername} numberOfLines={1}>
                              {review.user.display_name || review.user.username}
                            </Text>
                            {review.rating && (
                              <View style={styles.communityRating}>
                                <Ionicons name="star" size={10} color={Colors.gold} />
                                <Text style={styles.communityRatingText}>{review.rating}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.communityReviewText} numberOfLines={2}>
                            {review.review}
                          </Text>
                          <Text style={styles.communityGameName} numberOfLines={1}>
                            {review.game.name}
                          </Text>
                        </View>
                      </PressableScale>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* FOR YOU Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={[styles.sectionGroup, { backgroundColor: SectionBg.base }]}>
          <SectionGroupHeader title="For You" />

          {/* BECAUSE YOU LOVED */}
          {(lovedLoading || (basedOnGame && becauseYouLovedGames.length > 0)) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.forYouTitle}>
                  Because You Loved{' '}
                  <Text style={styles.accentText}>{basedOnGame?.name || '...'}</Text>
                </Text>
                {becauseYouLovedGames.length > 10 && (
                  <PressableScale
                    onPress={() => navigation.navigate('CuratedListDetail', {
                      listSlug: 'because-you-loved',
                      listTitle: `Because You Loved ${basedOnGame?.name || ''}`,
                      gameIds: becauseYouLovedGames.map(g => g.id),
                      games: becauseYouLovedGames,
                    })}
                    haptic="light"
                    accessibilityLabel={'See all Because You Loved ' + (basedOnGame?.name || '')}
                    accessibilityRole="button"
                    accessibilityHint="Shows all items in this section"
                  >
                    <Ionicons name="chevron-forward" size={20} color={Colors.cream} />
                  </PressableScale>
                )}
              </View>
              {lovedLoading ? (
                <HorizontalSkeleton />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {becauseYouLovedGames.slice(0, 10).map((game) => (
                    <PressableScale
                      key={game.id}
                      onPress={() => handleGamePress(game.id)}
                      haptic="light"
                      scale={0.95}
                      accessibilityLabel={game.name}
                      accessibilityRole="button"
                      accessibilityHint="Opens game details"
                    >
                      <Image
                        source={{ uri: getIGDBImageUrl(game.coverUrl) }}
                        style={styles.gameCover}
                        accessibilityLabel={game.name + ' cover art'}
                      />
                    </PressableScale>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* 2025 ESSENTIALS */}
          {listsLoading ? (
            <View style={styles.listsLoading}>
              <LoadingSpinner size="large" />
            </View>
          ) : featuredCuratedList ? (
            <CuratedListRow list={featuredCuratedList} />
          ) : null}
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* WATCH Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={[styles.sectionGroup, { backgroundColor: SectionBg.alternate }]}>
          <SectionGroupHeader title="Watch" onSeeAll={() => navigation.navigate('Watch' as never)} />

          {/* YouTube Videos (header hidden - parent group says "Watch") */}
          <WatchSection refreshKey={refreshCount} showHeader={false} />
        </View>
      </ScrollView>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TestBg.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl, // 48px bottom padding (above tab bar)
  },
  refreshContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Hero Banner - Cinematic full-width at top
  heroBannerContainer: {
    // Height set dynamically: SCREEN_HEIGHT * 0.38 + insets.top
    position: 'relative',
  },
  heroBannerImage: {
    width: '100%',
    height: '100%',
  },
  heroBannerGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  heroBannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  heroBannerContent: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: 'flex-end',
  },
  heroBannerGameName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    textShadowColor: Colors.overlayDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Section Groups
  sectionGroup: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.cream,
    marginBottom: Spacing.md,
  },
  groupHeaderText: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.cream,
    lineHeight: 26,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 21,
    flex: 1,
    marginRight: Spacing.sm,
  },
  forYouTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 21,
    flex: 1,
    marginRight: Spacing.sm,
  },
  accentText: {
    color: Colors.cyanSoft,
  },
  seeAllText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.cream,
    lineHeight: 17,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D6B4A',
  },
  // Horizontal scroll
  horizontalScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.cardGap,
  },
  // Game covers
  gameCover: {
    width: 105,
    height: 140,
    borderRadius: BorderRadius.md,
    backgroundColor: TestBg.surface,
    borderWidth: 1,
    borderColor: TestBg.borderSubtle,
    shadowColor: TestBg.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: FontSize.xxl,
    color: TestBg.textDim,
  },
  // Friends game card with avatar overlay
  friendsGameCard: {
    position: 'relative',
    width: 105,
  },
  // Empty state for sections
  emptyStateContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.lg,
  },
  emptyStateText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: TestBg.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateLink: {
    color: Colors.accent,
    fontFamily: Fonts.bodyMedium,
  },
  // Loading
  listsLoading: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  // Community Activity Cards
  communityCard: {
    width: 220,
    backgroundColor: TestBg.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TestBg.borderSubtle,
  },
  communityCover: {
    width: '100%',
    height: 80,
    backgroundColor: TestBg.surfaceLight,
  },
  communityContent: {
    padding: Spacing.sm,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  communityAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  avatarPlaceholder: {
    backgroundColor: TestBg.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityUsername: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xxs,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  communityRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: Spacing.xs,
  },
  communityRatingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xxs,
    color: Colors.gold,
    lineHeight: 15,
  },
  communityReviewText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text,
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },
  communityGameName: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xxs,
    color: TestBg.textMuted,
    lineHeight: 15,
  },
})
