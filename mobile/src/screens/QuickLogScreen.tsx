import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import LogGameModal from '../components/LogGameModal'

interface Game {
  id: number
  name: string
  coverUrl?: string
  cover_url?: string
  firstReleaseDate?: string
  first_release_date?: string
  platforms?: string[]
  genres?: string[]
  summary?: string
}

export default function QuickLogScreen() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)

  const searchGames = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/games/search?q=${encodeURIComponent(searchQuery)}`
      )
      if (response.ok) {
        const data = await response.json()
        setResults(data.games || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search
  const handleSearchChange = (text: string) => {
    setQuery(text)
    // Simple debounce using setTimeout
    const timeoutId = setTimeout(() => {
      searchGames(text)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const handleGameSelect = (game: Game) => {
    Keyboard.dismiss()
    setSelectedGame(game)
    setIsModalVisible(true)
  }

  const handleLogSuccess = () => {
    setIsModalVisible(false)
    setSelectedGame(null)
    setQuery('')
    setResults([])
  }

  const getCoverUrl = (game: Game) => {
    const url = game.coverUrl || game.cover_url
    return url ? getIGDBImageUrl(url, 'coverBig2x') : null
  }

  const getReleaseYear = (game: Game) => {
    const date = game.firstReleaseDate || game.first_release_date
    if (!date) return null
    return new Date(date).getFullYear()
  }

  const renderGame = ({ item }: { item: Game }) => {
    const coverUrl = getCoverUrl(item)
    const year = getReleaseYear(item)

    return (
      <TouchableOpacity
        style={styles.gameItem}
        onPress={() => handleGameSelect(item)}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.gameCover} />
        ) : (
          <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
            <Ionicons name="game-controller-outline" size={20} color={Colors.textDim} />
          </View>
        )}
        <View style={styles.gameInfo}>
          <Text style={styles.gameTitle} numberOfLines={2}>{item.name}</Text>
          {year && <Text style={styles.gameYear}>{year}</Text>}
          {item.platforms && item.platforms.length > 0 && (
            <Text style={styles.gamePlatforms} numberOfLines={1}>
              {item.platforms.slice(0, 3).join(', ')}
            </Text>
          )}
        </View>
        <Ionicons name="add-circle-outline" size={24} color={Colors.accent} />
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quick Log</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textDim} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a game to log..."
          placeholderTextColor={Colors.textDim}
          value={query}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]) }}>
            <Ionicons name="close-circle" size={20} color={Colors.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGame}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
        />
      ) : query.length >= 2 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color={Colors.textDim} />
          <Text style={styles.emptyText}>No games found</Text>
        </View>
      ) : (
        <View style={styles.centered}>
          <Ionicons name="game-controller-outline" size={64} color={Colors.textDim} />
          <Text style={styles.emptyText}>Search for a game</Text>
          <Text style={styles.emptySubtext}>Type at least 2 characters to search</Text>
        </View>
      )}

      {/* Log Game Modal */}
      {selectedGame && (
        <LogGameModal
          visible={isModalVisible}
          onClose={() => {
            setIsModalVisible(false)
            setSelectedGame(null)
          }}
          game={selectedGame}
          onSaveSuccess={handleLogSuccess}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  resultsList: {
    paddingHorizontal: Spacing.lg,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  gameCover: {
    width: 50,
    height: 67,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  gameCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  gameTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  gameYear: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  gamePlatforms: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
})
