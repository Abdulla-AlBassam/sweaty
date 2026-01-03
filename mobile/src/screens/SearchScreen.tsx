import React, { useState, useEffect, useCallback } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, CommonActions } from '@react-navigation/native'
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
import GameCard from '../components/GameCard'
import HorizontalGameList from '../components/HorizontalGameList'
import CuratedListRow from '../components/CuratedListRow'
import SweatDropIcon from '../components/SweatDropIcon'
import PressableScale from '../components/PressableScale'
import { SkeletonCircle, SkeletonText } from '../components/Skeleton'
import { GameCardSkeletonGrid } from '../components/skeletons'
import { GlitchHeader } from '../components/GlitchText'

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

const RECENT_SEARCHES_KEY = 'sweaty_recent_searches'
const MAX_RECENT_SEARCHES = 5

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const { user } = useAuth()
  const { lists: curatedLists, refetch: refetchLists } = useCuratedLists()
  const [query, setQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('games')
  const [gameResults, setGameResults] = useState<SearchGame[]>([])
  const [userResults, setUserResults] = useState<SearchUser[]>([])
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
    ])
    setRefreshing(false)
  }, [refetchLists])

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

  // Debounced search for both games and users
  useEffect(() => {
    if (!query || query.length < 2) {
      setGameResults([])
      setUserResults([])
      setError(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Search games and users in parallel
        const [gamesResponse, users] = await Promise.all([
          fetch(`${API_CONFIG.baseUrl}/api/games/search?q=${encodeURIComponent(query)}`),
          searchUsers(query),
        ])

        if (!gamesResponse.ok) {
          throw new Error('Search failed')
        }

        const gamesData = await gamesResponse.json()
        setGameResults(gamesData.games || [])
        setUserResults(users)
      } catch (err) {
        setError('Failed to search')
        setGameResults([])
        setUserResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

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
    Keyboard.dismiss()
  }

  const clearRecentSearches = async () => {
    setRecentSearches([])
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  const hasResults = userResults.length > 0 || gameResults.length > 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search games, users, lists..."
            placeholderTextColor={Colors.textDim}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={Colors.textDim} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        {query.length >= 2 && (
          <View style={styles.filterPills}>
            <TouchableOpacity
              style={[styles.filterPill, searchFilter === 'games' && styles.filterPillActive]}
              onPress={() => setSearchFilter('games')}
            >
              <Text style={[styles.filterPillText, searchFilter === 'games' && styles.filterPillTextActive]}>
                Games
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, searchFilter === 'users' && styles.filterPillActive]}
              onPress={() => setSearchFilter('users')}
            >
              <Text style={[styles.filterPillText, searchFilter === 'users' && styles.filterPillTextActive]}>
                Users
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, searchFilter === 'lists' && styles.filterPillActive]}
              onPress={() => setSearchFilter('lists')}
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
                >
                  {userProfile.avatar_url ? (
                    <Image source={{ uri: userProfile.avatar_url }} style={styles.userAvatar} />
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
                    >
                      {coverUrl ? (
                        <Image
                          source={{ uri: getIGDBImageUrl(coverUrl, 'coverBig') }}
                          style={styles.gridCover}
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
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lists</Text>
              <View style={styles.listsEmptyState}>
                <Text style={styles.emptyText}>List search coming soon</Text>
              </View>
            </View>
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
          style={styles.scrollView}
          contentContainerStyle={styles.browseContent}
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
          {/* AI Logo - Tap to open AI Recommendations */}
          <PressableScale
            style={styles.aiLogoContainer}
            onPress={() => navigation.navigate('AIRecommend')}
            haptic="light"
            scale={0.9}
          >
            <SweatDropIcon size={48} variant="default" />
          </PressableScale>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.recentSectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
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
                  >
                    {(game.coverUrl || game.cover_url) && (
                      <Image
                        source={{ uri: getIGDBImageUrl(game.coverUrl || game.cover_url) }}
                        style={styles.recentChipImage}
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

          {/* Discover Section - Dynamic Lists */}
          <View style={styles.discoverSection}>
            <GlitchHeader title="DISCOVER" style={styles.discoverHeader} />

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
              <Text style={styles.discoveryRowTitle}>Popular in Community</Text>
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
        </ScrollView>
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
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  browseContent: {
    paddingTop: Spacing.xl,             // 24px top padding
    paddingBottom: Spacing.xxxl,        // 48px bottom padding
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
    color: Colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  section: {
    paddingTop: Spacing.xxl,            // 32px above section
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,              // Smaller, consistent
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.sectionHeaderBelow,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
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
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.md,
    color: Colors.accent,
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
    marginBottom: GAP,
  },
  gridCover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * (4 / 3), // 3:4 aspect ratio
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
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
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.screenPadding,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sectionHeaderBelow,
  },
  recentSectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clearText: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  recentSearchesList: {
    gap: Spacing.sm,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  recentChipImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
  },
  recentChipText: {
    fontFamily: Fonts.body,
    color: Colors.text,
    fontSize: FontSize.sm,
    maxWidth: 120,
  },
  discoverSection: {
    marginTop: Spacing.xxl,             // 32px above discover
  },
  discoverHeader: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.xl,           // 24px below header
  },
  discoveryRow: {
    marginBottom: Spacing.xxl,          // 32px between rows
  },
  discoveryRowTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,
    color: Colors.text,
    marginLeft: Spacing.screenPadding,
    marginBottom: Spacing.sectionHeaderBelow,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
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
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.textSecondary,
  },
  filterPillText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textDim,
  },
  filterPillTextActive: {
    color: Colors.text,
  },
  listsEmptyState: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.xl,
  },
})
