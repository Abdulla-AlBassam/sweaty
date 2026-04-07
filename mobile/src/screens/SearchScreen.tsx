import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  Image,
  RefreshControl,
  Dimensions,
  Animated,
  Easing,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, CommonActions, useScrollToTop } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { MainStackParamList } from '../navigation'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'

// ── COLOR SCHEME TEST (mirrors DashboardScreen) ───────────
const TestBg = {
  background: '#1A1A1C',
  surface: '#2A2A2E',
  surfaceLight: '#333338',
  border: '#2E2E32',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  textDim: '#999999',
  textMuted: '#A3A3A3',
}
// ── END COLOR SCHEME TEST ─────────────────────────────────
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCuratedLists } from '../hooks/useSupabase'
import { usePlatformFilter } from '../hooks/usePlatformFilter'
import { usePublicLists } from '../hooks/useLists'
import GameCard from '../components/GameCard'
import HorizontalGameList from '../components/HorizontalGameList'
import CuratedListRow from '../components/CuratedListRow'
import UserListRow from '../components/UserListRow'
import SweatDropIcon from '../components/SweatDropIcon'
import PressableScale from '../components/PressableScale'
import { SkeletonCircle, SkeletonText } from '../components/Skeleton'
import { GameCardSkeletonGrid } from '../components/skeletons'

// Calculate card width to match CuratedListDetailScreen grid
const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_PADDING = Spacing.lg * 2 // padding on both sides
const GAP = Spacing.md
const NUM_COLUMNS = 3
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

type SearchFilter = 'games' | 'users' | 'lists'

interface SearchGame {
  id: number
  name: string
  coverUrl?: string | null
  cover_url?: string | null
}

interface SearchUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface DiscoveryGame {
  id: number
  name: string
  coverUrl?: string | null
  cover_url?: string | null
}

interface SearchCuratedList {
  id: string
  slug: string
  title: string
  description: string | null
  game_ids: number[]
  game_count: number
  preview_games: Array<{
    id: number
    cover_url: string | null
  }>
}

interface SearchUserList {
  id: string
  title: string
  description: string | null
  is_public: boolean
  item_count: number
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  preview_games: Array<{
    id: number
    cover_url: string | null
  }>
}

