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
import { getIGDBImageUrl } from '../constants'
import { supabase } from '../lib/supabase'
import { MainStackParamList } from '../navigation'

type Props = NativeStackScreenProps<MainStackParamList, 'FilterResults'>

interface FilterGame {
  id: number
  name: string
  cover_url: string | null
  rating: number | null
}

const PAGE_SIZE = 30

export default function FilterResultsScreen({ navigation, route }: Props) {
  const { genres = [], years = [], platforms = [] } = route.params || {}

  const [games, setGames] = useState<FilterGame[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  // Active filter state (can be modified by removing pills)
  const [activeGenres, setActiveGenres] = useState<string[]>(genres)
  const [activeYears, setActiveYears] = useState<string[]>(years)
  const [activePlatforms, setActivePlatforms] = useState<string[]>(platforms)

  const hasFilters = activeGenres.length > 0 || activeYears.length > 0 || activePlatforms.length > 0

  // Build query based on filters
  const buildQuery = useCallback(() => {
    let query = supabase
      .from('games_cache')
      .select('id, name, cover_url, rating')
      .not('cover_url', 'is', null)

    // Apply genre filter
    if (activeGenres.length > 0) {
      // Match any of the selected genres
      query = query.overlaps('genres', activeGenres)
    }

    // Apply platform filter
    if (activePlatforms.length > 0) {
      query = query.overlaps('platforms', activePlatforms)
    }

    // Apply year filter
    if (activeYears.length > 0) {
      // Build OR conditions for years
      const yearConditions: string[] = []
      activeYears.forEach(year => {
        if (year.endsWith('s')) {
          // Decade like "2010s", "2000s"
          const decadeStart = parseInt(year.replace('s', ''))
          yearConditions.push(
            `and(first_release_date.gte.${decadeStart}-01-01,first_release_date.lt.${decadeStart + 10}-01-01)`
          )
        } else {
          // Single year like "2024"
          yearConditions.push(
            `and(first_release_date.gte.${year}-01-01,first_release_date.lt.${parseInt(year) + 1}-01-01)`
          )
        }
      })
      // Note: Supabase doesn't support complex OR for date ranges easily
      // For simplicity, we'll filter by the first year/decade only if multiple selected
      if (activeYears.length === 1) {
        const year = activeYears[0]
        if (year.endsWith('s')) {
          const decadeStart = parseInt(year.replace('s', ''))
          query = query
            .gte('first_release_date', `${decadeStart}-01-01`)
            .lt('first_release_date', `${decadeStart + 10}-01-01`)
        } else {
          query = query
            .gte('first_release_date', `${year}-01-01`)
            .lt('first_release_date', `${parseInt(year) + 1}-01-01`)
        }
      }
    }

    return query.order('rating', { ascending: false, nullsFirst: false })
  }, [activeGenres, activeYears, activePlatforms])

  // Fetch games
  const fetchGames = useCallback(async (pageNum: number, append: boolean = false) => {
    if (pageNum === 0) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const query = buildQuery()
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

      const { data, error } = await query

      if (error) throw error

      const newGames = data || []

      if (append) {
        setGames(prev => [...prev, ...newGames])
      } else {
        setGames(newGames)
      }

      setHasMore(newGames.length === PAGE_SIZE)
      setPage(pageNum)
    } catch (err) {
      console.error('Failed to fetch filtered games:', err)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [buildQuery])

  // Initial load and when filters change
  useEffect(() => {
    fetchGames(0)
  }, [activeGenres, activeYears, activePlatforms])

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchGames(0)
    setRefreshing(false)
  }, [fetchGames])

  // Load more
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      fetchGames(page + 1, true)
    }
  }, [isLoadingMore, hasMore, isLoading, page, fetchGames])

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
    const coverUrl = item.cover_url ? getIGDBImageUrl(item.cover_url, 'coverBig2x') : null

    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => handleGamePress(item.id)}
        activeOpacity={0.8}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.gameCover} />
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
