import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
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
import { useFriendsFavorites } from '../hooks/useRecommendations'
import { usePlatformFilter } from '../hooks/usePlatformFilter'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import { supabase } from '../lib/supabase'
import CuratedListRow from '../components/CuratedListRow'
import PressableScale from '../components/PressableScale'
import StackedAvatars from '../components/StackedAvatars'
import WatchSection from '../components/WatchSection'
import SweatDropIcon from '../components/SweatDropIcon'
import Skeleton from '../components/Skeleton'
import CommunityReviewCard, { COMMUNITY_CARD_WIDTH, COMMUNITY_CARD_HEIGHT } from '../components/CommunityReviewCard'
import SpotlightPodium, { PodiumData } from '../components/SpotlightPodium'
import type { SpotlightUser } from '../hooks/useCommunitySpotlight'
import { GlassCapsule } from '../ui/glass'

const { width: SCREEN_WIDTH } = Dimensions.get('window')


// Platform-specific curated lists. Any slug NOT listed here is shown to everyone.
// Add new platform-specific list slugs here as they're created.
const PLATFORM_LIST_MAP: Record<string, string> = {
  'playstation-exclusives': 'playstation',
  'psplus-essentials': 'playstation',
  'xbox-exclusives': 'xbox',
  'nintendo-exclusives': 'nintendo',
  'pc-exclusives': 'pc',
}

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)
  const { user, profile } = useAuth()
  const { logs, refetch: refetchLogs } = useGameLogs(user?.id)

  const { platforms, excludePcOnly } = usePlatformFilter()
  const { lists: curatedLists, refetch: refetchLists } = useCuratedLists(excludePcOnly)
  const { games: friendsPlaying, isLoading: friendsLoading, refetch: refetchFriends } = useFriendsPlaying(user?.id)
  const { games: friendsFavorites, isLoading: favoritesLoading, refetch: refetchFavorites } = useFriendsFavorites(user?.id)
  const { reviews: communityReviews, isLoading: communityLoading, refetch: refetchCommunity } = useCommunityReviews()


  const [refreshing, setRefreshing] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  // Spotlight podium — top 5 from each of Supporters / Streak / Rank leaderboards.
  const [podiumData, setPodiumData] = useState<PodiumData>({
    supporters: [],
    streak: [],
    rank: [],
  })
  const [podiumLoading, setPodiumLoading] = useState(true)

  useEffect(() => {
    loadPodium()
  }, [])

  const loadPodium = async () => {
    setPodiumLoading(true)
    const columns = 'id, username, display_name, avatar_url'
    const nowIso = new Date().toISOString()
    try {
      const [supportersRes, streakRes, rankRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(columns)
          .neq('subscription_tier', 'free')
          .or(`subscription_tier.eq.lifetime,subscription_expires_at.gt.${nowIso}`)
          .order('created_at', { ascending: true })
          .limit(5),
        supabase
          .from('profiles')
          .select(columns)
          .gt('longest_streak', 0)
          .order('longest_streak', { ascending: false })
          .limit(5),
        supabase
          .from('profiles')
          .select(columns)
          .gt('total_xp', 0)
          .order('total_xp', { ascending: false })
          .limit(5),
      ])
      setPodiumData({
        supporters: (supportersRes.data || []) as SpotlightUser[],
        streak: (streakRes.data || []) as SpotlightUser[],
        rank: (rankRes.data || []) as SpotlightUser[],
      })
    } catch {
      // Silent — section self-hides when every category is empty.
    } finally {
      setPodiumLoading(false)
    }
  }

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
    setRefreshing(true)
    setRefreshCount((prev) => prev + 1) // Trigger news shuffle + carousel re-shuffle
    await Promise.all([
      refetchLogs(),
      refetchLists(),
      refetchFriends(),
      refetchFavorites(),
      refetchCommunity(),
      loadPodium(),
    ])
    setRefreshing(false)
  }, [refetchLogs, refetchLists, refetchFriends, refetchFavorites, refetchCommunity])


  const currentlyPlaying = useMemo(() => {
    return logs
      .filter((l) => l.status === 'playing')
      .slice(0, 10)
  }, [logs])

  // Filter curated lists by user's selected platforms
  const filteredCuratedLists = useMemo(() => {
    return curatedLists.filter((list) => {
      const requiredPlatform = PLATFORM_LIST_MAP[list.slug]
      // General list (not in the map) → show to everyone
      if (!requiredPlatform) return true
      // Platform-specific list → only show if user has that platform
      return platforms.includes(requiredPlatform)
    })
  }, [curatedLists, platforms])

  // Pick a random curated list for the "For You" section on each refresh
  const forYouCuratedList = useMemo(() => {
    if (filteredCuratedLists.length === 0) return null
    const i = Math.floor(Math.random() * filteredCuratedLists.length)
    return filteredCuratedLists[i]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCuratedLists, refreshCount])

  const handleGamePress = (gameId: number) => {
    navigation.navigate('GameDetail', { gameId })
  }

  const HorizontalSkeleton = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalScroll}
    >
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} width={88} height={117} borderRadius={BorderRadius.md} />
      ))}
    </ScrollView>
  )

  // Skeleton for the Community Activity row — single pulse matching the new
  // full-bleed card footprint. No inner structure needed; the card IS the media.
  const CommunitySkeleton = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.communityScroll}
    >
      {[1, 2].map((i) => (
        <Skeleton
          key={i}
          width={COMMUNITY_CARD_WIDTH}
          height={COMMUNITY_CARD_HEIGHT}
          borderRadius={BorderRadius.xl}
        />
      ))}
    </ScrollView>
  )

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Spacing.md }]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1, 3, 5, 7]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
          />
        }
      >
        {/* Pull-to-refresh spinner slot — always mounted so stickyHeaderIndices
            stay aligned with group headers below; collapses to zero height when
            idle so it doesn't reserve visible space. */}
        <View style={[styles.refreshLogo, !refreshing && styles.refreshLogoIdle]}>
          {refreshing && <LoadingSpinner size={48} />}
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* FOR YOU Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={styles.groupHeaderBar}>
          <SectionGroupHeader title="For You" />
        </View>
        <View style={styles.groupContent}>
          {/* NOW PLAYING */}
          {currentlyPlaying.length > 0 && (
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
                        <Image source={{ uri: coverUrl }} style={styles.nowPlayingCover} accessibilityLabel={game.name + ' cover art'} />
                      ) : (
                        <View style={[styles.nowPlayingCover, styles.coverPlaceholder]}>
                          <Text style={styles.placeholderText}>?</Text>
                        </View>
                      )}
                    </PressableScale>
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* RANDOM CURATED LIST (For You section, shuffles on refresh) */}
          {forYouCuratedList && (
            <CuratedListRow list={forYouCuratedList} />
          )}
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* FRIENDS Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={styles.groupHeaderBar}>
          <SectionGroupHeader title="Friends" />
        </View>
        <View style={styles.groupContent}>
          {/* FRIENDS ARE PLAYING */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Playing Now</Text>
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
                    <StackedAvatars users={game.friends} inline size={26} maxDisplay={4} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>
                  None of your friends are playing right now.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Search')}
                  accessibilityRole="button"
                  accessibilityLabel="Find people to follow"
                  style={styles.emptyStateCtaWrap}
                >
                  <GlassCapsule height={36} style={styles.emptyStateCta}>
                    <Text style={styles.emptyStateCtaText}>Find people to follow</Text>
                  </GlassCapsule>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* FRIENDS' FAVORITES */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Their Favorites</Text>
              {friendsFavorites.length > 10 && (
                <PressableScale
                  onPress={() => navigation.navigate('CuratedListDetail', {
                    listSlug: 'friends-favorites',
                    listTitle: "Friends' Favorites",
                    gameIds: friendsFavorites.map(g => g.id),
                    listDescription: "Games loved by people you follow",
                    bannerCoverUrl: friendsFavorites[0]?.coverUrl ?? null,
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
                    <StackedAvatars users={game.friends} inline size={26} maxDisplay={4} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>
                  Follow people to see their favorite games here.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Search')}
                  accessibilityRole="button"
                  accessibilityLabel="Find people to follow"
                  style={styles.emptyStateCtaWrap}
                >
                  <GlassCapsule height={36} style={styles.emptyStateCta}>
                    <Text style={styles.emptyStateCtaText}>Find people to follow</Text>
                  </GlassCapsule>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* COMMUNITY Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={styles.groupHeaderBar}>
          <SectionGroupHeader title="Community" />
        </View>
        <View style={styles.groupContent}>
          {/* RECENT REVIEWS */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => navigation.navigate('CommunityReviews' as never)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="See all recent reviews"
            >
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.cream} />
            </TouchableOpacity>
            {communityLoading ? (
              <CommunitySkeleton />
            ) : communityReviews.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>
                  No reviews yet. Log a game you played and be the first to share.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.communityScroll}
                decelerationRate="fast"
                snapToInterval={COMMUNITY_CARD_WIDTH + Spacing.md}
                snapToAlignment="start"
              >
                {communityReviews.slice(0, 10).map((review) => (
                  <CommunityReviewCard key={review.id} review={review} />
                ))}
              </ScrollView>
            )}
          </View>

          <SpotlightPodium data={podiumData} loading={podiumLoading} />
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* WATCH Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={styles.groupHeaderBar}>
          <SectionGroupHeader title="Videos & News" onSeeAll={() => navigation.navigate('Watch' as never)} />
        </View>
        <View style={styles.groupContent}>
          {/* YouTube Videos (header hidden - parent group says "Watch") */}
          <WatchSection refreshKey={refreshCount} showHeader={false} />
        </View>
      </Animated.ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  refreshLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  refreshLogoIdle: {
    paddingVertical: 0,
    height: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl, // 48px bottom padding (above tab bar)
  },
  // Section Groups
  groupHeaderBar: {
    backgroundColor: Colors.background,
    paddingTop: Spacing.md,
  },
  groupContent: {
    backgroundColor: Colors.alternate,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.cream,
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
    marginBottom: Spacing.lg,
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
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 24,
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
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2D6B4A',
    shadowColor: '#2D6B4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  // Horizontal scroll
  horizontalScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.cardGap,
  },
  // Game covers
  // Now Playing — matches curated list cover size (105x140) for consistency
  nowPlayingCover: {
    width: 105,
    height: 140,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  // Friends sections - compact covers
  gameCover: {
    width: 88,
    height: 117,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
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
    color: Colors.textDim,
  },
  // Friends game card with avatar overlay
  friendsGameCard: {
    position: 'relative',
    width: 88,
  },
  // Empty state for sections
  emptyStateContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.lg,
  },
  emptyStateText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  emptyStateCtaWrap: {
    alignItems: 'center',
  },
  emptyStateCta: {
    paddingHorizontal: 18,
  },
  emptyStateCtaText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  // Loading
  listsLoading: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  // Community Activity scroll row
  communityScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.md,
  },
})
