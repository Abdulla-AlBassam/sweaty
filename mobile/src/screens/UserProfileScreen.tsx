import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  Modal,
  Animated,
  Dimensions,
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, STATUS_LABELS } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MainStackParamList } from '../navigation'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { calculateXP, getLevel } from '../lib/xp'
import { checkIsPremium } from '../hooks/usePremium'
import { useUserLists } from '../hooks/useLists'
import FollowersModal from '../components/FollowersModal'
import ListCard from '../components/ListCard'
import StarRating from '../components/StarRating'
import XPProgressBar from '../components/XPProgressBar'
import PremiumBadge from '../components/PremiumBadge'
import StreakBadge from '../components/StreakBadge'
import PlatformBadges from '../components/PlatformBadges'
import { ProfileSkeleton } from '../components/skeletons'
import { GamingPlatform } from '../types'
import SweatDropIcon from '../components/SweatDropIcon'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const FAV_GAP = Spacing.xs
const FAV_CARD_WIDTH = (SCREEN_WIDTH - Spacing.screenPadding * 2 - FAV_GAP * 4) / 5

type Props = NativeStackScreenProps<MainStackParamList, 'UserProfile'>

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  banner_url: string | null
  bio: string | null
  favorite_games?: number[] | null
  subscription_tier?: string | null
  subscription_expires_at?: string | null
  current_streak?: number
  longest_streak?: number
  last_activity_at?: string | null
  gaming_platforms?: GamingPlatform[] | null
}

interface FavoriteGame {
  id: number
  name: string
  cover_url: string | null
}

interface GameLog {
  id: string
  game_id: number
  status: string
  rating: number | null
  review: string | null
  game: {
    id: number
    name: string
    cover_url: string | null
  }
}

interface Stats {
  totalGames: number
  completed: number
  playing: number
  played: number
  wantToPlay: number
  onHold: number
  dropped: number
  averageRating: number | null
}

