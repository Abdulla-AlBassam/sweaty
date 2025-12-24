import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import GameCard from '../components/GameCard'
import FilterModal from '../components/FilterModal'
import Skeleton, { SkeletonCircle, SkeletonText } from '../components/Skeleton'
import { GameCardSkeletonGrid } from '../components/skeletons'

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

const RECENT_SEARCHES_KEY = 'sweaty_recent_searches'
const MAX_RECENT_SEARCHES = 5

type FilterType = 'genre' | 'year' | 'platform'

export default function SearchScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [gameResults, setGameResults] = useState<SearchGame[]>([])
  const [userResults, setUserResults] = useState<SearchUser[]>([])
  const [recentSearches, setRecentSearches] = useState<SearchGame[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [activeFilterType, setActiveFilterType] = useState<FilterType>('genre')

  // Selected filters state
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedYears, setSelectedYears] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  const hasActiveFilters = selectedGenres.length > 0 || selectedYears.length > 0 || selectedPlatforms.length > 0

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches()
  }, [])

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
      let query = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(5)

      // Exclude current user
      if (user) {
        query = query.neq('id', user.id)
      }

      const { data, error } = await query

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
    setGameResults([])
    setUserResults([])
    Keyboard.dismiss()
  }

  const clearRecentSearches = async () => {
    setRecentSearches([])
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  // Filter modal handlers
  const openFilterModal = (filterType: FilterType) => {
    setActiveFilterType(filterType)
    setFilterModalVisible(true)
  }

  const handleFilterApply = (values: string[]) => {
    switch (activeFilterType) {
      case 'genre':
        setSelectedGenres(values)
        break
      case 'year':
        setSelectedYears(values)
        break
      case 'platform':
        setSelectedPlatforms(values)
        break
    }
  }

  const getSelectedValuesForType = (filterType: FilterType): string[] => {
    switch (filterType) {
      case 'genre':
        return selectedGenres
      case 'year':
        return selectedYears
      case 'platform':
        return selectedPlatforms
    }
  }

  // Remove individual filter
  const removeFilter = (type: FilterType, value: string) => {
    switch (type) {
      case 'genre':
        setSelectedGenres(prev => prev.filter(v => v !== value))
        break
      case 'year':
        setSelectedYears(prev => prev.filter(v => v !== value))
        break
      case 'platform':
        setSelectedPlatforms(prev => prev.filter(v => v !== value))
        break
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedGenres([])
    setSelectedYears([])
    setSelectedPlatforms([])
  }

  // Navigate to filter results
  const viewFilterResults = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'FilterResults',
        params: {
          genres: selectedGenres,
          years: selectedYears,
          platforms: selectedPlatforms,
        },
      })
    )
  }

  // Get count for filter type (to show in browse row)
  const getFilterCount = (type: FilterType): number => {
    return getSelectedValuesForType(type).length
  }

  const hasResults = userResults.length > 0 || gameResults.length > 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search games or users..."
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
          {/* Users Section */}
          {userResults.length > 0 && (
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

          {/* Games Section */}
          {gameResults.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Games</Text>
              <View style={styles.gamesGrid}>
                {gameResults.map((game) => (
                  <View key={game.id} style={styles.gridItem}>
                    <GameCard game={game} onPress={handleGamePress} size="medium" />
                  </View>
                ))}
              </View>
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
        >
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

          {/* Browse by Section */}
          <View style={styles.browseSection}>
            <Text style={styles.browseSectionTitle}>Browse by</Text>

            <TouchableOpacity style={styles.browseRow} onPress={() => openFilterModal('genre')}>
              <Text style={styles.browseRowText}>Genre</Text>
              <View style={styles.browseRowRight}>
                {getFilterCount('genre') > 0 && (
                  <View style={styles.filterCountBadge}>
                    <Text style={styles.filterCountText}>{getFilterCount('genre')}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={styles.browseRowDivider} />

            <TouchableOpacity style={styles.browseRow} onPress={() => openFilterModal('year')}>
              <Text style={styles.browseRowText}>Release date</Text>
              <View style={styles.browseRowRight}>
                {getFilterCount('year') > 0 && (
                  <View style={styles.filterCountBadge}>
                    <Text style={styles.filterCountText}>{getFilterCount('year')}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={styles.browseRowDivider} />

            <TouchableOpacity style={styles.browseRow} onPress={() => openFilterModal('platform')}>
              <Text style={styles.browseRowText}>Platform</Text>
              <View style={styles.browseRowRight}>
                {getFilterCount('platform') > 0 && (
                  <View style={styles.filterCountBadge}>
                    <Text style={styles.filterCountText}>{getFilterCount('platform')}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <View style={styles.activeFiltersSection}>
              <View style={styles.activeFiltersHeader}>
                <Text style={styles.activeFiltersTitle}>Active Filters</Text>
                <TouchableOpacity onPress={clearAllFilters}>
                  <Text style={styles.clearAllText}>Clear all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activeFiltersList}
              >
                {selectedGenres.map((genre) => (
                  <TouchableOpacity
                    key={`genre-${genre}`}
                    style={styles.activeFilterPill}
                    onPress={() => removeFilter('genre', genre)}
                  >
                    <Text style={styles.activeFilterPillText}>{genre}</Text>
                    <Ionicons name="close" size={14} color={Colors.background} />
                  </TouchableOpacity>
                ))}
                {selectedYears.map((year) => (
                  <TouchableOpacity
                    key={`year-${year}`}
                    style={styles.activeFilterPill}
                    onPress={() => removeFilter('year', year)}
                  >
                    <Text style={styles.activeFilterPillText}>{year}</Text>
                    <Ionicons name="close" size={14} color={Colors.background} />
                  </TouchableOpacity>
                ))}
                {selectedPlatforms.map((platform) => (
                  <TouchableOpacity
                    key={`platform-${platform}`}
                    style={styles.activeFilterPill}
                    onPress={() => removeFilter('platform', platform)}
                  >
                    <Text style={styles.activeFilterPillText}>{platform}</Text>
                    <Ionicons name="close" size={14} color={Colors.background} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* View Results Button */}
              <TouchableOpacity style={styles.viewResultsButton} onPress={viewFilterResults}>
                <Text style={styles.viewResultsButtonText}>View Results</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.background} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filterType={activeFilterType}
        selectedValues={getSelectedValuesForType(activeFilterType)}
        onApply={handleFilterApply}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
  },
  clearButton: {
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  browseContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
  },
  section: {
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
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
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.accentLight,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userDisplayName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  userUsername: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  gridItem: {
    width: '30%',
    marginBottom: Spacing.md,
  },
  recentSection: {
    paddingTop: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  clearText: {
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
    color: Colors.text,
    fontSize: FontSize.sm,
    maxWidth: 120,
  },
  browseSection: {
    marginTop: 24,
  },
  browseSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  browseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  browseRowText: {
    fontSize: 16,
    color: Colors.text,
  },
  browseRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterCountBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  browseRowDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  activeFiltersSection: {
    marginTop: 24,
  },
  activeFiltersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeFiltersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  clearAllText: {
    color: Colors.accentLight,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  activeFiltersList: {
    gap: Spacing.sm,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.accent,
    borderRadius: 16,
  },
  activeFilterPillText: {
    fontSize: FontSize.sm,
    color: Colors.background,
    fontWeight: '600',
  },
  viewResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginTop: 16,
  },
  viewResultsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
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
})
