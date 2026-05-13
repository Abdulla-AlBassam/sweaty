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
  Animated,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, CommonActions, useScrollToTop } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { MainStackParamList } from '../navigation'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'

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
import HeroBannerCarousel from '../components/HeroBannerCarousel'
import SweatDropIcon from '../components/SweatDropIcon'
import { SkeletonCircle, SkeletonText } from '../components/Skeleton'
import { GameCardSkeletonGrid } from '../components/skeletons'
import { useHeroBanners, HeroBanner } from '../hooks/useHeroBanners'
import DiscoverFilterModal from '../components/DiscoverFilterModal'
import { useDiscoverFilters } from '../hooks/useDiscoverFilters'
import { GlassSurface } from '../ui/glass'

// Calculate card width to match CuratedListDetailScreen grid
const SCREEN_WIDTH = Dimensions.get('window').width
const { height: SCREEN_HEIGHT } = Dimensions.get('window')
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
    screenshot_urls?: string[] | null
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

const RECENT_SEARCHES_KEY = 'sweaty_recent_searches_v2'
const MAX_RECENT_SEARCHES = 8

type RecentSearchItem =
  | { type: 'game'; id: number; name: string; coverUrl?: string | null }
  | { type: 'user'; id: string; username: string; displayName?: string | null; avatarUrl?: string | null }
  | { type: 'list'; id: string; title: string; slug?: string; gameIds?: number[]; description?: string | null; bannerCoverUrl?: string | null }

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const scrollRef = useRef<any>(null)
  useScrollToTop(scrollRef)
  const insets = useSafeAreaInsets()
  const scrollY = useRef(new Animated.Value(0)).current
  const BANNER_HEIGHT = SCREEN_HEIGHT * 0.22 + insets.top
  const { user } = useAuth()
  const { platforms, platformsParam, excludePcOnly } = usePlatformFilter()
  const { lists: curatedLists, refetch: refetchLists } = useCuratedLists(excludePcOnly)
  const { lists: publicLists, isLoading: isLoadingPublicLists, refetch: refetchPublicLists } = usePublicLists()
  const { banners, refetch: refetchBanners } = useHeroBanners()

  // Discover filter state (client-side, scoped to this screen's curated lists)
  const {
    active: discoverActive,
    hasAny: discoverHasAny,
    selectionCount: discoverSelectionCount,
    available: discoverAvailable,
    matchesFilters: discoverMatches,
    reset: resetDiscoverFilters,
    setActive: setDiscoverActive,
  } = useDiscoverFilters(curatedLists)
  const [filterModalVisible, setFilterModalVisible] = useState(false)

  type BrowseMode = 'curated' | 'community'
  const [browseMode, setBrowseMode] = useState<BrowseMode>('curated')

  const [query, setQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('games')
  const [gameResults, setGameResults] = useState<SearchGame[]>([])
  const [userResults, setUserResults] = useState<SearchUser[]>([])
  const [curatedListResults, setCuratedListResults] = useState<SearchCuratedList[]>([])
  const [userListResults, setUserListResults] = useState<SearchUserList[]>([])
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [bannerShuffleKey, setBannerShuffleKey] = useState(0)
  const [searchFocused, setSearchFocused] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const [trendingGames, setTrendingGames] = useState<DiscoveryGame[]>([])
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [communityGames, setCommunityGames] = useState<DiscoveryGame[]>([])
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(true)

  useEffect(() => {
    loadRecentSearches()
    loadTrendingGames()
    loadCommunityGames()
  }, [])

  // Re-tapping the Search tab resets to the main browse view.
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
      // Always clear discover filter state on tab re-entry (card [02])
      resetDiscoverFilters()
      if (searchFocused || query) {
        e.preventDefault()
        setQuery('')
        setSearchFilter('games')
        setGameResults([])
        setUserResults([])
        setCuratedListResults([])
        setUserListResults([])
        setSearchFocused(false)
        Keyboard.dismiss()
        inputRef.current?.blur()
      }
    })
    return unsubscribe
  }, [navigation, searchFocused, query, resetDiscoverFilters])

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
    setBannerShuffleKey(k => k + 1)
    await Promise.all([
      loadTrendingGames(),
      loadCommunityGames(),
      refetchLists(),
      refetchPublicLists(),
      refetchBanners(),
    ])
    setRefreshing(false)
  }, [refetchLists, refetchPublicLists, refetchBanners])

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

  const saveRecentSearch = async (item: RecentSearchItem) => {
    try {
      const itemKey = `${item.type}-${item.id}`
      const updated = [
        item,
        ...recentSearches.filter((r) => `${r.type}-${r.id}` !== itemKey),
      ].slice(0, MAX_RECENT_SEARCHES)
      setRecentSearches(updated)
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to save recent search:', err)
    }
  }

  const searchUsers = async (searchQuery: string): Promise<SearchUser[]> => {
    try {
      let dbQuery = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(5)

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

      const listsWithPreviews = await Promise.all(
        (data || []).map(async (list: any) => {
          const gameIds = list.game_ids?.slice(0, 3) || []
          let preview_games: Array<{ id: number; cover_url: string | null }> = []

          if (gameIds.length > 0) {
            const { data: gamesData } = await supabase
              .from('games_cache')
              .select('id, cover_url, screenshot_urls')
              .in('id', gameIds)

            // Preserve the game_ids order — `.in()` does not guarantee it.
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

  const searchUserLists = async (searchQuery: string): Promise<SearchUserList[]> => {
    try {
      let query = supabase
        .from('lists')
        .select(`
          id, title, description, is_public, user_id,
          profiles!lists_user_id_fkey (id, username, display_name, avatar_url)
        `)
        .ilike('title', `%${searchQuery}%`)
        .limit(10)

      if (user) {
        query = query.or(`is_public.eq.true,user_id.eq.${user.id}`)
      } else {
        query = query.eq('is_public', true)
      }

      const { data, error } = await query

      if (error) throw error

      const listsWithDetails: SearchUserList[] = await Promise.all(
        (data || []).map(async (list: any) => {
          const { count } = await supabase
            .from('list_items')
            .select('id', { count: 'exact', head: true })
            .eq('list_id', list.id)

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
        let searchUrl = `${API_CONFIG.baseUrl}/api/games/search?q=${encodeURIComponent(query)}`
        if (platformsParam) {
          searchUrl += `&platforms=${encodeURIComponent(platformsParam)}`
        }

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

  const handleBannerPress = useCallback((gameId: number) => {
    if (gameId) {
      navigation.dispatch(
        CommonActions.navigate({
          name: 'GameDetail',
          params: { gameId },
        })
      )
    }
  }, [navigation])

  const handleGamePress = (gameId: number) => {
    const game = gameResults.find((g) => g.id === gameId)
    if (game) {
      saveRecentSearch({ type: 'game', id: game.id, name: game.name, coverUrl: game.coverUrl || game.cover_url })
    }
    Keyboard.dismiss()
    setSearchFocused(false)

    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const handleUserPress = (userProfile: SearchUser) => {
    saveRecentSearch({ type: 'user', id: userProfile.id, username: userProfile.username, displayName: userProfile.display_name, avatarUrl: userProfile.avatar_url })
    Keyboard.dismiss()
    setSearchFocused(false)
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
    setSearchFocused(false)
    Keyboard.dismiss()
  }

  const clearRecentSearches = async () => {
    setRecentSearches([])
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  const hasResults = userResults.length > 0 || gameResults.length > 0 || curatedListResults.length > 0 || userListResults.length > 0

  const handleCuratedListPress = (list: SearchCuratedList) => {
    const topPreview = list.preview_games?.[0]
    const bannerCoverUrl = topPreview?.screenshot_urls?.[0] ?? topPreview?.cover_url ?? null
    saveRecentSearch({ type: 'list', id: list.id, title: list.title, slug: list.slug, gameIds: list.game_ids, description: list.description, bannerCoverUrl })
    Keyboard.dismiss()
    setSearchFocused(false)
    navigation.dispatch(
      CommonActions.navigate({
        name: 'CuratedListDetail',
        params: {
          listSlug: list.slug,
          listTitle: list.title,
          gameIds: list.game_ids,
          listDescription: list.description,
          bannerCoverUrl,
        },
      })
    )
  }

  const handleUserListPress = (list: SearchUserList) => {
    saveRecentSearch({ type: 'list', id: list.id, title: list.title })
    Keyboard.dismiss()
    setSearchFocused(false)
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ListDetail',
        params: { listId: list.id },
      })
    )
  }

  const handleRecentItemPress = (item: RecentSearchItem) => {
    Keyboard.dismiss()
    setSearchFocused(false)
    if (item.type === 'game') {
      navigation.dispatch(CommonActions.navigate({ name: 'GameDetail', params: { gameId: item.id } }))
    } else if (item.type === 'user') {
      navigation.dispatch(CommonActions.navigate({ name: 'UserProfile', params: { username: item.username, userId: item.id } }))
    } else if (item.type === 'list') {
      if (item.slug && item.gameIds) {
        navigation.dispatch(CommonActions.navigate({ name: 'CuratedListDetail', params: { listSlug: item.slug, listTitle: item.title, gameIds: item.gameIds, listDescription: item.description ?? null, bannerCoverUrl: item.bannerCoverUrl ?? null } }))
      } else {
        navigation.dispatch(CommonActions.navigate({ name: 'ListDetail', params: { listId: item.id } }))
      }
    }
  }

  const removeRecentItem = async (item: RecentSearchItem) => {
    const itemKey = `${item.type}-${item.id}`
    const updated = recentSearches.filter((r) => `${r.type}-${r.id}` !== itemKey)
    setRecentSearches(updated)
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }

  const HEADER_BOTTOM = insets.top + 44

  // Mirror the branching in the ScrollView below — sticky DISCOVER header only
  // pins when the browse (else) branch is being rendered.
  const showRecent = searchFocused && !query && recentSearches.length > 0
  const isBrowseView =
    !showRecent && !isLoading && !error && !hasResults && query.length < 2

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Hero banner — absolute sibling so it bleeds into the status-bar
          area above the ScrollView frame. Translates up with scroll so it
          feels scroll-attached, then the sticky DISCOVER header takes over. */}
      {banners.length > 0 && (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: BANNER_HEIGHT,
            zIndex: 0,
            transform: [
              {
                // Absolute banner mimics scroll-attached behavior: translate
                // up 1:1 as user scrolls past. On pull-down (scrollY < 0) add
                // extra downward motion so the banner grows from the top
                // rather than the bottom.
                translateY: scrollY.interpolate({
                  inputRange: [-200, 0, BANNER_HEIGHT],
                  outputRange: [100, 0, -BANNER_HEIGHT],
                  extrapolateRight: 'clamp',
                }),
              },
              {
                scale: scrollY.interpolate({
                  inputRange: [-200, 0],
                  outputRange: [1.5, 1],
                  extrapolateRight: 'clamp',
                }),
              },
            ],
          }}
        >
          <HeroBannerCarousel
            banners={banners}
            height={BANNER_HEIGHT}
            onBannerPress={handleBannerPress}
            shuffleTrigger={bannerShuffleKey}
            hideGameName
          />
        </Animated.View>
      )}

      {/* Fixed header overlay — fades out on scroll like ProfileScreen */}
      <Animated.View style={[styles.fixedHeader, {
        paddingTop: insets.top + Spacing.sm,
        opacity: scrollY.interpolate({
          inputRange: [0, BANNER_HEIGHT * 0.5],
          outputRange: [1, 0],
          extrapolate: 'clamp',
        }),
      }]} pointerEvents="box-none">
        <View style={styles.headerRow} pointerEvents="auto">
          <Text style={styles.title}>search</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AIRecommend')}
            style={styles.aiHeaderButton}
            accessibilityLabel="Ask Sweaty AI"
            accessibilityRole="button"
          >
            <SweatDropIcon size={25} variant="static" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.browseContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="never"
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={isBrowseView ? [2] : undefined}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        onScrollEndDrag={(e: any) => {
          if (e.nativeEvent.contentOffset.y < -60 && !refreshing) {
            onRefresh()
          }
        }}
      >
        {/* Spacer that reserves the banner area in scroll flow.
            The actual banner is rendered as a sibling below the ScrollView so
            it can bleed into the status-bar area above the ScrollView frame. */}
        {banners.length > 0 ? (
          <View style={{ height: BANNER_HEIGHT - insets.top }} />
        ) : (
          <View style={{ height: HEADER_BOTTOM + Spacing.md - insets.top }} />
        )}

        {/* Search bar — inline in scroll flow, below banner */}
        <View style={styles.inlineSearchBar}>
          <GlassSurface
            intensity="medium"
            role="capsule"
            radius={BorderRadius.lg}
            style={styles.searchBar}
          >
            <Ionicons name="search" size={18} color={Colors.textDim} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Search games, users, lists..."
              placeholderTextColor={Colors.textDim}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search for games, users, or lists"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton} accessibilityLabel="Clear search" accessibilityRole="button" accessibilityHint="Clears search and results">
                <Ionicons name="close-circle" size={18} color={Colors.textDim} />
              </TouchableOpacity>
            )}
          </GlassSurface>
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

        {/* Sticky browse header: DISCOVER row + Curated/Community toggle.
            Hoisted to be a direct ScrollView child so stickyHeaderIndices can
            target it as a single unit. When not in the browse branch this
            evaluates to false, preserving child-index order. */}
        {isBrowseView && (
          <View style={styles.stickyBrowseHeader}>
            <View style={styles.discoverHeader}>
              <View style={styles.discoverHeaderRow}>
                <Text style={styles.discoverHeaderText}>DISCOVER</Text>
                <TouchableOpacity
                  style={styles.discoverFilterButton}
                  onPress={() => setFilterModalVisible(true)}
                  disabled={curatedLists.length === 0}
                  accessibilityLabel="Filter discover"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: curatedLists.length === 0 }}
                  accessibilityHint="Opens filter sheet for platform, genre, and release era"
                >
                  <Ionicons
                    name="funnel-outline"
                    size={20}
                    color={curatedLists.length === 0 ? Colors.textDim : Colors.text}
                  />
                  {discoverHasAny && (
                    <View style={styles.discoverFilterBadge}>
                      <Text style={styles.discoverFilterBadgeText}>
                        {discoverSelectionCount > 9 ? '9+' : String(discoverSelectionCount)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <GlassSurface
              intensity="medium"
              role="capsule"
              radius={BorderRadius.md}
              style={styles.browseToggle}
            >
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
            </GlassSurface>
          </View>
        )}

        {/* Content below search bar */}
        {searchFocused && !query && recentSearches.length > 0 ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent</Text>
              <TouchableOpacity onPress={clearRecentSearches} accessibilityLabel="Clear recent searches" accessibilityRole="button">
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((item) => {
              const key = `${item.type}-${item.id}`
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.recentRow}
                  onPress={() => handleRecentItemPress(item)}
                  accessibilityRole="button"
                >
                  {item.type === 'game' && (
                    <>
                      {item.coverUrl ? (
                        <Image source={{ uri: getIGDBImageUrl(item.coverUrl, 'coverSmall') }} style={styles.recentGameCover} />
                      ) : (
                        <View style={[styles.recentGameCover, styles.recentPlaceholder]}>
                          <Ionicons name="game-controller-outline" size={14} color={Colors.textDim} />
                        </View>
                      )}
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.recentType}>Game</Text>
                      </View>
                    </>
                  )}
                  {item.type === 'user' && (
                    <>
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.recentAvatar} />
                      ) : (
                        <View style={[styles.recentAvatar, styles.recentPlaceholder]}>
                          <Text style={styles.recentAvatarLetter}>
                            {(item.displayName || item.username)[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentName} numberOfLines={1}>{item.displayName || item.username}</Text>
                        <Text style={styles.recentType}>@{item.username}</Text>
                      </View>
                    </>
                  )}
                  {item.type === 'list' && (
                    <>
                      <View style={[styles.recentListIcon, styles.recentPlaceholder]}>
                        <Ionicons name="list" size={14} color={Colors.textDim} />
                      </View>
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentName} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.recentType}>List</Text>
                      </View>
                    </>
                  )}
                  <TouchableOpacity
                    onPress={() => removeRecentItem(item)}
                    style={styles.recentRemove}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Remove from recent"
                  >
                    <Ionicons name="close" size={16} color={Colors.textDim} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )
            })}
          </View>
        ) : isLoading ? (
          <View style={styles.searchSkeletonContent}>
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
          </View>
        ) : error ? (
          <View style={styles.contentCentered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : hasResults ? (
          <>
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
                    <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
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
                              <Ionicons name="list" size={16} color={Colors.textDim} />
                            </View>
                          )}
                        </View>
                        <View style={styles.listInfo}>
                          <Text style={styles.listTitle}>{list.title}</Text>
                          {list.description && (
                            <Text style={styles.listDescription} numberOfLines={1}>{list.description}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
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
                              <Ionicons name="list" size={16} color={Colors.textDim} />
                            </View>
                          )}
                        </View>
                        <View style={styles.listInfo}>
                          <Text style={styles.listTitle}>{list.title}</Text>
                          <Text style={styles.listMeta}>
                            {list.item_count} games • by @{list.user.username}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Empty state for lists */}
                {curatedListResults.length === 0 && userListResults.length === 0 && (
                  <View style={styles.contentCentered}>
                    <Text style={styles.emptyText}>No lists found</Text>
                  </View>
                )}
              </>
            )}

            {/* Empty state for current filter */}
            {searchFilter === 'games' && gameResults.length === 0 && (
              <View style={styles.contentCentered}>
                <Text style={styles.emptyText}>No games found</Text>
              </View>
            )}
            {searchFilter === 'users' && userResults.length === 0 && (
              <View style={styles.contentCentered}>
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            )}
          </>
        ) : query.length >= 2 ? (
          <View style={styles.contentCentered}>
            <Text style={styles.emptyText}>No results found</Text>
          </View>
        ) : (
          <>
            {/* Trending + Popular — browse toggle lives in the sticky header above */}
            <View style={[styles.sectionGroup, { backgroundColor: Colors.background, paddingTop: 0, paddingBottom: 0 }]}>
              {browseMode === 'curated' && !discoverHasAny && (
                <View style={styles.discoverSection}>
                  <View style={styles.discoveryRow}>
                    <Text style={styles.discoveryRowTitle}>Popular on Sweaty</Text>
                    <Text style={styles.discoveryRowDescription}>Most-logged games in the Sweaty community.</Text>
                    <HorizontalGameList
                      games={communityGames}
                      onGamePress={(game) => handleGamePress(game.id)}
                      isLoading={isLoadingCommunity}
                    />
                  </View>
                </View>
              )}

              {browseMode === 'community' && (
                <>
                  {isLoadingPublicLists ? (
                    <View style={styles.communityLoading}>
                      <SkeletonText width={150} height={20} style={{ marginLeft: Spacing.screenPadding, marginBottom: Spacing.md }} />
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.screenPadding, gap: Spacing.cardGap }}>
                        {[1, 2, 3, 4].map((i) => (
                          <View key={i} style={{ width: 105, height: 140, borderRadius: BorderRadius.md, backgroundColor: Colors.surface }} />
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
            </View>

            {browseMode === 'curated' && (() => {
              const visibleCurated = discoverHasAny ? curatedLists.filter(discoverMatches) : curatedLists

              if (discoverHasAny && visibleCurated.length === 0) {
                return (
                  <View style={styles.discoverEmpty}>
                    <Text style={styles.discoverEmptyText}>No lists match. Try loosening a filter.</Text>
                    <TouchableOpacity
                      onPress={resetDiscoverFilters}
                      accessibilityLabel="Clear all filters"
                      accessibilityRole="button"
                    >
                      <Text style={styles.discoverEmptyClear}>Clear all</Text>
                    </TouchableOpacity>
                  </View>
                )
              }

              const chunks: Array<typeof curatedLists> = []
              for (let i = 0; i < visibleCurated.length; i += 3) {
                chunks.push(visibleCurated.slice(i, i + 3))
              }
              return chunks.map((chunk, chunkIndex) => (
                <React.Fragment key={`curated-chunk-${chunkIndex}`}>
                  <View
                    style={[
                      styles.sectionGroup,
                      { backgroundColor: chunkIndex % 2 === 0 ? Colors.background : Colors.alternate },
                      chunkIndex === 0 && { paddingTop: 0 },
                    ]}
                  >
                    {chunk.map((list) => (
                      <CuratedListRow key={list.id} list={list} />
                    ))}
                  </View>
                  {chunkIndex === 1 && !discoverHasAny && (
                    <View style={styles.discoveryRow}>
                      <Text style={styles.discoveryRowTitle}>Trending on IGDB</Text>
                      <Text style={styles.discoveryRowDescription}>What's popular across IGDB right now.</Text>
                      <HorizontalGameList
                        games={trendingGames}
                        onGamePress={(game) => handleGamePress(game.id)}
                        isLoading={isLoadingTrending}
                      />
                    </View>
                  )}
                </React.Fragment>
              ))
            })()}
          </>
        )}
      </Animated.ScrollView>

      <DiscoverFilterModal
        visible={filterModalVisible}
        active={discoverActive}
        available={discoverAvailable}
        onClose={() => setFilterModalVisible(false)}
        onApply={(next) => {
          setDiscoverActive(next)
          setFilterModalVisible(false)
        }}
        onReset={() => {
          resetDiscoverFilters()
          setFilterModalVisible(false)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.sm,
  },
  aiHeaderButton: {
    padding: 0,
  },
  iconBackdrop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    lineHeight: 28,
    color: Colors.cream,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  inlineSearchBar: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  browseContent: {
    paddingBottom: Spacing.xxxl,
  },
  sectionGroup: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  contentCentered: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
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
    borderBottomColor: Colors.border,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userAvatarPlaceholder: {
    backgroundColor: Colors.surface,
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
    color: Colors.textMuted,
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
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  gridPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  gridPlaceholderText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  recentSection: {
    paddingHorizontal: Spacing.screenPadding,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  recentTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  clearText: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.md,
  },
  recentGameCover: {
    width: 36,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  recentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
  },
  recentListIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
  },
  recentPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentAvatarLetter: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 20,
  },
  recentType: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: 1,
  },
  recentRemove: {
    padding: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sectionHeaderBelow,
  },
  stickyBrowseHeader: {
    backgroundColor: Colors.background,
  },
  discoverHeader: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.cream,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  discoverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discoverHeaderText: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.cream,
    lineHeight: 26,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  discoverFilterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverFilterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverFilterBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    lineHeight: 12,
    color: Colors.background,
  },
  discoverEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  discoverEmptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  discoverEmptyClear: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.cream,
  },
  browseToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.lg,
    padding: 3,
  },
  browseTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  browseTabActive: {
    backgroundColor: 'rgba(192, 200, 208, 0.08)',
  },
  browseTabText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  browseTabTextActive: {
    color: Colors.cream,
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
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  communityEmptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  discoverSection: {
    marginTop: 0,
  },
  discoveryRow: {
    // Mirror `sectionGroup` paddings so Trending sits on the same vertical
    // rhythm as the surrounding curated list chunks.
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  discoveryRowTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
    paddingHorizontal: Spacing.screenPadding,
  },
  discoveryRowDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
    paddingHorizontal: Spacing.screenPadding,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
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
    borderBottomColor: Colors.border,
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: 'rgba(192, 200, 208, 0.18)',
    borderColor: Colors.cream,
  },
  filterPillText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  filterPillTextActive: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.cream,
  },
  // List search styles
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,      // Border to separate overlapping covers
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
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
    color: Colors.textMuted,
    marginTop: 2,
  },
  listMeta: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: 4,
  },
})