const RECENT_SEARCHES_KEY = 'sweaty_recent_searches'
const MAX_RECENT_SEARCHES = 5

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)
  const { user } = useAuth()
  const { platforms, platformsParam, excludePcOnly } = usePlatformFilter()
  const { lists: curatedLists, refetch: refetchLists } = useCuratedLists(excludePcOnly)
  const { lists: publicLists, isLoading: isLoadingPublicLists, refetch: refetchPublicLists } = usePublicLists()

  // Toggle between curated lists and community user lists
  type BrowseMode = 'curated' | 'community'
  const [browseMode, setBrowseMode] = useState<BrowseMode>('curated')

  // Track whether user has used AI before
  const [hasUsedAI, setHasUsedAI] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('sweaty_ai_used').then((value) => {
      if (value) setHasUsedAI(true)
    })
  }, [])

  // Shimmer animation for "Ask Sweaty" text
  // useNativeDriver: false is required here because this animates a color
  // property (text color via interpolate), which is not supported by the
  // native animation driver.
  const shimmerAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (hasUsedAI) return
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.delay(3000),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.delay(1000),
      ])
    )
    shimmer.start()
    return () => shimmer.stop()
  }, [])

  const [query, setQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('games')
  const [gameResults, setGameResults] = useState<SearchGame[]>([])
  const [userResults, setUserResults] = useState<SearchUser[]>([])
  const [curatedListResults, setCuratedListResults] = useState<SearchCuratedList[]>([])
  const [userListResults, setUserListResults] = useState<SearchUserList[]>([])
  const [recentSearches, setRecentSearches] = useState<SearchGame[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Discovery section states
  const [trendingGames, setTrendingGames] = useState<DiscoveryGame[]>([])
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [communityGames, setCommunityGames] = useState<DiscoveryGame[]>([])
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true)

  // Load discovery sections and recent searches on mount
  useEffect(() => {
    loadRecentSearches()
    loadTrendingGames()
    loadCommunityGames()
  }, [])

  // Load trending games from IGDB (global trending)
  const loadTrendingGames = async () => {
    try {
      setIsLoadingTrending(true)
      const response = await fetch(`${API_CONFIG.baseUrl}/api/popular-games?limit=15`)
      if (!response.ok) throw new Error('Failed to fetch trending games')
      const data = await response.json()
      setTrendingGames(data.games || [])
    } catch (err) {
      console.error('Failed to load trending games:', err)
    } finally {
      setIsLoadingTrending(false)
    }
  }

  // Load community popular games - most logged games by Sweaty users, sorted by PopScore
  const loadCommunityGames = async () => {
    try {
      setIsLoadingCommunity(true)
      const response = await fetch(`${API_CONFIG.baseUrl}/api/community/popular?limit=15`)
      if (!response.ok) throw new Error('Failed to fetch community games')
      const data = await response.json()
      setCommunityGames(data.games || [])
    } catch (err) {
      console.error('Failed to load community games:', err)
    } finally {
      setIsLoadingCommunity(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      loadTrendingGames(),
      loadCommunityGames(),
      refetchLists(),
      refetchPublicLists(),
    ])
    setRefreshing(false)
  }, [refetchLists, refetchPublicLists])

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch (err) {
      console.error('Failed to load recent searches:', err)
    }
  }

  const saveRecentSearch = async (game: SearchGame) => {
    try {
      const updated = [
        game,
        ...recentSearches.filter((g) => g.id !== game.id),
      ].slice(0, MAX_RECENT_SEARCHES)
      setRecentSearches(updated)
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to save recent search:', err)
    }
  }

  // Search for users in Supabase
  const searchUsers = async (searchQuery: string): Promise<SearchUser[]> => {
    try {
      let dbQuery = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(5)

      // Exclude current user
      if (user) {
        dbQuery = dbQuery.neq('id', user.id)
      }

      const { data, error } = await dbQuery

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('User search error:', err)
      return []
    }
  }

  // Search for curated lists
  const searchCuratedLists = async (searchQuery: string): Promise<SearchCuratedList[]> => {
    try {
      const { data, error } = await supabase
        .from('curated_lists')
        .select('id, slug, title, description, game_ids, is_active')
        .eq('is_active', true)
        .ilike('title', `%${searchQuery}%`)
        .order('display_order', { ascending: true })
        .limit(10)

      if (error) throw error

      // For each list, get first 3 game covers for preview
      const listsWithPreviews = await Promise.all(
        (data || []).map(async (list: any) => {
          const gameIds = list.game_ids?.slice(0, 3) || []
          let preview_games: Array<{ id: number; cover_url: string | null }> = []

          if (gameIds.length > 0) {
            const { data: gamesData } = await supabase
              .from('games_cache')
              .select('id, cover_url')
              .in('id', gameIds)

            // Maintain order from game_ids
            preview_games = gameIds
              .map((id: number) => gamesData?.find((g: any) => g.id === id))
              .filter(Boolean)
          }

          return {
            id: list.id,
            slug: list.slug,
            title: list.title,
            description: list.description,
            game_ids: list.game_ids || [],
            game_count: list.game_ids?.length || 0,
            preview_games,
          }
        })
      )

      return listsWithPreviews
    } catch (err) {
      console.error('Curated list search error:', err)
      return []
    }
  }

  // Search for user lists (public lists or user's own lists)
  const searchUserLists = async (searchQuery: string): Promise<SearchUserList[]> => {
    try {
      // Search public lists or user's own lists
      let query = supabase
        .from('lists')
        .select(`
          id, title, description, is_public, user_id,
          profiles!lists_user_id_fkey (id, username, display_name, avatar_url)
        `)
        .ilike('title', `%${searchQuery}%`)
        .limit(10)

      // If logged in, show public lists OR user's own lists
      if (user) {
        query = query.or(`is_public.eq.true,user_id.eq.${user.id}`)
      } else {
        query = query.eq('is_public', true)
      }

      const { data, error } = await query

      if (error) throw error

      // For each list, get item count and preview games
      const listsWithDetails: SearchUserList[] = await Promise.all(
        (data || []).map(async (list: any) => {
          // Get item count
          const { count } = await supabase
            .from('list_items')
            .select('id', { count: 'exact', head: true })
            .eq('list_id', list.id)

          // Get first 3 game covers for preview
          const { data: previewItems } = await supabase
            .from('list_items')
            .select('game_id, games_cache!list_items_game_id_fkey (id, cover_url)')
            .eq('list_id', list.id)
            .order('position', { ascending: true })
            .limit(3)

          const preview_games = (previewItems || [])
            .map((item: any) => item.games_cache)
            .filter(Boolean)

          return {
            id: list.id,
            title: list.title,
            description: list.description,
            is_public: list.is_public,
            item_count: count || 0,
            user: {
              id: list.profiles.id,
              username: list.profiles.username,
              display_name: list.profiles.display_name,
              avatar_url: list.profiles.avatar_url,
            },
            preview_games,
          }
        })
      )

      return listsWithDetails
    } catch (err) {
      console.error('User list search error:', err)
      return []
    }
  }

  // Debounced search for games, users, and lists
  useEffect(() => {
    if (!query || query.length < 2) {
      setGameResults([])
      setUserResults([])
      setCuratedListResults([])
      setUserListResults([])
      setError(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Build search URL with optional platform filter
        let searchUrl = `${API_CONFIG.baseUrl}/api/games/search?q=${encodeURIComponent(query)}`
        if (platformsParam) {
          searchUrl += `&platforms=${encodeURIComponent(platformsParam)}`
        }

        // Search games, users, and lists in parallel
        const [gamesResponse, users, curatedLists, userLists] = await Promise.all([
          fetch(searchUrl),
          searchUsers(query),
          searchCuratedLists(query),
          searchUserLists(query),
        ])

        if (!gamesResponse.ok) {
          throw new Error('Search failed')
        }

        const gamesData = await gamesResponse.json()
        setGameResults(gamesData.games || [])
        setUserResults(users)
        setCuratedListResults(curatedLists)
        setUserListResults(userLists)
      } catch (err) {
        setError('Failed to search')
        setGameResults([])
        setUserResults([])
        setCuratedListResults([])
        setUserListResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, platformsParam, user])

  const handleGamePress = (gameId: number) => {
    const game = gameResults.find((g) => g.id === gameId) || recentSearches.find((g) => g.id === gameId)
    if (game) {
      saveRecentSearch(game)
    }
    Keyboard.dismiss()

    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const handleUserPress = (userProfile: SearchUser) => {
    Keyboard.dismiss()
    navigation.dispatch(
      CommonActions.navigate({
        name: 'UserProfile',
        params: { username: userProfile.username, userId: userProfile.id },
      })
    )
  }

  const clearSearch = () => {
    setQuery('')
    setSearchFilter('games')
    setGameResults([])
    setUserResults([])
    setCuratedListResults([])
    setUserListResults([])
    Keyboard.dismiss()
  }

  const clearRecentSearches = async () => {
    setRecentSearches([])
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  const hasResults = userResults.length > 0 || gameResults.length > 0 || curatedListResults.length > 0 || userListResults.length > 0

  const handleCuratedListPress = (list: SearchCuratedList) => {
    Keyboard.dismiss()
    // Navigate to CuratedListDetail with the list info
    navigation.dispatch(
      CommonActions.navigate({
        name: 'CuratedListDetail',
        params: {
          listSlug: list.slug,
          listTitle: list.title,
          gameIds: list.game_ids,
        },
      })
    )
  }

  const handleUserListPress = (list: SearchUserList) => {
    Keyboard.dismiss()
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ListDetail',
        params: { listId: list.id },
      })
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={TestBg.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search games, users, lists..."
            placeholderTextColor={TestBg.textDim}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search for games, users, or lists"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton} accessibilityLabel="Clear search" accessibilityRole="button" accessibilityHint="Clears search and results">
              <Ionicons name="close-circle" size={18} color={TestBg.textDim} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        {query.length >= 2 && (
          <View style={styles.filterPills}>
            <TouchableOpacity
              style={[styles.filterPill, searchFilter === 'games' && styles.filterPillActive]}
              onPress={() => setSearchFilter('games')}
              accessibilityLabel="Games"
              accessibilityRole="button"
              accessibilityState={{ selected: searchFilter === 'games' }}
              accessibilityHint="Filters results to show games"
            >
              <Text style={[styles.filterPillText, searchFilter === 'games' && styles.filterPillTextActive]}>
                Games
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, searchFilter === 'users' && styles.filterPillActive]}
              onPress={() => setSearchFilter('users')}
              accessibilityLabel="Users"
              accessibilityRole="button"
              accessibilityState={{ selected: searchFilter === 'users' }}
              accessibilityHint="Filters results to show users"
            >
              <Text style={[styles.filterPillText, searchFilter === 'users' && styles.filterPillTextActive]}>
                Users
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, searchFilter === 'lists' && styles.filterPillActive]}
              onPress={() => setSearchFilter('lists')}
              accessibilityLabel="Lists"
              accessibilityRole="button"
              accessibilityState={{ selected: searchFilter === 'lists' }}
              accessibilityHint="Filters results to show lists"
            >
              <Text style={[styles.filterPillText, searchFilter === 'lists' && styles.filterPillTextActive]}>
                Lists
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.searchSkeletonContent}>
          {/* Users skeleton */}
          <View style={styles.section}>
            <SkeletonText width={60} height={16} style={styles.sectionTitleSkeleton} />
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.userRowSkeleton}>
                <SkeletonCircle size={44} />
                <View style={styles.userInfoSkeleton}>
                  <SkeletonText width={120} height={14} />
                  <SkeletonText width={80} height={12} style={{ marginTop: 6 }} />
                </View>
              </View>
            ))}
          </View>
          {/* Games skeleton */}
          <View style={styles.section}>
            <SkeletonText width={60} height={16} style={styles.sectionTitleSkeleton} />
            <GameCardSkeletonGrid count={6} cardWidth={100} />
          </View>
        </ScrollView>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hasResults ? (
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {/* Users Section - show when filter is 'users' */}
          {searchFilter === 'users' && userResults.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Users</Text>
              {userResults.map((userProfile) => (
                <TouchableOpacity
                  key={userProfile.id}
                  style={styles.userRow}
                  onPress={() => handleUserPress(userProfile)}
                  accessibilityLabel={'View ' + userProfile.username + ' profile'}
                  accessibilityRole="button"
                  accessibilityHint="Opens user profile"
                >
                  {userProfile.avatar_url ? (
                    <Image source={{ uri: userProfile.avatar_url }} style={styles.userAvatar} accessibilityLabel={userProfile.username + ' avatar'} />
                  ) : (
                    <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                      <Text style={styles.userAvatarText}>
                        {(userProfile.display_name || userProfile.username)[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userDisplayName}>
                      {userProfile.display_name || userProfile.username}
                    </Text>
                    <Text style={styles.userUsername}>@{userProfile.username}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={TestBg.textDim} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Games Section - show when filter is 'games' */}
          {searchFilter === 'games' && gameResults.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Games</Text>
              <View style={styles.gamesGrid}>
                {gameResults.map((game) => {
                  const coverUrl = game.coverUrl || game.cover_url
                  return (
                    <TouchableOpacity
                      key={game.id}
                      style={styles.gridItem}
                      onPress={() => handleGamePress(game.id)}
                      activeOpacity={0.7}
                      accessibilityLabel={game.name}
                      accessibilityRole="button"
                      accessibilityHint="Opens game details"
                    >
                      {coverUrl ? (
                        <Image
                          source={{ uri: getIGDBImageUrl(coverUrl, 'coverBig') }}
                          style={styles.gridCover}
                          accessibilityLabel={game.name + ' cover art'}
                        />
                      ) : (
                        <View style={[styles.gridCover, styles.gridPlaceholder]}>
                          <Text style={styles.gridPlaceholderText} numberOfLines={2}>
                            {game.name}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

          {/* Lists Section - show when filter is 'lists' */}
          {searchFilter === 'lists' && (
            <>
              {/* Curated Lists */}
              {curatedListResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Curated Lists</Text>
                  {curatedListResults.map((list) => (
                    <TouchableOpacity
                      key={list.id}
                      style={styles.listRow}
                      onPress={() => handleCuratedListPress(list)}
                      accessibilityLabel={list.title}
                      accessibilityRole="button"
                      accessibilityHint="Opens curated list"
                    >
                      {/* Preview game covers */}
                      <View style={styles.listPreviewCovers}>
                        {list.preview_games.length > 0 ? (
                          list.preview_games.slice(0, 3).map((game, index) => (
                            <Image
                              key={game.id}
                              source={{ uri: getIGDBImageUrl(game.cover_url, 'coverSmall') }}
                              style={[
                                styles.listPreviewCover,
                                { marginLeft: index > 0 ? -10 : 0, zIndex: 3 - index },
                              ]}
                            />
                          ))
                        ) : (
                          <View style={[styles.listPreviewCover, styles.listPreviewPlaceholder]}>
                            <Ionicons name="list" size={16} color={TestBg.textDim} />
                          </View>
                        )}
                      </View>
                      <View style={styles.listInfo}>
                        <Text style={styles.listTitle}>{list.title}</Text>
                        {list.description && (
                          <Text style={styles.listDescription} numberOfLines={1}>{list.description}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={TestBg.textDim} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* User Lists */}
              {userListResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>User Lists</Text>
                  {userListResults.map((list) => (
                    <TouchableOpacity
                      key={list.id}
                      style={styles.listRow}
                      onPress={() => handleUserListPress(list)}
                      accessibilityLabel={list.title + ' by ' + list.user.username}
                      accessibilityRole="button"
                      accessibilityHint="Opens user list"
                    >
                      {/* Preview game covers */}
                      <View style={styles.listPreviewCovers}>
                        {list.preview_games.length > 0 ? (
                          list.preview_games.slice(0, 3).map((game, index) => (
                            <Image
                              key={game.id}
                              source={{ uri: getIGDBImageUrl(game.cover_url, 'coverSmall') }}
                              style={[
                                styles.listPreviewCover,
                                { marginLeft: index > 0 ? -10 : 0, zIndex: 3 - index },
                              ]}
                            />
                          ))
                        ) : (
                          <View style={[styles.listPreviewCover, styles.listPreviewPlaceholder]}>
                            <Ionicons name="list" size={16} color={TestBg.textDim} />
                          </View>
                        )}
                      </View>
                      <View style={styles.listInfo}>
                        <Text style={styles.listTitle}>{list.title}</Text>
                        <Text style={styles.listMeta}>
                          {list.item_count} games • by @{list.user.username}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={TestBg.textDim} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Empty state for lists */}
              {curatedListResults.length === 0 && userListResults.length === 0 && (
                <View style={styles.centered}>
                  <Text style={styles.emptyText}>No lists found</Text>
                </View>
              )}
            </>
          )}

          {/* Empty state for current filter */}
          {searchFilter === 'games' && gameResults.length === 0 && (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No games found</Text>
            </View>
          )}
          {searchFilter === 'users' && userResults.length === 0 && (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          )}
        </ScrollView>
      ) : query.length >= 2 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.browseContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={'#F0E4D0'}
              colors={['#F0E4D0']}
            />
          }
        >
          {/* Recent Searches - First section, right below search bar */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.recentSectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches} accessibilityLabel="Clear recent searches" accessibilityRole="button" accessibilityHint="Removes all recent searches">
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentSearchesList}
              >
                {recentSearches.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.recentChip}
                    onPress={() => handleGamePress(game.id)}
                    accessibilityLabel={game.name}
                    accessibilityRole="button"
                    accessibilityHint="Opens game details"
                  >
                    {(game.coverUrl || game.cover_url) && (
                      <Image
                        source={{ uri: getIGDBImageUrl(game.coverUrl || game.cover_url) }}
                        style={styles.recentChipImage}
                        accessibilityLabel={game.name + ' cover art'}
                      />
                    )}
                    <Text style={styles.recentChipText} numberOfLines={1}>
                      {game.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Ask Sweaty - AI Recommendations */}
          <PressableScale
            style={styles.aiLogoContainer}
            onPress={() => navigation.navigate('AIRecommend')}
            haptic="light"
            scale={0.92}
            accessibilityLabel="Ask Sweaty for recommendations"
            accessibilityRole="button"
            accessibilityHint="Opens AI game recommendations"
          >
            <SweatDropIcon size={48} variant="default" />
            {!hasUsedAI && (
              <Animated.Text
                style={[
                  styles.aiLabel,
                  {
                    color: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [TestBg.textDim, Colors.text],
                    }),
                  },
                ]}
              >
                Ask Sweaty
              </Animated.Text>
            )}
          </PressableScale>

          {/* Browse Mode Toggle */}
          <View style={styles.browseToggle}>
            <TouchableOpacity
              style={[styles.browseTab, browseMode === 'curated' && styles.browseTabActive]}
              onPress={() => setBrowseMode('curated')}
              accessibilityLabel="Curated lists"
              accessibilityRole="tab"
              accessibilityState={{ selected: browseMode === 'curated' }}
            >
              <Text style={[styles.browseTabText, browseMode === 'curated' && styles.browseTabTextActive]}>
                Curated
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.browseTab, browseMode === 'community' && styles.browseTabActive]}
              onPress={() => setBrowseMode('community')}
              accessibilityLabel="Community lists"
              accessibilityRole="tab"
              accessibilityState={{ selected: browseMode === 'community' }}
            >
              <Text style={[styles.browseTabText, browseMode === 'community' && styles.browseTabTextActive]}>
                Community
              </Text>
            </TouchableOpacity>
          </View>

          {browseMode === 'curated' ? (
            <>
              {/* Discovery Section - Dynamic Lists */}
              <View style={styles.discoverSection}>
                {/* Trending Games from IGDB (global trending) */}
                <View style={styles.discoveryRow}>
                  <Text style={styles.discoveryRowTitle}>Trending Right Now</Text>
                  <HorizontalGameList
                    games={trendingGames}
                    onGamePress={(game) => handleGamePress(game.id)}
                    isLoading={isLoadingTrending}
                  />
                </View>

                {/* Community Popular Games (what Sweaty users like) */}
                <View style={styles.discoveryRow}>
                  <Text style={styles.discoveryRowTitle}>Popular on Sweaty</Text>
                  <HorizontalGameList
                    games={communityGames}
                    onGamePress={(game) => handleGamePress(game.id)}
                    isLoading={isLoadingCommunity}
                  />
                </View>
              </View>

              {/* Curated Discovery Lists */}
              {curatedLists.map((list) => (
                <CuratedListRow key={list.id} list={list} />
              ))}
            </>
          ) : (
            <>
              {/* Community User Lists */}
              {isLoadingPublicLists ? (
                <View style={styles.communityLoading}>
                  <SkeletonText width={150} height={20} style={{ marginLeft: Spacing.screenPadding, marginBottom: Spacing.md }} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.screenPadding, gap: Spacing.cardGap }}>
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={{ width: 105, height: 140, borderRadius: BorderRadius.md, backgroundColor: TestBg.surface }} />
                    ))}
                  </ScrollView>
                </View>
              ) : publicLists.length > 0 ? (
                publicLists.map((list) => (
                  <UserListRow key={list.id} list={list} />
                ))
              ) : (
                <View style={styles.communityEmpty}>
                  <Text style={styles.communityEmptyText}>No community lists yet.</Text>
                  <Text style={styles.communityEmptySubtext}>Create a list and make it public to see it here.</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TestBg.background,
  },
  header: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TestBg.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: TestBg.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.sm,
  },
  clearButton: {
    padding: Spacing.sm,
  },
  aiLogoContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  aiLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    lineHeight: 17,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  browseContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: TestBg.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  section: {
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    lineHeight: 24,
    color: Colors.text,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.sectionHeaderBelow,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TestBg.border,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userAvatarPlaceholder: {
    backgroundColor: TestBg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userDisplayName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  userUsername: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: TestBg.textMuted,
    marginTop: 2,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: GAP,
  },
  gridItem: {
    width: CARD_WIDTH,
  },
  gridCover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * (4 / 3), // 3:4 aspect ratio
    borderRadius: BorderRadius.md,
    backgroundColor: TestBg.surface,
    borderWidth: 1,
    borderColor: TestBg.borderSubtle,
  },
  gridPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  gridPlaceholderText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: TestBg.textMuted,
    textAlign: 'center',
  },
  recentSection: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sectionHeaderBelow,
  },
  recentSectionTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    lineHeight: 17,
    color: TestBg.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    flex: 1,
    marginRight: Spacing.sm,
  },
  clearText: {
    fontFamily: Fonts.body,
    color: TestBg.textMuted,
    fontSize: FontSize.sm,
  },
  recentSearchesList: {
    gap: Spacing.sm,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TestBg.surface,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: TestBg.border,
    gap: Spacing.sm,
  },
  recentChipImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TestBg.surfaceLight,
  },
  recentChipText: {
    fontFamily: Fonts.body,
    color: Colors.text,
    fontSize: FontSize.sm,
    maxWidth: 120,
  },
  browseToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.xl,
    backgroundColor: TestBg.surface,
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  browseTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  browseTabActive: {
    backgroundColor: 'rgba(240, 228, 208, 0.08)',
  },
  browseTabText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: TestBg.textMuted,
  },
  browseTabTextActive: {
    color: '#F0E4D0',
  },
  communityLoading: {
    paddingTop: Spacing.lg,
  },
  communityEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
  },
  communityEmptyText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.md,
    color: TestBg.textMuted,
    marginBottom: Spacing.xs,
  },
  communityEmptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: TestBg.textMuted,
    textAlign: 'center',
  },
  discoverSection: {
    marginTop: Spacing.lg,
  },
  discoveryRow: {
    marginBottom: Spacing.xxl,
  },
  discoveryRowTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 24,
    marginLeft: Spacing.screenPadding,
    marginBottom: Spacing.sectionHeaderBelow,
  },
  searchSkeletonContent: {
    paddingBottom: Spacing.xl,
  },
  sectionTitleSkeleton: {
    marginLeft: Spacing.lg,
    marginBottom: Spacing.md,
  },
  userRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TestBg.border,
  },
  userInfoSkeleton: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  // Filter Pills
  filterPills: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: TestBg.surface,
    borderWidth: 1,
    borderColor: TestBg.border,
  },
  filterPillActive: {
    backgroundColor: 'rgba(240, 228, 208, 0.18)',
    borderColor: '#F0E4D0',
  },
  filterPillText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: TestBg.textMuted,
  },
  filterPillTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: '#F0E4D0',
  },
  // List search styles
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TestBg.border,
  },
  listPreviewCovers: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 76,                           // Space for 3 covers (32*3 - 10*2 overlap)
  },
  listPreviewCover: {
    width: 32,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: TestBg.surface,
    borderWidth: 1,
    borderColor: TestBg.background,      // Border to separate overlapping covers
  },
  listPreviewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  listTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  listDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: TestBg.textMuted,
    marginTop: 2,
  },
  listMeta: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: TestBg.textDim,
    marginTop: 4,
  },
})
