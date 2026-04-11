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
import { useFriendsFavorites } from '../hooks/useRecommendations'
import { usePlatformFilter } from '../hooks/usePlatformFilter'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import CuratedListRow from '../components/CuratedListRow'
import PressableScale from '../components/PressableScale'
import StackedAvatars from '../components/StackedAvatars'
import WatchSection from '../components/WatchSection'
import SweatDropIcon from '../components/SweatDropIcon'
import Skeleton from '../components/Skeleton'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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

  // Personalized recommendations
  const { games: friendsFavorites, isLoading: favoritesLoading, refetch: refetchFavorites } = useFriendsFavorites(user?.id)

  // Community activity (recent reviews)
  const { reviews: communityReviews, isLoading: communityLoading, refetch: refetchCommunity } = useCommunityReviews()

  const [refreshing, setRefreshing] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

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
    setRefreshing(true)
    setRefreshCount((prev) => prev + 1) // Trigger news shuffle + carousel re-shuffle
    await Promise.all([
      refetchLogs(),
      refetchLists(),
      refetchFriends(),
      refetchFavorites(),
      refetchCommunity(),
    ])
    setRefreshing(false)
  }, [refetchLogs, refetchLists, refetchFriends, refetchFavorites, refetchCommunity])


  // Currently playing games
  const currentlyPlaying = useMemo(() => {
    return logs
      .filter((l) => l.status === 'playing')
      .slice(0, 10)
  }, [logs])

  // Pick two different random curated lists on each refresh
  const [forYouCuratedList, featuredCuratedList] = useMemo(() => {
    if (curatedLists.length === 0) return [null, null]
    if (curatedLists.length === 1) return [curatedLists[0], null]
    const i = Math.floor(Math.random() * curatedLists.length)
    let j = Math.floor(Math.random() * (curatedLists.length - 1))
    if (j >= i) j++ // ensure different index
    return [curatedLists[i], curatedLists[j]]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curatedLists, refreshCount])

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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
          />
        }
      >
        {/* Pull-to-refresh logo */}
        {refreshing && (
          <View style={styles.refreshLogo}>
            <LoadingSpinner size={48} />
          </View>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* FOR YOU Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={[styles.sectionGroup, { backgroundColor: Colors.background }]}>
          <SectionGroupHeader title="For You" />

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
          )}

          {/* RANDOM CURATED LIST (For You section, shuffles on refresh) */}
          {forYouCuratedList && (
            <CuratedListRow list={forYouCuratedList} />
          )}
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* FRIENDS Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={[styles.sectionGroup, { backgroundColor: Colors.alternate }]}>
          <SectionGroupHeader title="Friends" />

          {/* FRIENDS ARE PLAYING */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md, color: Colors.text }]}>Playing Now</Text>
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
                    <StackedAvatars users={game.friends} inline size={24} maxDisplay={4} />
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
              <Text style={[styles.sectionTitle, { fontFamily: Fonts.bodySemiBold, fontSize: FontSize.md, color: Colors.text }]}>Their Favorites</Text>
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
                    <StackedAvatars users={game.friends} inline size={24} maxDisplay={4} />
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
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* DISCOVER Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={[styles.sectionGroup, { backgroundColor: Colors.background }]}>
          <SectionGroupHeader title="Discover" />

          {/* RANDOM CURATED LIST (shuffles on refresh) */}
          {listsLoading ? (
            <View style={styles.listsLoading}>
              <LoadingSpinner size="large" />
            </View>
          ) : featuredCuratedList ? (
            <CuratedListRow list={featuredCuratedList} />
          ) : null}

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
                  {communityReviews.slice(0, 10).map((review, index) => {
                    // Pick a screenshot with variety — different index for same game
                    const screenshots = review.game.screenshot_urls
                    const screenshotUrl = screenshots && screenshots.length > 0
                      ? screenshots[index % screenshots.length]
                      : null
                    const imageUrl = screenshotUrl || getIGDBImageUrl(review.game.cover_url)

                    return (
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
                      <View style={styles.communityCoverWrap}>
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.communityCover}
                          resizeMode="cover"
                          accessibilityLabel={review.game.name + ' screenshot'}
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(42, 42, 46, 0.9)']}
                          style={styles.communityCoverGradient}
                        />
                        <View style={styles.communityGameBadge}>
                          <Text style={styles.communityGameName} numberOfLines={1}>
                            {review.game.name}
                          </Text>
                        </View>
                      </View>
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
                              <Ionicons name="person" size={10} color={Colors.textDim} />
                            </View>
                          )}
                          <Text style={styles.communityUsername} numberOfLines={1}>
                            {review.user.display_name || review.user.username}
                          </Text>
                          {review.rating && (
                            <View style={styles.communityRating}>
                              <Ionicons name="star" size={10} color={Colors.cream} />
                              <Text style={styles.communityRatingText}>{review.rating}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.communityReviewText} numberOfLines={3}>
                          {review.review}
                        </Text>
                        <Text style={styles.communityTimestamp}>
                          {formatTimeAgo(review.created_at)}
                        </Text>
                      </View>
                    </PressableScale>
                    )
                  })}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* WATCH Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={[styles.sectionGroup, { backgroundColor: Colors.alternate }]}>
          <SectionGroupHeader title="Videos & News" onSeeAll={() => navigation.navigate('Watch' as never)} />

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
    backgroundColor: Colors.background,
  },
  refreshLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl, // 48px bottom padding (above tab bar)
  },
  // Section Groups
  sectionGroup: {
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
    width: 240,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
  },
  communityCoverWrap: {
    position: 'relative',
    width: '100%',
    height: 120,
    backgroundColor: Colors.surfaceLight,
  },
  communityCover: {
    width: '100%',
    height: '100%',
  },
  communityCoverGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 1,
  },
  communityCoverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  communityContent: {
    paddingHorizontal: Spacing.sm + 2,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm + 2,
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
    backgroundColor: Colors.surfaceLight,
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
    color: Colors.cream,
    lineHeight: 15,
  },
  communityReviewText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text,
    lineHeight: 16,
  },
  communityTimestamp: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xxs,
    color: Colors.textDim,
    marginTop: 4,
  },
  communityGameBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 2,
    maxWidth: '80%',
    backgroundColor: 'rgba(26, 26, 28, 0.7)',
    borderTopRightRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  communityGameName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xxs,
    color: Colors.textMuted,
    lineHeight: 14,
  },
})
