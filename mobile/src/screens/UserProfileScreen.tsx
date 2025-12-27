import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
import { ProfileSkeleton } from '../components/skeletons'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BANNER_HEIGHT = 150

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
  averageRating: number | null
}

export default function UserProfileScreen({ navigation, route }: Props) {
  const { username } = route.params
  const { user } = useAuth()
  const nav = useNavigation()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [gameLogs, setGameLogs] = useState<GameLog[]>([])
  const [favorites, setFavorites] = useState<FavoriteGame[]>([])
  const [stats, setStats] = useState<Stats>({ totalGames: 0, completed: 0, playing: 0, averageRating: null })
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [followersModalVisible, setFollowersModalVisible] = useState(false)
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch user's public lists
  const { lists: userLists, refetch: refetchLists } = useUserLists(profile?.id)
  // Only show public lists for other users
  const publicLists = userLists.filter(list => list.is_public)

  const isOwnProfile = user?.id === profile?.id

  // Filter tabs configuration
  const filterTabs = [
    { key: 'all', label: 'All' },
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
        .limit(20)

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
        const ratings = logs.filter((l: any) => l.rating).map((l: any) => l.rating as number)
        const avgRating = ratings.length > 0
          ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
          : null

        setStats({
          totalGames: logs.length,
          completed,
          playing,
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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>loading...</Text>
        </View>
        <ScrollView style={styles.scrollView}>
          <ProfileSkeleton />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>not found</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={64} color={Colors.textDim} />
          <Text style={styles.errorText}>user not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
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
        {/* Banner */}
        {profile.banner_url ? (
          <View style={styles.bannerContainer}>
            <Image
              source={{ uri: profile.banner_url }}
              style={styles.banner}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', Colors.background]}
              style={styles.bannerGradient}
            />
          </View>
        ) : (
          <View style={styles.bannerPlaceholder} />
        )}

        {/* Profile Info - Vertical Layout */}
        <View style={[styles.profileSection, profile.banner_url && styles.profileSectionWithBanner]}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={40} color={Colors.textDim} />
            </View>
          )}

          <View style={styles.nameRow}>
            <Text style={styles.displayName}>
              {profile.display_name || profile.username}
            </Text>
            {checkIsPremium(profile.subscription_tier, profile.subscription_expires_at) && (
              <PremiumBadge size="small" variant={profile.username === 'abdulla' ? 'developer' : 'premium'} />
            )}
            <StreakBadge streak={profile.current_streak || 0} size="medium" />
          </View>
          <Text style={styles.username}>@{profile.username}</Text>

          <View style={styles.followCounts}>
            <TouchableOpacity
              onPress={() => {
                setFollowersModalType('followers')
                setFollowersModalVisible(true)
              }}
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
            >
              <Text style={styles.followText}>
                <Text style={styles.followNumber}>{followingCount}</Text> following
              </Text>
            </TouchableOpacity>
          </View>

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {/* Follow Button */}
          {!isOwnProfile && user && (
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? Colors.text : Colors.background} />
              ) : (
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'following' : 'follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.totalGames}</Text>
            <Text style={styles.statLabel}>games</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>completed</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.playing}</Text>
            <Text style={styles.statLabel}>playing</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.averageRating ? stats.averageRating : '—'}</Text>
            <Text style={styles.statLabel}>avg rating</Text>
          </View>
        </View>

        {/* Rank */}
        <View style={styles.ranksSection}>
          <XPProgressBar levelInfo={getLevel(calculateXP(gameLogs, followerCount))} />
        </View>

        {/* Favorites */}
        <View style={styles.section}>
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
                  >
                    {coverUrl ? (
                      <Image source={{ uri: coverUrl }} style={styles.favoriteCover} />
                    ) : (
                      <View style={[styles.favoriteCover, styles.favoriteCoverPlaceholder]}>
                        <Ionicons name="game-controller-outline" size={20} color={Colors.textDim} />
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
          <View style={styles.recentlyLoggedSection}>
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
                >
                  {log.game?.cover_url ? (
                    <Image
                      source={{ uri: getIGDBImageUrl(log.game.cover_url, 'coverBig2x') }}
                      style={styles.recentlyLoggedCover}
                    />
                  ) : (
                    <View style={[styles.recentlyLoggedCover, styles.gameCoverPlaceholder]}>
                      <Ionicons name="game-controller-outline" size={20} color={Colors.textDim} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Lists - Only show if user has public lists */}
        {publicLists.length > 0 && (
          <View style={styles.listsSection}>
            <Text style={styles.sectionTitle}>Lists</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.listsScroll}
              contentContainerStyle={styles.listsContent}
            >
              {publicLists.slice(0, 5).map((list) => (
                <View key={list.id} style={styles.listCardWrapper}>
                  <ListCard
                    list={list}
                    onPress={() => handleListPress(list.id)}
                    showUser={true}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Library */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Library</Text>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterTabsContainer}
            contentContainerStyle={styles.filterTabsContent}
          >
            {filterTabs.map((tab) => {
              const count = getStatusCount(tab.key)
              const isSelected = selectedFilter === tab.key
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.filterTab,
                    isSelected && styles.filterTabSelected,
                    count === 0 && !isSelected && styles.filterTabDimmed,
                  ]}
                  onPress={() => setSelectedFilter(tab.key)}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      isSelected && styles.filterTabTextSelected,
                      count === 0 && !isSelected && styles.filterTabTextDimmed,
                    ]}
                  >
                    {tab.label} ({count})
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {filteredGameLogs.length > 0 ? (
            <View style={styles.gamesGrid}>
              {filteredGameLogs.map((log) => (
                <TouchableOpacity
                  key={log.id}
                  style={styles.gameCard}
                  onPress={() => handleGamePress(log.game_id)}
                >
                  {log.game?.cover_url ? (
                    <Image
                      source={{ uri: getIGDBImageUrl(log.game.cover_url, 'coverBig2x') }}
                      style={styles.gameCover}
                    />
                  ) : (
                    <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
                      <Ionicons name="game-controller-outline" size={20} color={Colors.textDim} />
                    </View>
                  )}
                  {log.rating && (
                    <View style={styles.ratingBelow}>
                      <StarRating rating={log.rating} size={12} filledOnly />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="game-controller-outline" size={48} color={Colors.textDim} />
              <Text style={styles.emptyText}>
                {gameLogs.length === 0 ? 'No games logged yet' : 'No games in this category'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Followers/Following Modal */}
      {profile && (
        <FollowersModal
          visible={followersModalVisible}
          onClose={() => setFollowersModalVisible(false)}
          userId={profile.id}
          type={followersModalType}
        />
      )}
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
    paddingHorizontal: Spacing.lg,
  },
  bannerContainer: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  bannerPlaceholder: {
    height: 0,
  },
  profileSectionWithBanner: {
    marginTop: -40,
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
  followCounts: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
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
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    minWidth: 120,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  followButtonText: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.background,
    fontSize: FontSize.md,
  },
  followingButtonText: {
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
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
    color: Colors.text,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  ranksSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  recentlyLoggedSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  recentlyLoggedScroll: {
    marginHorizontal: -Spacing.lg,
  },
  recentlyLoggedContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  recentlyLoggedCard: {
    width: 105,
  },
  recentlyLoggedCover: {
    width: 105,
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  filterTabSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
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
    color: Colors.background,
  },
  filterTabTextDimmed: {
    color: Colors.textDim,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gameCard: {
    width: '30%',
    marginBottom: Spacing.sm,
  },
  gameCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
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
    marginTop: Spacing.xs,
    alignItems: 'center',
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
    gap: Spacing.md,
  },
  favoriteSlot: {
    flex: 1,
    maxWidth: '31%',
  },
  favoriteCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.accent,
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
