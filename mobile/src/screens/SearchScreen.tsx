import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import GameCard from '../components/GameCard'

interface SearchGame {
  id: number
  name: string
  coverUrl?: string | null
  cover_url?: string | null
}

const API_BASE_URL = 'https://sweaty-v1.vercel.app'
const RECENT_SEARCHES_KEY = 'sweaty_recent_searches'
const MAX_RECENT_SEARCHES = 5

export default function SearchScreen() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchGame[]>([])
  const [recentSearches, setRecentSearches] = useState<SearchGame[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      setError(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/games/search?q=${encodeURIComponent(query)}`
        )

        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()
        setResults(data.games || [])
      } catch (err) {
        setError('Failed to search games')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleGamePress = useCallback((gameId: number) => {
    const game = results.find((g) => g.id === gameId) || recentSearches.find((g) => g.id === gameId)
    if (game) {
      saveRecentSearch(game)
    }
    // TODO: Navigate to game detail screen
    console.log('Navigate to game:', gameId)
    Keyboard.dismiss()
  }, [results, recentSearches])

  const clearSearch = () => {
    setQuery('')
    setResults([])
    Keyboard.dismiss()
  }

  const renderGameItem = ({ item }: { item: SearchGame }) => (
    <View style={styles.gridItem}>
      <GameCard game={item} onPress={handleGamePress} size="medium" />
    </View>
  )

  const showRecentSearches = query.length < 2 && recentSearches.length > 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search games..."
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
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : showRecentSearches ? (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <FlatList
            data={recentSearches}
            renderItem={renderGameItem}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContent}
          />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderGameItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContent}
          keyboardShouldPersistTaps="handled"
        />
      ) : query.length >= 2 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No games found</Text>
        </View>
      ) : (
        <View style={styles.centered}>
          <Ionicons name="game-controller-outline" size={48} color={Colors.textDim} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Search for Games</Text>
          <Text style={styles.emptyText}>
            Find games to add to your library
          </Text>
        </View>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyIcon: {
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
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
  recentSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  gridContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  row: {
    justifyContent: 'flex-start',
    gap: Spacing.md,
  },
  gridItem: {
    width: '30%',
    marginBottom: Spacing.md,
  },
})
