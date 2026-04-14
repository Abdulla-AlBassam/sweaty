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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, CommonActions, useScrollToTop } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../contexts/AuthContext'
import { useGameLogs, useFollowCounts } from '../hooks/useSupabase'
import { useUserLists } from '../hooks/useLists'
import { usePremium } from '../hooks/usePremium'
import { calculateXP, getLevel } from '../lib/xp'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, STATUS_LABELS } from '../constants'
import { supabase } from '../lib/supabase'
import XPProgressBar from '../components/XPProgressBar'
import LogGameModal from '../components/LogGameModal'
import EditFavoritesModal from '../components/EditFavoritesModal'
import FollowersModal from '../components/FollowersModal'
import CreateListModal from '../components/CreateListModal'
import ListCard from '../components/ListCard'
import StarRating from '../components/StarRating'
import PremiumBadge from '../components/PremiumBadge'
import StreakBadge from '../components/StreakBadge'
import PlatformBadges from '../components/PlatformBadges'
import SweatDropIcon from '../components/SweatDropIcon'
import LibraryFilterModal, {
  LibraryFilterType,
  LibrarySortType,
} from '../components/LibraryFilterModal'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// Calculate game card width for 4-column grid with proper gaps
const GRID_PADDING = Spacing.screenPadding * 2  // 32px total horizontal padding
const GRID_GAP = 8                              // Smaller gap for more columns
const GRID_GAPS = GRID_GAP * 3                  // 3 gaps for 4 columns
const GAME_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING - GRID_GAPS) / 4

const FAV_GAP = Spacing.xs
const FAV_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING - FAV_GAP * 4) / 5
const FAVORITE_SLOTS = [0, 1, 2, 3, 4] as const

interface FavoriteGame {
  id: number
  name: string
  cover_url: string | null
}

interface GameLogWithGame {
  id: string
  game_id: number
  status: string
  rating: number | null
  platform: string | null
  review: string | null
  game: {
    id: number
    name: string
    cover_url: string | null
    platforms?: string[]
    first_release_date?: string | null
  }
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { user, profile, refreshProfile } = useAuth()
  const { logs, refetch: refreshLogs } = useGameLogs(user?.id)
  const { followers, following } = useFollowCounts(user?.id)
  const { lists: userLists, refetch: refetchLists } = useUserLists(user?.id)
  const navigation = useNavigation()
  const scrollRef = useRef<ScrollView>(null)
  const scrollY = useRef(new Animated.Value(0)).current
  useScrollToTop(scrollRef)

  const [gameLogs, setGameLogs] = useState<GameLogWithGame[]>([])
  const [selectedGame, setSelectedGame] = useState<GameLogWithGame | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteGame[]>([])
  const [isFavoritesModalVisible, setIsFavoritesModalVisible] = useState(false)
  const [isCreateListModalVisible, setIsCreateListModalVisible] = useState(false)
  const [followersModalVisible, setFollowersModalVisible] = useState(false)
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [avatarExpanded, setAvatarExpanded] = useState(false)

