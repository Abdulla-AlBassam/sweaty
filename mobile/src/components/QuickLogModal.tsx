import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import LogGameModal from './LogGameModal'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85

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

interface QuickLogModalProps {
  visible: boolean
  onClose: () => void
}

export default function QuickLogModal({ visible, onClose }: QuickLogModalProps) {
  const insets = useSafeAreaInsets()
  const searchInputRef = useRef<TextInput>(null)
  const backdropAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [isLogModalVisible, setIsLogModalVisible] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Animation on open/close
  useEffect(() => {
    if (visible) {
      // Reset state when opening
      setQuery('')
      setResults([])

      // Animate in
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 90,
          useNativeDriver: true,
        }),
      ]).start()

      // Auto-focus search input
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: MODAL_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

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
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      searchGames(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, searchGames])

  const handleGameSelect = (game: Game) => {
    Keyboard.dismiss()
    setSelectedGame(game)
    setIsLogModalVisible(true)
  }

  const handleLogSuccess = () => {
    setIsLogModalVisible(false)
    setSelectedGame(null)
    setQuery('')
    setResults([])
    onClose()
  }

  const handleClose = () => {
    Keyboard.dismiss()
    onClose()
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
        activeOpacity={0.7}
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
        <View style={styles.addButton}>
          <Ionicons name="add" size={20} color={Colors.background} />
        </View>
      </TouchableOpacity>
    )
  }

  if (!visible) return null

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Modal */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Quick Log</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={[styles.searchContainer, isFocused && styles.searchContainerFocused]}>
            <Ionicons name="search" size={20} color={Colors.textDim} style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search for a game..."
              placeholderTextColor={Colors.textDim}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={Colors.textDim} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results */}
          <View style={styles.resultsContainer}>
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
                showsVerticalScrollIndicator={false}
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
          </View>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* Log Game Modal */}
      {selectedGame && (
        <LogGameModal
          visible={isLogModalVisible}
          onClose={() => {
            setIsLogModalVisible(false)
            setSelectedGame(null)
          }}
          game={selectedGame}
          onSaveSuccess={handleLogSuccess}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_HEIGHT,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  keyboardView: {
    flex: 1,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textDim,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.lg,
    padding: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    borderColor: Colors.accent,
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
  clearButton: {
    padding: Spacing.xs,
  },
  resultsContainer: {
    flex: 1,
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
    paddingBottom: Spacing.lg,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
  addButton: {
    backgroundColor: Colors.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