export default function UserProfileScreen({ navigation, route }: Props) {
  const { username } = route.params
  const { user } = useAuth()
  const nav = useNavigation()
  const insets = useSafeAreaInsets()
  const scrollY = useRef(new Animated.Value(0)).current

  const [profile, setProfile] = useState<Profile | null>(null)
  const [gameLogs, setGameLogs] = useState<GameLog[]>([])
  const [favorites, setFavorites] = useState<FavoriteGame[]>([])
  const [stats, setStats] = useState<Stats>({ totalGames: 0, completed: 0, playing: 0, played: 0, wantToPlay: 0, onHold: 0, dropped: 0, averageRating: null })
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [avatarExpanded, setAvatarExpanded] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [followersModalVisible, setFollowersModalVisible] = useState(false)
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch user's public lists
  const { lists: userLists, refetch: refetchLists } = useUserLists(profile?.id)
  // Only show public lists that have games
  const publicLists = userLists
    .filter(list => list.is_public && list.preview_games && list.preview_games.length > 0)
    .map(list => ({
      ...list,
      user: {
        id: profile?.id,
        username: profile?.username || '',
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
      }
    }))

  const isOwnProfile = user?.id === profile?.id

  // Filter tabs configuration (no "All" — grouped view is the default)
  const filterTabs = [
    { key: 'playing', label: 'Playing' },
    { key: 'completed', label: 'Completed' },
    { key: 'played', label: 'Played' },
    { key: 'want_to_play', label: 'Want to Play' },
    { key: 'on_hold', label: 'On Hold' },
    { key: 'dropped', label: 'Dropped' },
  ]

  // Get count for each status
  const getStatusCount = (status: string) => {
    if (status === 'all') return gameLogs.length
    return gameLogs.filter(log => log.status === status).length
  }

  // Filter game logs based on selected filter
  // For "All" tab, sort by rating (highest to lowest, unrated last)
  const filteredGameLogs = (() => {
    if (selectedFilter === 'all') {
      return [...gameLogs].sort((a, b) => {
        // Both have ratings - sort highest first
        if (a.rating !== null && b.rating !== null) {
          return b.rating - a.rating
        }
        // Only a has rating - a comes first
        if (a.rating !== null) return -1
        // Only b has rating - b comes first
        if (b.rating !== null) return 1
        // Neither has rating - keep original order
        return 0
      })
    }
    return gameLogs.filter(log => log.status === selectedFilter)
  })()

  // Group logs by status for the default view
  const STATUS_ORDER = ['playing', 'completed', 'played', 'want_to_play', 'on_hold', 'dropped']
  const groupedLogs = useMemo(() => {
    return STATUS_ORDER
      .map(status => ({
        status,
        label: STATUS_LABELS[status] || status,
        logs: gameLogs
          .filter(log => log.status === status)
          .sort((a, b) => {
            if (a.rating !== null && b.rating !== null) return b.rating - a.rating
            if (a.rating !== null) return -1
            if (b.rating !== null) return 1
            return 0
          }),
      }))
      .filter(group => group.logs.length > 0)
  }, [gameLogs])

  useEffect(() => {
    console.log('=== USER PROFILE SCREEN MOUNTED === username:', username)
    fetchProfile()
  }, [username])

  useEffect(() => {
    if (profile) {
      fetchGameLogs()
      fetchFollowCounts()
      fetchFavorites()
      if (user && !isOwnProfile) {
        checkIfFollowing()
      }
    }
  }, [profile, user])

  const fetchFavorites = async () => {
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
  }

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchGameLogs = async () => {
    if (!profile) return

    try {
      const { data } = await supabase
        .from('game_logs')
        .select(`
          id,
          game_id,
          status,
          rating,
          review,
          game:games_cache(id, name, cover_url)
        `)
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false })

      if (data) {
        // Transform the data to handle the nested game object
        const logs = data.map((log: any) => ({
          ...log,
          game: Array.isArray(log.game) ? log.game[0] : log.game
        })).filter((log: any) => log.game)

        setGameLogs(logs as GameLog[])

        // Calculate stats
        const completed = logs.filter((l: any) => l.status === 'completed').length
        const playing = logs.filter((l: any) => l.status === 'playing').length
        const played = logs.filter((l: any) => l.status === 'played').length
        const wantToPlay = logs.filter((l: any) => l.status === 'want_to_play').length
        const onHold = logs.filter((l: any) => l.status === 'on_hold').length
        const dropped = logs.filter((l: any) => l.status === 'dropped').length
        const ratings = logs.filter((l: any) => l.rating).map((l: any) => l.rating as number)
        const avgRating = ratings.length > 0
          ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
          : null

        setStats({
          totalGames: logs.length,
          completed,
          playing,
          played,
          wantToPlay,
          onHold,
          dropped,
          averageRating: avgRating,
        })
      }
    } catch (error) {
      console.error('Error fetching game logs:', error)
    }
  }

  const fetchFollowCounts = async () => {
    if (!profile) return

    try {
      const [followers, following] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', profile.id),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', profile.id),
      ])

      setFollowerCount(followers.count || 0)
      setFollowingCount(following.count || 0)
    } catch (error) {
      console.error('Error fetching follow counts:', error)
    }
  }

  const checkIfFollowing = async () => {
    if (!user || !profile) return

    try {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profile.id)
        .single()

      setIsFollowing(!!data)
    } catch (error) {
      // Not following
      setIsFollowing(false)
    }
  }

  const handleFollow = async () => {
    if (!user || !profile || isFollowLoading) return

    setIsFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id)
        setIsFollowing(false)
        setFollowerCount((prev) => prev - 1)
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: profile.id })
        setIsFollowing(true)
        setFollowerCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setIsFollowLoading(false)
    }
  }

  const handleGamePress = (gameId: number) => {
    nav.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const handleListPress = (listId: string) => {
    nav.dispatch(
      CommonActions.navigate({
        name: 'ListDetail',
        params: { listId },
      })
    )
  }

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      fetchProfile(),
      fetchGameLogs(),
      fetchFollowCounts(),
      fetchFavorites(),
      refetchLists(),
    ])
    setRefreshing(false)
  }, [profile, refetchLists])

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>loading...</Text>
        </View>
        <ScrollView style={styles.scrollView}>
          <ProfileSkeleton />
        </ScrollView>
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>not found</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={64} color={Colors.textDim} />
          <Text style={styles.errorText}>user not found</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Banner */}
        {profile.banner_url ? (
          <Animated.View style={[styles.bannerContainer, { height: SCREEN_HEIGHT * 0.30 + insets.top }, {
            transform: [
              { translateY: scrollY.interpolate({ inputRange: [-200, 0], outputRange: [-100, 0], extrapolateRight: 'clamp' }) },
              { scale: scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.5, 1], extrapolateRight: 'clamp' }) },
            ],
          }]}>
            <Image
              source={{ uri: profile.banner_url }}
              style={styles.banner}
              resizeMode="cover"
              accessibilityLabel={(profile.display_name || profile.username) + ' profile banner'}
            />
            <LinearGradient
              colors={[Colors.gradientMedium, 'transparent']}
              style={styles.bannerGradientTop}
            />
            <LinearGradient
              colors={['transparent', Colors.gradientMedium, Colors.background]}
              locations={[0, 0.6, 1]}
              style={styles.bannerGradient}
            />
          </Animated.View>
        ) : null}

        {/* Profile Info - Vertical Layout */}
        <View style={[styles.profileSection, profile.banner_url && styles.profileSectionWithBanner]}>
          <Pressable onPress={() => profile.avatar_url && setAvatarExpanded(true)}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} accessible={false} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={40} color={Colors.textDim} />
              </View>
            )}
          </Pressable>

          <View style={styles.nameRow}>
            <Text style={styles.displayName}>
              {profile.display_name || profile.username}
            </Text>
            {profile.gaming_platforms && profile.gaming_platforms.length > 0 && (
              <PlatformBadges platforms={profile.gaming_platforms} size="small" />
            )}
            {checkIsPremium(profile.subscription_tier, profile.subscription_expires_at) && (
              <PremiumBadge size="small" variant={profile.username === 'abdulla' ? 'developer' : 'premium'} />
            )}
            <StreakBadge streak={profile.current_streak || 0} size="medium" />
          </View>
          <Text style={styles.username}>@{profile.username}</Text>

          <View style={styles.followRow}>
            <View style={styles.followCounts}>
              <TouchableOpacity
                onPress={() => {
                  setFollowersModalType('followers')
                  setFollowersModalVisible(true)
                }}
                accessibilityLabel={followerCount + ' followers'}
                accessibilityRole="button"
              >
                <Text style={styles.followText}>
                  <Text style={styles.followNumber}>{followerCount}</Text> followers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setFollowersModalType('following')
                  setFollowersModalVisible(true)
                }}
                accessibilityLabel={followingCount + ' following'}
                accessibilityRole="button"
              >
                <Text style={styles.followText}>
                  <Text style={styles.followNumber}>{followingCount}</Text> following
                </Text>
              </TouchableOpacity>
            </View>

            {/* Follow Button - compact pill */}
            {!isOwnProfile && user && (
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollow}
                disabled={isFollowLoading}
                accessibilityLabel={isFollowing ? 'Unfollow ' + profile.username : 'Follow ' + profile.username}
                accessibilityRole="button"
              >
                {isFollowLoading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                    {isFollowing ? 'following' : 'follow'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
        </View>

        {/* Stats + Level Ring */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.totalGames}</Text>
            <Text style={styles.statLabel}>games</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>completed</Text>
          </View>
          <XPProgressBar levelInfo={getLevel(calculateXP(gameLogs, followerCount))} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.playing}</Text>
            <Text style={styles.statLabel}>playing</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.averageRating ? stats.averageRating : '—'}</Text>
            <Text style={styles.statLabel}>avg rating</Text>
          </View>
        </View>

        {/* Favorites */}
        <View style={[styles.section, { backgroundColor: Colors.alternate, paddingBottom: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>Favorites</Text>
          {favorites.length > 0 ? (
            <View style={styles.favoritesRow}>
              {favorites.map((game) => {
                const coverUrl = game.cover_url
                  ? getIGDBImageUrl(game.cover_url, 'coverBig2x')
                  : null
                return (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.favoriteSlot}
                    onPress={() => handleGamePress(game.id)}
                    accessibilityLabel={game.name}
                    accessibilityRole="button"
                  >
                    {coverUrl ? (
                      <Image source={{ uri: coverUrl }} style={styles.favoriteCover} accessibilityLabel={game.name + ' cover art'} />
                    ) : (
                      <View style={[styles.favoriteCover, styles.favoriteCoverPlaceholder]}>
                        <SweatDropIcon size={20} variant="static" />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          ) : (
            <View style={styles.emptyFavorites}>
              <Text style={styles.emptyFavoritesText}>No favorites yet</Text>
            </View>
          )}
        </View>

        {/* Recently Logged */}
        {gameLogs.length > 0 && (
          <View style={[styles.recentlyLoggedSection, { backgroundColor: Colors.background, paddingBottom: Spacing.xl }]}>
            <Text style={styles.sectionTitle}>Recently Logged</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.recentlyLoggedScroll}
              contentContainerStyle={styles.recentlyLoggedContent}
            >
              {gameLogs.slice(0, 10).map((log) => (
                <TouchableOpacity
                  key={log.id}
                  style={styles.recentlyLoggedCard}
                  onPress={() => handleGamePress(log.game_id)}
                  accessibilityLabel={log.game?.name || 'Game'}
                  accessibilityRole="button"
                >
                  {log.game?.cover_url ? (
                    <Image
                      source={{ uri: getIGDBImageUrl(log.game.cover_url, 'coverBig2x') }}
                      style={styles.recentlyLoggedCover}
                      accessibilityLabel={log.game.name + ' cover art'}
                    />
                  ) : (
                    <View style={[styles.recentlyLoggedCover, styles.gameCoverPlaceholder]}>
                      <SweatDropIcon size={20} variant="static" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Lists - Only show if user has public lists with games */}
        {publicLists.length > 0 && (
          <View style={[styles.listsSection, { backgroundColor: Colors.alternate, paddingBottom: Spacing.xl }]}>
            <Text style={styles.sectionTitle}>Lists</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.listsScroll}
              contentContainerStyle={styles.listsContent}
            >
              {publicLists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  onPress={() => handleListPress(list.id)}
                  showUser={true}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Library */}
        <View style={[styles.section, { backgroundColor: Colors.background, paddingBottom: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>Library</Text>

          {gameLogs.length > 0 ? (
            <View style={styles.libraryRows}>
              {/* All Games */}
              <TouchableOpacity
                style={[styles.libraryRow, styles.libraryRowBorder]}
                onPress={() => {
                  if (profile?.id) {
                    navigation.dispatch(
                      CommonActions.navigate({
                        name: 'LibraryStatus',
                        params: { userId: profile.id, status: 'all' },
                      })
                    )
                  }
                }}
                accessibilityLabel={'All Games, ' + gameLogs.length + ' games'}
                accessibilityRole="button"
              >
                <Text style={styles.libraryRowLabel}>All Games</Text>
                <View style={styles.libraryRowRight}>
                  <Text style={styles.libraryRowCount}>{gameLogs.length}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
                </View>
              </TouchableOpacity>

              {/* Reviews */}
              {(() => {
                const reviewCount = gameLogs.filter((l: any) => l.review && l.review.trim().length > 0).length
                if (reviewCount === 0) return null
                return (
                  <TouchableOpacity
                    style={styles.libraryRow}
                    onPress={() => {
                      if (profile?.id) {
                        navigation.dispatch(
                          CommonActions.navigate({
                            name: 'UserReviews',
                            params: { userId: profile.id },
                          })
                        )
                      }
                    }}
                    accessibilityLabel={'Reviews, ' + reviewCount}
                    accessibilityRole="button"
                  >
                    <Text style={styles.libraryRowLabel}>Reviews</Text>
                    <View style={styles.libraryRowRight}>
                      <Text style={styles.libraryRowCount}>{reviewCount}</Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
                    </View>
                  </TouchableOpacity>
                )
              })()}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <SweatDropIcon size={48} variant="static" />
              <Text style={styles.emptyText}>No games logged yet</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Followers/Following Modal */}
      {profile && (
        <FollowersModal
          visible={followersModalVisible}
          onClose={() => setFollowersModalVisible(false)}
          userId={profile.id}
          type={followersModalType}
        />
      )}

      {/* Avatar Lightbox */}
      <Modal visible={avatarExpanded} transparent animationType="fade" onRequestClose={() => setAvatarExpanded(false)}>
        <Pressable style={styles.avatarModalOverlay} onPress={() => setAvatarExpanded(false)}>
          <Image source={{ uri: profile?.avatar_url || '' }} style={styles.avatarModalImage} />
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarModalImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
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
    paddingBottom: Spacing.xxl,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.screenPadding,
  },
  bannerContainer: {
    width: SCREEN_WIDTH,
    // height set dynamically via inline style
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  bannerPlaceholder: {
    height: 0,
  },
  profileSectionWithBanner: {
    marginTop: -70,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.md,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.text,
  },
  username: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  followCounts: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  followText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  followNumber: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },
  bio: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  followButton: {
    backgroundColor: 'rgba(192, 200, 208, 0.18)',
    borderWidth: 1,
    borderColor: Colors.cream,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  followButtonText: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.cream,
    fontSize: FontSize.sm,
  },
  followingButtonText: {
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statSeparator: {
    width: 1,
    height: '60%',
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  statValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.lg,
    color: Colors.cream,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  ranksSection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
  },
  recentlyLoggedSection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxl,
  },
  recentlyLoggedScroll: {
    marginHorizontal: -Spacing.screenPadding,
  },
  recentlyLoggedContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.cardGap,
  },
  recentlyLoggedCard: {
    width: 105,
  },
  recentlyLoggedCover: {
    width: 105,
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  section: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,
    color: Colors.cream,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sectionHeaderBelow,
  },
  filterTabsContainer: {
    marginBottom: Spacing.md,
    marginHorizontal: -Spacing.lg,
  },
  filterTabsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  filterTabSelected: {
    backgroundColor: 'rgba(192, 200, 208, 0.18)',
    borderColor: Colors.cream,
  },
  filterTabDimmed: {
    opacity: 0.5,
  },
  filterTabText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  filterTabTextSelected: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.cream,
  },
  filterTabTextDimmed: {
    color: Colors.textDim,
  },
  libraryRows: {
    marginTop: Spacing.sm,
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  libraryRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  libraryRowLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  libraryRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  libraryRowCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,                            // 8px gap for 4-column layout
  },
  gameCard: {
    width: '23%',                             // ~4 columns with gaps
    marginBottom: Spacing.xs,
  },
  gameCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  gameCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  ratingBelow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  favoritesRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: FAV_GAP,
  },
  favoriteSlot: {
    width: FAV_CARD_WIDTH,
  },
  favoriteCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  favoriteCoverPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFavorites: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  emptyFavoritesText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  // Lists section styles
  listsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  listsScroll: {
    marginHorizontal: -Spacing.lg,
  },
  listsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  listCardWrapper: {
    width: 280,
  },
})
