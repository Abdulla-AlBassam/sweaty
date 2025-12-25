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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl, STATUS_LABELS } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MainStackParamList } from '../navigation'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { calculateGamerXP, getGamerLevel, calculateSocialXP, getSocialLevel } from '../lib/xp'
import FollowersModal from '../components/FollowersModal'
import StarRating from '../components/StarRating'
import XPProgressBar from '../components/XPProgressBar'
import { ProfileSkeleton } from '../components/skeletons'

type Props = NativeStackScreenProps<MainStackParamList, 'UserProfile'>

interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  favorite_games?: number[] | null
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

  const isOwnProfile = user?.id === profile?.id

  // Filter tabs configuration
  const filterTabs = [
    { key: 'all', label: 'all' },
    { key: 'playing', label: 'playing' },
    { key: 'completed', label: 'completed' },
    { key: 'played', label: 'played' },
    { key: 'want_to_play', label: 'want to play' },
    { key: 'on_hold', label: 'on hold' },
    { key: 'dropped', label: 'dropped' },
  ]

  // Get count for each status
  const getStatusCount = (status: string) => {
    if (status === 'all') return gameLogs.length
    return gameLogs.filter(log => log.status === status).length
  }

  // Filter game logs based on selected filter
  const filteredGameLogs = selectedFilter === 'all'
    ? gameLogs
    : gameLogs.filter(log => log.status === selectedFilter)

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

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      fetchProfile(),
      fetchGameLogs(),
      fetchFollowCounts(),
      fetchFavorites(),
    ])
    setRefreshing(false)
  }, [profile])

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
        {/* Profile Info - Horizontal Layout */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarColumn}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={32} color={Colors.textDim} />
                </View>
              )}
              {/* Follow Button below avatar */}
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
            <View style={styles.profileDetails}>
              <Text style={styles.displayName}>
                {profile.display_name || profile.username}
              </Text>
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
            </View>
          </View>
          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
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
            <Text style={styles.statValue}>{stats.averageRating ? `★ ${stats.averageRating}` : '—'}</Text>
            <Text style={styles.statLabel}>avg rating</Text>
          </View>
        </View>

        {/* Ranks */}
        <View style={styles.ranksSection}>
          <Text style={styles.sectionTitle}>ranks</Text>
          <XPProgressBar type="gamer" levelInfo={getGamerLevel(calculateGamerXP(gameLogs))} />
          <XPProgressBar type="social" levelInfo={getSocialLevel(calculateSocialXP(gameLogs, followerCount))} />
        </View>

        {/* Favorites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>favorites</Text>
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
              <Text style={styles.emptyFavoritesText}>no favorites yet</Text>
            </View>
          )}
        </View>

        {/* Game Library */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>game library</Text>

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
                    <View style={styles.ratingBadge}>
                      <StarRating rating={log.rating} size={10} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="game-controller-outline" size={48} color={Colors.textDim} />
              <Text style={styles.emptyText}>
                {gameLogs.length === 0 ? 'no games logged yet' : 'no games in this category'}
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
    paddingBottom: Spacing.xxl,
  },
  profileSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarColumn: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    flex: 1,
    marginLeft: Spacing.lg,
    justifyContent: 'center',
  },
  displayName: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  username: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  followCounts: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  followText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  followNumber: {
    fontWeight: '600',
    color: Colors.text,
  },
  bio: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  followButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    minWidth: 80,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  followButtonText: {
    color: Colors.background,
    fontSize: FontSize.sm,
    fontWeight: '600',
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
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  ranksSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
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
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  filterTabTextSelected: {
    color: Colors.background,
    fontWeight: '600',
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
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
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
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
})
