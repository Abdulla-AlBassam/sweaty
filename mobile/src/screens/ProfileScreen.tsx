import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BANNER_HEIGHT = 180

// Calculate game card width for 4-column grid with proper gaps
const GRID_PADDING = Spacing.screenPadding * 2  // 32px total horizontal padding
const GRID_GAP = 8                              // Smaller gap for more columns
const GRID_GAPS = GRID_GAP * 3                  // 3 gaps for 4 columns
const GAME_CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING - GRID_GAPS) / 4

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
  const { user, profile, refreshProfile } = useAuth()
  const { logs, refetch: refreshLogs } = useGameLogs(user?.id)
  const { followers, following } = useFollowCounts(user?.id)
  const { lists: userLists, refetch: refetchLists } = useUserLists(user?.id)
  const navigation = useNavigation()
  const scrollRef = useRef<ScrollView>(null)
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

  // Advanced filter state
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false)
  const [advancedFilter, setAdvancedFilter] = useState<LibraryFilterType>('all')
  const [sortType, setSortType] = useState<LibrarySortType>('rating')

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
      case 'rating':
        filtered.sort((a, b) => {
          if (a.rating !== null && b.rating !== null) return b.rating - a.rating
          if (a.rating !== null) return -1
          if (b.rating !== null) return 1
          return 0
        })
        break
      case 'recent':
        // Already sorted by updated_at from fetch, no need to re-sort
        break
      case 'alphabetical':
        filtered.sort((a, b) => {
          const nameA = a.game?.name?.toLowerCase() || ''
          const nameB = b.game?.name?.toLowerCase() || ''
          return nameA.localeCompare(nameB)
        })
        break
      case 'release_date':
        filtered.sort((a, b) => {
          const dateA = a.game?.first_release_date ? new Date(a.game.first_release_date).getTime() : 0
          const dateB = b.game?.first_release_date ? new Date(b.game.first_release_date).getTime() : 0
          // Newest first, games without dates go to the end
          if (dateA === 0 && dateB === 0) return 0
          if (dateA === 0) return 1
          if (dateB === 0) return -1
          return dateB - dateA
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
    setSortType('rating')
    setSelectedFilter('all')
  }

  // Check if any advanced filters are active (for showing indicator)
  const hasActiveAdvancedFilters = advancedFilter !== 'all' || sortType !== 'rating'

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={'#F0E4D0'}
            colors={['#F0E4D0']}
          />
        }
      >
        {/* Banner with Header */}
        {profile?.banner_url ? (
          <View style={styles.bannerContainer}>
            <Image
              source={{ uri: profile.banner_url }}
              style={styles.banner}
              resizeMode="cover"
              accessibilityLabel="Profile banner"
            />
            {/* Gradient overlay for blending */}
            <LinearGradient
              colors={[Colors.gradientSubtle, Colors.gradientMedium, Colors.background]}
              locations={[0, 0.5, 1]}
              style={styles.bannerGradient}
            />
            {/* Header overlaid on banner */}
            <View style={styles.headerOverBanner}>
              <Text style={styles.headerTitle}>profile</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings' as never)}
                style={styles.settingsButton}
                accessibilityLabel="Settings"
                accessibilityRole="button"
                accessibilityHint="Opens profile settings"
              >
                <Ionicons name="settings-outline" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.bannerPlaceholder} />
            {/* Header without banner */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>profile</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings' as never)}
                style={styles.settingsButton}
                accessibilityLabel="Settings"
                accessibilityRole="button"
                accessibilityHint="Opens profile settings"
              >
                <Ionicons name="settings-outline" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Profile Info - Vertical Layout */}
        <View style={[styles.profileSection, profile?.banner_url && styles.profileSectionWithBanner]}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} accessible={false} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{displayName}</Text>
            {profile?.gaming_platforms && profile.gaming_platforms.length > 0 && (
              <PlatformBadges platforms={profile.gaming_platforms} size="small" />
            )}
            {isPremium && <PremiumBadge size="small" variant={username === 'abdulla' ? 'developer' : 'premium'} />}
            <StreakBadge streak={profile?.current_streak || 0} size="medium" />
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

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalGames}</Text>
            <Text style={styles.statLabel}>games</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completed}</Text>
            <Text style={styles.statLabel}>completed</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{playing}</Text>
            <Text style={styles.statLabel}>playing</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{avgRating}</Text>
            <Text style={styles.statLabel}>avg rating</Text>
          </View>
        </View>


        {/* Rank */}
        <View style={styles.ranksSection}>
          <XPProgressBar levelInfo={levelInfo} />
        </View>

        {/* Favorites */}
        <View style={styles.favoritesSection}>
          <View style={styles.favoritesTitleRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Favorites</Text>
            <TouchableOpacity
              onPress={() => setIsFavoritesModalVisible(true)}
              style={styles.editButton}
              accessibilityLabel="Edit favorites"
              accessibilityRole="button"
              accessibilityHint="Opens favourite games editor"
            >
              <Text style={styles.editButtonText}>Edit</Text>
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
            <View style={styles.listsSection}>
              <View style={styles.listsTitleRow}>
                <Text style={styles.sectionTitle}>Lists</Text>
                <TouchableOpacity
                  onPress={() => setIsCreateListModalVisible(true)}
                  style={styles.newListButton}
                  accessibilityLabel="Create new list"
                  accessibilityRole="button"
                  accessibilityHint="Opens list creation form"
                >
                  <Ionicons name="add" size={18} color={'rgba(240, 228, 208, 0.6)'} />
                  <Text style={styles.newListButtonText}>New</Text>
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
        <View style={styles.librarySection}>
          <Text style={styles.sectionTitle}>Library</Text>

          {groupedLogs.length > 0 ? (
            <View style={styles.libraryRows}>
              {groupedLogs.map((group, index) => (
                <TouchableOpacity
                  key={group.status}
                  style={[
                    styles.libraryRow,
                    index < groupedLogs.length - 1 && styles.libraryRowBorder,
                  ]}
                  onPress={() => {
                    if (user?.id) {
                      navigation.dispatch(
                        CommonActions.navigate({
                          name: 'LibraryStatus',
                          params: { userId: user.id, status: group.status },
                        })
                      )
                    }
                  }}
                  accessibilityLabel={group.label + ', ' + group.logs.length + ' games'}
                  accessibilityRole="button"
                >
                  <Text style={styles.libraryRowLabel}>{group.label}</Text>
                  <View style={styles.libraryRowRight}>
                    <Text style={styles.libraryRowCount}>{group.logs.length}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <SweatDropIcon size={48} variant="static" />
              <Text style={styles.emptyText}>No games logged yet</Text>
              <Text style={styles.emptySubtext}>Search for games to start tracking!</Text>
            </View>
          )}
        </View>
      </ScrollView>

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
    paddingBottom: Spacing.xxxl,          // 48px bottom padding
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
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  bannerPlaceholder: {
    height: 0,
  },
  headerOverBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.cream,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  settingsButton: {
    padding: Spacing.sm,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.screenPadding,
  },
  profileSectionWithBanner: {
    marginTop: -60,
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
    color: '#F0E4D0',
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
  editButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: 'rgba(240, 228, 208, 0.6)',
  },
  favoritesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  favoriteSlot: {
    flex: 1,
  },
  favoriteCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.md,
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
    paddingTop: Spacing.xxl,                // 32px above section
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
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  librarySection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xxl,
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
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
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
    paddingTop: Spacing.xxl,                // 32px above section
  },
  listsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  newListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  newListButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: 'rgba(240, 228, 208, 0.6)',
    marginLeft: 4,
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
    color: 'rgba(240, 228, 208, 0.6)',
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
    backgroundColor: 'rgba(240, 228, 208, 0.18)',
    borderWidth: 1,
    borderColor: '#F0E4D0',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  createListButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: '#F0E4D0',
    marginLeft: Spacing.xs,
  },
})
