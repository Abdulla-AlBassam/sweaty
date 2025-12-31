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

type NavigationProp = NativeStackNavigationProp<MainStackParamList>
import { useGameLogs, useCuratedLists } from '../hooks/useSupabase'
import { useFriendsPlaying } from '../hooks/useFriendsPlaying'
import { useBecauseYouLoved, useFriendsFavorites, useMoreFromStudio } from '../hooks/useRecommendations'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import CuratedListRow from '../components/CuratedListRow'
import SweatDropIcon from '../components/SweatDropIcon'
import PressableScale from '../components/PressableScale'
import StackedAvatars from '../components/StackedAvatars'
import NewsSection from '../components/NewsSection'
import Skeleton from '../components/Skeleton'


export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuth()
  const { logs, refetch: refetchLogs } = useGameLogs(user?.id)
  const { lists: curatedLists, isLoading: listsLoading, refetch: refetchLists } = useCuratedLists()

  // Friends playing
  const { games: friendsPlaying, isLoading: friendsLoading, refetch: refetchFriends } = useFriendsPlaying(user?.id)

  // Personalized recommendations
  const { basedOnGame, recommendations: becauseYouLovedGames, isLoading: lovedLoading, refetch: refetchLoved } = useBecauseYouLoved(user?.id)
  const { games: friendsFavorites, isLoading: favoritesLoading, refetch: refetchFavorites } = useFriendsFavorites(user?.id)
  const { studio, games: studioGames, isLoading: studioLoading, refetch: refetchStudio } = useMoreFromStudio(user?.id)

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
      refetchStudio(),
    ])
    setRefreshing(false)
  }, [refetchLogs, refetchLists, refetchFriends, refetchLoved, refetchFavorites, refetchStudio])


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

        {/* NOW PLAYING Section */}
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
        )}

        {/* FRIENDS ARE PLAYING Section */}
        {(friendsLoading || friendsPlaying.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Friends Are Playing</Text>
            </View>
            {friendsLoading ? (
              <HorizontalSkeleton />
            ) : (
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
            )}
          </View>
        )}

        {/* FOR YOU: BECAUSE YOU LOVED [GAME] */}
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

        {/* FOR YOU: POPULAR WITH YOUR FRIENDS */}
        {(favoritesLoading || friendsFavorites.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.forYouTitle}>Popular With Your Friends</Text>
            </View>
            {favoritesLoading ? (
              <HorizontalSkeleton />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {friendsFavorites.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.friendsFavoriteCard}
                    onPress={() => handleGamePress(game.id)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: getIGDBImageUrl(game.coverUrl) }}
                      style={styles.gameCover}
                    />
                    <View style={styles.friendCountBadge}>
                      <Text style={styles.friendCountText}>
                        ♥ {game.friendCount} {game.friendCount === 1 ? 'friend' : 'friends'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* FOR YOU: MORE FROM [STUDIO] */}
        {(studioLoading || (studio && studioGames.length > 0)) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.forYouTitle}>
                More From{' '}
                <Text style={styles.accentText}>{studio || '...'}</Text>
              </Text>
            </View>
            {studioLoading ? (
              <HorizontalSkeleton />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {studioGames.map((game) => (
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

        {/* Gaming News Section */}
        <NewsSection refreshKey={refreshCount} />

        {/* Featured Curated List (2025 Essentials) */}
        {listsLoading ? (
          <View style={styles.listsLoading}>
            <LoadingSpinner size="large" />
          </View>
        ) : featuredCuratedList ? (
          <CuratedListRow list={featuredCuratedList} />
        ) : null}
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
    paddingTop: Spacing.xl,      // 24px top padding
    paddingBottom: Spacing.xxxl, // 48px bottom padding (above tab bar)
  },
  // Header
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xxl,  // 32px below header
  },
  // Sections
  section: {
    marginBottom: Spacing.xxl,   // 32px between sections
  },
  sectionHeader: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.sectionHeaderBelow, // 16px below header
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,       // Smaller, more subtle
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
    gap: Spacing.cardGap,        // 12px gap between cards
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
  // Friends favorites card with count badge
  friendsFavoriteCard: {
    position: 'relative',
    width: 105,
  },
  friendCountBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.xs,
  },
  friendCountText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.text,
    textAlign: 'center',
  },
  // Loading
  listsLoading: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
})
