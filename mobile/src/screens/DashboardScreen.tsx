import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Animated,
  TouchableOpacity,
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../contexts/AuthContext'
import { MainStackParamList } from '../navigation'
import { Ionicons } from '@expo/vector-icons'

type NavigationProp = NativeStackNavigationProp<MainStackParamList>
import { useGameLogs, useCuratedLists, useCommunityReviews } from '../hooks/useSupabase'
import { useFriendsPlaying } from '../hooks/useFriendsPlaying'
import { useBecauseYouLoved, useFriendsFavorites } from '../hooks/useRecommendations'
import { usePlatformFilter } from '../hooks/usePlatformFilter'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import CuratedListRow from '../components/CuratedListRow'
import SweatDropIcon from '../components/SweatDropIcon'
import PressableScale from '../components/PressableScale'
import StackedAvatars from '../components/StackedAvatars'
import NewsSection from '../components/NewsSection'
import Skeleton from '../components/Skeleton'

// Background colors for section groups
const SectionBg = {
  base: Colors.background,        // #0f0f0f
  alternate: '#111112',           // Subtle, blends with base
}

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  if (hour < 21) return 'Evening'
  return 'Night'
}

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user, profile } = useAuth()
  const { logs, refetch: refetchLogs } = useGameLogs(user?.id)
  const { lists: curatedLists, isLoading: listsLoading, refetch: refetchLists } = useCuratedLists()

  // Platform filter for content filtering
  const { platforms } = usePlatformFilter()

  // Friends playing
  const { games: friendsPlaying, isLoading: friendsLoading, refetch: refetchFriends } = useFriendsPlaying(user?.id)

  // Personalized recommendations (filtered by user's platform preferences)
  const { basedOnGame, recommendations: becauseYouLovedGames, isLoading: lovedLoading, refetch: refetchLoved } = useBecauseYouLoved(user?.id, platforms)
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
    setRefreshCount((prev) => prev + 1) // Trigger news shuffle
    await Promise.all([
      refetchLogs(),
      refetchLists(),
      refetchFriends(),
      refetchLoved(),
      refetchFavorites(),
      refetchCommunity(),
    ])
    setRefreshing(false)
  }, [refetchLogs, refetchLists, refetchFriends, refetchLoved, refetchFavorites, refetchCommunity])


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
  const SectionGroupHeader = ({ title }: { title: string }) => (
    <View style={styles.groupHeader}>
      <Text style={styles.groupHeaderText}>{title}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {/* Header: Sweat drop icon centered - tap to open AI */}
        <PressableScale
          style={styles.header}
          onPress={() => navigation.navigate('AIRecommend')}
          haptic="light"
          scale={0.9}
        >
          <SweatDropIcon size={40} isRefreshing={refreshing} />
        </PressableScale>

        {/* Personalized Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>
            {getGreeting()}, <Text style={styles.greetingName}>{profile?.display_name || profile?.username || 'Gamer'}</Text>
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════ */}
        {/* YOUR GAMES Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        {currentlyPlaying.length > 0 && (
          <View style={[styles.sectionGroup, { backgroundColor: SectionBg.base }]}>
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
                    >
                      {coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={styles.gameCover} />
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
        <View style={[styles.sectionGroup, { backgroundColor: SectionBg.alternate }]}>
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
                  >
                    <Image
                      source={{ uri: getIGDBImageUrl(game.cover_url) }}
                      style={styles.gameCover}
                    />
                    <StackedAvatars users={game.friends} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>
                  None of your friends are playing right now.{'\n'}
                  <Text style={styles.emptyStateLink} onPress={() => navigation.navigate('Search')}>
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
                >
                  <Text style={styles.seeAllText}>See All</Text>
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
                  >
                    <Image
                      source={{ uri: getIGDBImageUrl(game.coverUrl) }}
                      style={styles.gameCover}
                    />
                    <StackedAvatars users={game.friends} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>
                  Follow people to see their favorite games here.{'\n'}
                  <Text style={styles.emptyStateLink} onPress={() => navigation.navigate('Search')}>
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
                      >
                        <Image
                          source={{ uri: getIGDBImageUrl(review.game.cover_url) }}
                          style={styles.communityCover}
                        />
                        <View style={styles.communityContent}>
                          <View style={styles.communityHeader}>
                            {review.user.avatar_url ? (
                              <Image
                                source={{ uri: review.user.avatar_url }}
                                style={styles.communityAvatar}
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
                                <Ionicons name="star" size={10} color="#FFD700" />
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
                  >
                    <Text style={styles.seeAllText}>See All</Text>
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
                    >
                      <Image
                        source={{ uri: getIGDBImageUrl(game.coverUrl) }}
                        style={styles.gameCover}
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
        {/* NEWS Section Group */}
        {/* ═══════════════════════════════════════════════ */}
        <View style={[styles.sectionGroup, { backgroundColor: SectionBg.alternate }]}>
          <SectionGroupHeader title="News" />

          {/* Gaming News (header hidden - parent group says "News") */}
          <NewsSection refreshKey={refreshCount} showHeader={false} />
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
    paddingBottom: Spacing.xxxl, // 48px bottom padding (above tab bar)
  },
  // Header
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  // Greeting + Stats
  greetingContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  greetingText: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  greetingName: {
    color: Colors.text,
  },
  // Section Groups
  sectionGroup: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  groupHeader: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: Spacing.md,
  },
  groupHeaderText: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.sectionHeaderBelow,
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
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  forYouTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  accentText: {
    color: Colors.cyanSoft,
  },
  seeAllText: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
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
    backgroundColor: Colors.surface,
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
    color: Colors.textDim,
    textAlign: 'center',
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  communityCover: {
    width: '100%',
    height: 80,
    backgroundColor: Colors.surfaceLight,
  },
  communityContent: {
    padding: Spacing.sm,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  communityRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  communityRatingText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: '#FFD700',
  },
  communityReviewText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text,
    lineHeight: 16,
    marginBottom: 4,
  },
  communityGameName: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.textDim,
    textTransform: 'uppercase',
  },
})
