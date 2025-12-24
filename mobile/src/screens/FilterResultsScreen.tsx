import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { API_CONFIG } from '../constants'
import { MainStackParamList } from '../navigation'

type Props = NativeStackScreenProps<MainStackParamList, 'FilterResults'>

interface FilterGame {
  id: number
  name: string
  coverUrl: string | null
  rating: number | null
}

const PAGE_SIZE = 50

export default function FilterResultsScreen({ navigation, route }: Props) {
  const { genres = [], years = [], platforms = [] } = route.params || {}

  const [games, setGames] = useState<FilterGame[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // Active filter state (can be modified by removing pills)
  const [activeGenres, setActiveGenres] = useState<string[]>(genres)
  const [activeYears, setActiveYears] = useState<string[]>(years)
  const [activePlatforms, setActivePlatforms] = useState<string[]>(platforms)

  const hasFilters = activeGenres.length > 0 || activeYears.length > 0 || activePlatforms.length > 0

  // Build query params for API
  const buildQueryParams = useCallback((currentOffset: number = 0) => {
    const params = new URLSearchParams()

    if (activeGenres.length > 0) {
      params.append('genres', activeGenres.join(','))
    }
    if (activeYears.length > 0) {
      params.append('years', activeYears.join(','))
    }
    if (activePlatforms.length > 0) {
      params.append('platforms', activePlatforms.join(','))
    }

    params.append('limit', PAGE_SIZE.toString())
    params.append('offset', currentOffset.toString())

    return params.toString()
  }, [activeGenres, activeYears, activePlatforms])

  // Fetch games from API
  const fetchGames = useCallback(async (currentOffset: number = 0, append: boolean = false) => {
    if (currentOffset === 0) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const queryString = buildQueryParams(currentOffset)
      const response = await fetch(`${API_CONFIG.baseUrl}/api/games/browse?${queryString}`)

      if (!response.ok) {
        throw new Error('Failed to fetch games')
      }

      const data = await response.json()
      const newGames: FilterGame[] = data.games || []

      if (append) {
        setGames(prev => [...prev, ...newGames])
      } else {
        setGames(newGames)
      }

      setHasMore(data.hasMore || false)
      setOffset(currentOffset + newGames.length)
    } catch (err) {
      console.error('Failed to fetch filtered games:', err)
      if (!append) {
        setGames([])
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [buildQueryParams])

  // Initial load and when filters change
  useEffect(() => {
    setOffset(0)
    fetchGames(0)
  }, [activeGenres, activeYears, activePlatforms])

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setOffset(0)
    await fetchGames(0)
    setRefreshing(false)
  }, [fetchGames])

  // Load more
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      fetchGames(offset, true)
    }
  }, [isLoadingMore, hasMore, isLoading, offset, fetchGames])

  // Remove filter pill
  const removeGenre = (genre: string) => {
    setActiveGenres(prev => prev.filter(g => g !== genre))
  }

  const removeYear = (year: string) => {
    setActiveYears(prev => prev.filter(y => y !== year))
  }

  const removePlatform = (platform: string) => {
    setActivePlatforms(prev => prev.filter(p => p !== platform))
  }

  const clearAll = () => {
    setActiveGenres([])
    setActiveYears([])
    setActivePlatforms([])
  }

  const handleGamePress = (gameId: number) => {
    navigation.navigate('GameDetail', { gameId })
  }

  // Render filter pill
  const renderPill = (label: string, onRemove: () => void) => (
    <TouchableOpacity key={label} style={styles.filterPill} onPress={onRemove}>
      <Text style={styles.filterPillText}>{label}</Text>
      <Ionicons name="close" size={14} color={Colors.text} />
    </TouchableOpacity>
  )

  // Render game item
  const renderGame = ({ item }: { item: FilterGame }) => {
    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handleGamePress(item.id)}
        activeOpacity={0.8}
      >
        {item.coverUrl ? (
          <Image source={{ uri: item.coverUrl }} style={styles.gameCover} />
        ) : (
          <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
            <Ionicons name="game-controller-outline" size={24} color={Colors.textDim} />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  // Footer for loading more
  const renderFooter = () => {
    if (!isLoadingMore) return null
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Games</Text>
        {hasFilters && (
          <TouchableOpacity onPress={clearAll} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filters */}
      {hasFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersBar}
          contentContainerStyle={styles.filtersContent}
        >
          {activeGenres.map(genre => renderPill(genre, () => removeGenre(genre)))}
          {activeYears.map(year => renderPill(year, () => removeYear(year)))}
          {activePlatforms.map(platform => renderPill(platform, () => removePlatform(platform)))}
        </ScrollView>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : games.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="game-controller-outline" size={48} color={Colors.textDim} />
          <Text style={styles.emptyText}>No games found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          renderItem={renderGame}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          contentContainerStyle={styles.gamesGrid}
          columnWrapperStyle={styles.gamesRow}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
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
  clearAllButton: {
    padding: Spacing.sm,
  },
  clearAllText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: '500',
  },
  filtersBar: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filtersContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.accent,
    borderRadius: 16,
  },
  filterPillText: {
    fontSize: FontSize.xs,
    color: Colors.background,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  gamesGrid: {
    padding: Spacing.lg,
  },
  gamesRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  gameCard: {
    width: '31%',
    aspectRatio: 3 / 4,
  },
  gameCover: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  gameCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMore: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
})