  // Advanced filter state
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false)
  const [advancedFilter, setAdvancedFilter] = useState<LibraryFilterType>('all')
  const [sortType, setSortType] = useState<LibrarySortType>('recent')

  const displayName = profile?.display_name || profile?.username || 'Gamer'

  // Premium status
  const { isPremium } = usePremium(
    profile?.subscription_tier,
    profile?.subscription_expires_at
  )

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

  // Filter and sort game logs
  const filteredGameLogs = useMemo(() => {
    let filtered = [...gameLogs]

    // Apply status filter (from pills)
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(log => log.status === selectedFilter)
    }

    // Apply advanced filter
    const playedStatuses = ['playing', 'played', 'completed', 'dropped']
    const backlogStatuses = ['want_to_play', 'on_hold']

    switch (advancedFilter) {
      case 'played':
        filtered = filtered.filter(log => playedStatuses.includes(log.status))
        break
      case 'backlog':
        filtered = filtered.filter(log => backlogStatuses.includes(log.status))
        break
      case 'reviewed':
        filtered = filtered.filter(log => log.review && log.review.trim().length > 0)
        break
      case 'unrated':
        filtered = filtered.filter(log => log.rating === null)
        break
    }

    // Apply sort
    switch (sortType) {
      case 'recent':
        // Already sorted by updated_at from fetch
        break
      case 'oldest':
        filtered.reverse()
        break
      case 'rating_high':
        filtered.sort((a, b) => {
          if (a.rating !== null && b.rating !== null) return b.rating - a.rating
          if (a.rating !== null) return -1
          if (b.rating !== null) return 1
          return 0
        })
        break
      case 'rating_low':
        filtered.sort((a, b) => {
          if (a.rating !== null && b.rating !== null) return a.rating - b.rating
          if (a.rating !== null) return -1
          if (b.rating !== null) return 1
          return 0
        })
        break
      case 'release_newest':
        filtered.sort((a, b) => {
          const dateA = a.game?.first_release_date ? new Date(a.game.first_release_date).getTime() : 0
          const dateB = b.game?.first_release_date ? new Date(b.game.first_release_date).getTime() : 0
          if (dateA === 0 && dateB === 0) return 0
          if (dateA === 0) return 1
          if (dateB === 0) return -1
          return dateB - dateA
        })
        break
      case 'release_oldest':
        filtered.sort((a, b) => {
          const dateA = a.game?.first_release_date ? new Date(a.game.first_release_date).getTime() : Infinity
          const dateB = b.game?.first_release_date ? new Date(b.game.first_release_date).getTime() : Infinity
          if (dateA === Infinity && dateB === Infinity) return 0
          if (dateA === Infinity) return 1
          if (dateB === Infinity) return -1
          return dateA - dateB
        })
        break
      case 'alphabetical_az':
        filtered.sort((a, b) => {
          const nameA = a.game?.name?.toLowerCase() || ''
          const nameB = b.game?.name?.toLowerCase() || ''
          return nameA.localeCompare(nameB)
        })
        break
      case 'alphabetical_za':
        filtered.sort((a, b) => {
          const nameA = a.game?.name?.toLowerCase() || ''
          const nameB = b.game?.name?.toLowerCase() || ''
          return nameB.localeCompare(nameA)
        })
        break
    }

    return filtered
  }, [gameLogs, selectedFilter, advancedFilter, sortType])

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

  const username = profile?.username || ''

  // Calculate stats
  const totalGames = logs.length
  const completed = logs.filter((l) => l.status === 'completed').length
  const playing = logs.filter((l) => l.status === 'playing').length
  const played = logs.filter((l) => l.status === 'played').length
  const wantToPlay = logs.filter((l) => l.status === 'want_to_play').length
  const onHold = logs.filter((l) => l.status === 'on_hold').length
  const dropped = logs.filter((l) => l.status === 'dropped').length
  const ratings = logs.filter((l) => l.rating).map((l) => l.rating as number)
  const avgRating = ratings.length > 0
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
    : '—'

  // Calculate XP
  const totalXP = calculateXP(logs, followers)
  const levelInfo = getLevel(totalXP)

  // Fetch game logs with game details
  const fetchGameLogs = useCallback(async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('game_logs')
        .select(`
          id,
          game_id,
          status,
          rating,
          platform,
          review,
          game:games_cache(id, name, cover_url, platforms, first_release_date)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (data) {
        const logsWithGames = data.map((log: any) => ({
          ...log,
          game: Array.isArray(log.game) ? log.game[0] : log.game
        })).filter((log: any) => log.game) as GameLogWithGame[]

        setGameLogs(logsWithGames)
      }
    } catch (error) {
      console.error('Error fetching game logs:', error)
    }
  }, [user])

  useEffect(() => {
    fetchGameLogs()
  }, [fetchGameLogs])

  // Fetch favorite games
  const fetchFavorites = useCallback(async () => {
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
  }, [profile?.favorite_games])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      refreshProfile(),
      fetchGameLogs(),
      fetchFavorites(),
      refreshLogs(),
      refetchLists(),
    ])
    setRefreshing(false)
  }, [refreshProfile, fetchGameLogs, fetchFavorites, refreshLogs, refetchLists])

  // Filter modal handlers
  const handleResetFilters = () => {
    setAdvancedFilter('all')
    setSortType('recent')
    setSelectedFilter('all')
  }

  // Check if any advanced filters are active (for showing indicator)
  const hasActiveAdvancedFilters = advancedFilter !== 'all' || sortType !== 'recent'

  const handleFavoritesSaveSuccess = () => {
    refreshProfile()
  }

  const handleGamePress = (log: GameLogWithGame) => {
    setSelectedGame(log)
    setIsModalVisible(true)
  }

  const handleLogSaveSuccess = () => {
    fetchGameLogs()
    refreshLogs()
  }

  const handleListPress = (listId: string) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ListDetail',
        params: { listId },
      })
    )
  }

  const handleListCreated = () => {
    refetchLists()
  }

  const hasBanner = !!profile?.banner_url
  const profileBannerHeight = SCREEN_HEIGHT * 0.25 + insets.top

  return (
    <View style={styles.container}>
      {/* Fixed header - fades out when banner scrolls away */}
      <Animated.View style={[styles.fixedHeader, {
        opacity: scrollY.interpolate({
          inputRange: [0, profileBannerHeight * 0.5],
          outputRange: [1, 0],
          extrapolate: 'clamp',
        }),
      }]} pointerEvents="box-none">
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]} pointerEvents="auto">
          <Text style={styles.headerTitle}>profile</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as never)}
            style={styles.settingsButton}
            accessibilityLabel="Settings"
            accessibilityRole="button"
            accessibilityHint="Opens profile settings"
          >
            <View style={styles.iconBackdrop}><Ionicons name="settings-outline" size={20} color={Colors.text} /></View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
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
        {/* Full-bleed banner */}
        {hasBanner ? (
          <Animated.View style={[styles.bannerContainer, { height: profileBannerHeight }, {
            transform: [
              { translateY: scrollY.interpolate({ inputRange: [-200, 0], outputRange: [-100, 0], extrapolateRight: 'clamp' }) },
              { scale: scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.5, 1], extrapolateRight: 'clamp' }) },
            ],
          }]}>
            <Image
              source={{ uri: profile!.banner_url! }}
              style={styles.banner}
              resizeMode="cover"
              accessibilityLabel="Profile banner"
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
        ) : (
          <View style={{ height: insets.top + Spacing.lg + 28 + Spacing.md }} />
        )}

        {/* Profile Info - Vertical Layout */}
        <View style={[styles.profileSection, profile?.banner_url && styles.profileSectionWithBanner]}>
          <Pressable onPress={() => profile?.avatar_url && setAvatarExpanded(true)}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} accessible={false} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{displayName}</Text>
            {profile?.gaming_platforms && profile.gaming_platforms.length > 0 && (
              <PlatformBadges platforms={profile.gaming_platforms} size="small" />
            )}
            {isPremium && <PremiumBadge size="small" variant={username === 'abdulla' ? 'developer' : 'premium'} />}
            {(profile?.current_streak || 0) > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('StreakInfo' as never)}
                activeOpacity={0.7}
                accessibilityLabel="View streak details"
                accessibilityRole="button"
              >
                <StreakBadge streak={profile?.current_streak || 0} size="medium" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.username}>@{username}</Text>

          <View style={styles.followCounts}>
            <TouchableOpacity
              onPress={() => {
                setFollowersModalType('followers')
                setFollowersModalVisible(true)
              }}
              accessibilityLabel={followers + ' followers'}
              accessibilityRole="button"
              accessibilityHint="Shows followers list"
            >
              <Text style={styles.followText}>
                <Text style={styles.followNumber}>{followers}</Text> followers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setFollowersModalType('following')
                setFollowersModalVisible(true)
              }}
              accessibilityLabel={following + ' following'}
              accessibilityRole="button"
              accessibilityHint="Shows following list"
            >
              <Text style={styles.followText}>
                <Text style={styles.followNumber}>{following}</Text> following
              </Text>
            </TouchableOpacity>
          </View>

          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Stats + Level Ring */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalGames}</Text>
            <Text style={styles.statLabel}>games</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completed}</Text>
            <Text style={styles.statLabel}>completed</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('RankProgress' as never)} activeOpacity={0.7}>
            <XPProgressBar levelInfo={levelInfo} />
          </TouchableOpacity>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{playing}</Text>
            <Text style={styles.statLabel}>playing</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{avgRating}</Text>
            <Text style={styles.statLabel}>avg rating</Text>
          </View>
        </View>

        {/* Favorites */}
        <View style={[styles.favoritesSection, { backgroundColor: Colors.alternate }]}>
          <View style={styles.favoritesTitleRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Favorites</Text>
            <TouchableOpacity
              onPress={() => setIsFavoritesModalVisible(true)}
              style={styles.editButton}
              accessibilityLabel="Edit favorites"
              accessibilityRole="button"
              accessibilityHint="Opens favourite games editor"
            >
              <Ionicons name="pencil" size={16} color={Colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.favoritesRow}>
            {FAVORITE_SLOTS.map((index) => {
              const game = favorites[index]
              if (game) {
                const coverUrl = game.cover_url
                  ? getIGDBImageUrl(game.cover_url, 'coverBig2x')
                  : null
                return (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.favoriteSlot}
                    onPress={() => navigation.navigate('GameDetail', { gameId: game.id })}
                    accessibilityLabel={game.name}
                    accessibilityRole="button"
                    accessibilityHint="Opens game details"
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
              }
              return (
                <TouchableOpacity
                  key={`empty-${index}`}
                  style={styles.favoriteSlot}
                  onPress={() => setIsFavoritesModalVisible(true)}
                  accessibilityLabel="Add favorite game"
                  accessibilityRole="button"
                >
                  <View style={[styles.favoriteCover, styles.emptyFavoriteSlot]}>
                    <Ionicons name="add" size={20} color={Colors.textDim} />
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Recently Logged */}
        {gameLogs.length > 0 && (
          <View style={[styles.recentlyLoggedSection, { backgroundColor: Colors.background }]}>
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
                  onPress={() => handleGamePress(log)}
                  accessibilityLabel={log.game?.name || 'Game'}
                  accessibilityRole="button"
                  accessibilityHint="Opens game details"
                >
                  {log.game?.cover_url ? (
                    <Image
                      source={{ uri: getIGDBImageUrl(log.game.cover_url, 'coverBig2x') }}
                      style={styles.recentlyLoggedCover}
                      accessibilityLabel={(log.game?.name || 'Game') + ' cover art'}
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

        {/* Lists - only show if user has lists with games */}
        {(() => {
          // Filter out empty lists (no games)
          const listsWithGames = userLists.filter(
            (list) => list.preview_games && list.preview_games.length > 0
          )

          return listsWithGames.length > 0 ? (
            <View style={[styles.listsSection, { backgroundColor: Colors.alternate }]}>
              <View style={styles.listsTitleRow}>
                <Text style={styles.sectionTitle}>Lists</Text>
                <TouchableOpacity
                  onPress={() => setIsCreateListModalVisible(true)}
                  style={styles.newListButton}
                  accessibilityLabel="Create new list"
                  accessibilityRole="button"
                  accessibilityHint="Opens list creation form"
                >
                  <Ionicons name="add" size={20} color={Colors.textDim} />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.listsScroll}
                contentContainerStyle={styles.listsContent}
              >
                {listsWithGames.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    onPress={() => handleListPress(list.id)}
                    showUser={false}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null
        })()}

        {/* Library */}
        <View style={[styles.librarySection, { backgroundColor: Colors.background }]}>
          <Text style={styles.sectionTitle}>Library</Text>

          {gameLogs.length > 0 ? (
            <View style={styles.libraryRows}>
              {/* All Games */}
              <TouchableOpacity
                style={[styles.libraryRow, styles.libraryRowBorder]}
                onPress={() => {
                  if (user?.id) {
                    navigation.dispatch(
                      CommonActions.navigate({
                        name: 'LibraryStatus',
                        params: { userId: user.id, status: 'all' },
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
                const reviewCount = gameLogs.filter(l => l.review && l.review.trim().length > 0).length
                if (reviewCount === 0) return null
                return (
                  <TouchableOpacity
                    style={styles.libraryRow}
                    onPress={() => {
                      if (user?.id) {
                        navigation.dispatch(
                          CommonActions.navigate({
                            name: 'UserReviews',
                            params: { userId: user.id },
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
              <Text style={styles.emptySubtext}>Search for games to start tracking!</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Log Game Modal */}
      {selectedGame && (
        <LogGameModal
          visible={isModalVisible}
          onClose={() => {
            setIsModalVisible(false)
            setSelectedGame(null)
          }}
          game={{
            id: selectedGame.game_id,
            name: selectedGame.game.name,
            cover_url: selectedGame.game.cover_url,
            platforms: selectedGame.game.platforms,
          }}
          existingLog={{
            id: selectedGame.id,
            status: selectedGame.status,
            rating: selectedGame.rating,
            platform: selectedGame.platform,
            review: selectedGame.review,
          }}
          onSaveSuccess={handleLogSaveSuccess}
        />
      )}

      {/* Edit Favorites Modal */}
      {user && (
        <EditFavoritesModal
          visible={isFavoritesModalVisible}
          onClose={() => setIsFavoritesModalVisible(false)}
          currentFavorites={favorites}
          userId={user.id}
          onSaveSuccess={handleFavoritesSaveSuccess}
        />
      )}

      {/* Followers/Following Modal */}
      {user && (
        <FollowersModal
          visible={followersModalVisible}
          onClose={() => setFollowersModalVisible(false)}
          userId={user.id}
          type={followersModalType}
        />
      )}

      {/* Avatar Lightbox */}
      <Modal visible={avatarExpanded} transparent animationType="fade" onRequestClose={() => setAvatarExpanded(false)}>
        <Pressable style={styles.avatarModalOverlay} onPress={() => setAvatarExpanded(false)}>
          <Image source={{ uri: profile?.avatar_url || '' }} style={styles.avatarModalImage} />
        </Pressable>
      </Modal>

      {/* Create List Modal */}
      <CreateListModal
        visible={isCreateListModalVisible}
        onClose={() => setIsCreateListModalVisible(false)}
        onCreated={handleListCreated}
      />

      {/* Library Filter Modal */}
      <LibraryFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filterType={advancedFilter}
        sortType={sortType}
        onFilterChange={setAdvancedFilter}
        onSortChange={setSortType}
        onReset={handleResetFilters}
      />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,          // 48px bottom padding
  },
  bannerContainer: {
    width: SCREEN_WIDTH,
    // Height set dynamically: SCREEN_HEIGHT * 0.30 + insets.top
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
    height: 140,
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    lineHeight: 28,
    color: Colors.cream,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  iconBackdrop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.screenPadding,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 40,
    color: Colors.cream,
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
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,                  // Smaller, consistent headers
    color: Colors.cream,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sectionHeaderBelow, // 16px below header
  },
  favoritesSection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  favoritesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  editButton: {
    padding: Spacing.sm,
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
  emptyFavoriteSlot: {
    borderStyle: 'dashed',
    borderColor: Colors.textDim,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentlyLoggedSection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  recentlyLoggedScroll: {
    marginHorizontal: -Spacing.screenPadding,
  },
  recentlyLoggedContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.cardGap,                   // 12px gap between cards
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
  librarySection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
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
    gap: GRID_GAP,                          // 8px gap for 4-column layout
  },
  gameCard: {
    width: GAME_CARD_WIDTH,                 // Calculated for even spacing
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  // Lists section styles
  listsSection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  listsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  newListButton: {
    padding: Spacing.sm,
  },
  listsScroll: {
    marginHorizontal: -Spacing.screenPadding,
  },
  listsContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.cardGap,                   // 12px gap between cards
  },
  listCardWrapper: {
    width: 280,
  },
  seeAllLists: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding,
  },
  seeAllListsText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: 'rgba(192, 200, 208, 0.6)',
  },
  emptyListsState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
  },
  emptyListsText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  createListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 200, 208, 0.18)',
    borderWidth: 1,
    borderColor: Colors.cream,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  createListButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.cream,
    marginLeft: Spacing.xs,
  },
})
