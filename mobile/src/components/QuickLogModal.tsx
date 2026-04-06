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
  Keyboard,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Easing,
} from 'react-native'
import SweatDropIcon from './SweatDropIcon'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import LogGameModal from './LogGameModal'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85

// RGB Glitch Add Button for search results
function GlitchResultButton({ onPress }: { onPress: () => void }) {
  const [isGlitching, setIsGlitching] = useState(false)
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const scaleAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.15) {
        setIsGlitching(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * 3,
          y: (Math.random() - 0.5) * 2,
        })

        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95 + Math.random() * 0.1,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 40,
            useNativeDriver: true,
          }),
        ]).start()

        setTimeout(() => {
          setIsGlitching(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 50 + Math.random() * 60)
      }
    }, 400)

    return () => clearInterval(glitchInterval)
  }, [scaleAnim])

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel="Add game to log" accessibilityRole="button">
      <Animated.View style={[styles.addButtonContainer, { transform: [{ scale: scaleAnim }] }]}>
        {/* Cyan layer */}
        <View
          style={[
            styles.addButtonLayer,
            styles.addButtonCyan,
            {
              transform: [
                { translateX: isGlitching ? -1.5 + glitchOffset.x : -1 },
                { translateY: isGlitching ? glitchOffset.y : 0 },
              ],
            },
          ]}
        >
          <Ionicons name="add" size={16} color={Colors.cyan} />
        </View>

        {/* Green layer */}
        <View
          style={[
            styles.addButtonLayer,
            styles.addButtonGreen,
            {
              transform: [
                { translateX: isGlitching ? 1.5 - glitchOffset.x : 1 },
                { translateY: isGlitching ? -glitchOffset.y : 0 },
              ],
            },
          ]}
        >
          <Ionicons name="add" size={16} color={Colors.accent} />
        </View>

        {/* Main white button (matches homepage) */}
        <View style={styles.addButtonMain}>
          <Ionicons name="add" size={16} color={Colors.background} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

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

  // RGB glitch state for search input
  const [searchGlitchOffset, setSearchGlitchOffset] = useState({ x: 0, y: 0 })
  const [isSearchGlitching, setIsSearchGlitching] = useState(false)

  // Title glitch animation
  const titleGlitchAnim = useRef(new Animated.Value(0)).current

  // Search input glitch effect (only when focused)
  useEffect(() => {
    if (!isFocused) return

    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.2) {
        setIsSearchGlitching(true)
        setSearchGlitchOffset({
          x: (Math.random() - 0.5) * 3,
          y: (Math.random() - 0.5) * 2,
        })

        setTimeout(() => {
          setIsSearchGlitching(false)
          setSearchGlitchOffset({ x: 0, y: 0 })
        }, 60 + Math.random() * 80)
      }
    }, 300)

    return () => clearInterval(glitchInterval)
  }, [isFocused])

  // Title glitch animation loop
  useEffect(() => {
    if (visible) {
      const glitchAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(titleGlitchAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(titleGlitchAnim, {
            toValue: 0,
            duration: 2000 + Math.random() * 3000,
            useNativeDriver: true,
          }),
        ])
      )
      glitchAnimation.start()
      return () => glitchAnimation.stop()
    }
  }, [visible, titleGlitchAnim])

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
        accessibilityLabel={item.name}
        accessibilityRole="button"
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.gameCover} accessibilityLabel={`${item.name} cover art`} />
        ) : (
          <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
            <SweatDropIcon size={24} variant="static" />
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
        <GlitchResultButton onPress={() => handleGameSelect(item)} />
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
        accessibilityViewIsModal={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header with RGB glitch title */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              {/* Cyan layer */}
              <Animated.Text
                style={[
                  styles.headerTitleLayer,
                  styles.headerTitleCyan,
                  {
                    transform: [
                      {
                        translateX: titleGlitchAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -2],
                        }),
                      },
                    ],
                    opacity: titleGlitchAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 0.6, 0.3],
                    }),
                  },
                ]}
              >
                quick log
              </Animated.Text>
              {/* Green layer */}
              <Animated.Text
                style={[
                  styles.headerTitleLayer,
                  styles.headerTitleGreen,
                  {
                    transform: [
                      {
                        translateX: titleGlitchAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 2],
                        }),
                      },
                    ],
                    opacity: titleGlitchAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 0.6, 0.3],
                    }),
                  },
                ]}
              >
                quick log
              </Animated.Text>
              {/* Main white title */}
              <Text style={styles.headerTitle}>quick log</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} accessibilityLabel="Close" accessibilityRole="button">
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search Input with RGB glitch effect */}
          <View style={styles.searchWrapper}>
            {/* Cyan border layer */}
            {isFocused && (
              <View
                style={[
                  styles.searchBorderLayer,
                  styles.searchBorderCyan,
                  {
                    transform: [
                      { translateX: isSearchGlitching ? -1.5 + searchGlitchOffset.x : -1 },
                      { translateY: isSearchGlitching ? searchGlitchOffset.y : 0 },
                    ],
                  },
                ]}
              />
            )}
            {/* Green border layer */}
            {isFocused && (
              <View
                style={[
                  styles.searchBorderLayer,
                  styles.searchBorderGreen,
                  {
                    transform: [
                      { translateX: isSearchGlitching ? 1.5 - searchGlitchOffset.x : 1 },
                      { translateY: isSearchGlitching ? -searchGlitchOffset.y : 0 },
                    ],
                  },
                ]}
              />
            )}
            {/* Pink border layer */}
            {isFocused && (
              <View
                style={[
                  styles.searchBorderLayer,
                  styles.searchBorderPink,
                  {
                    transform: [
                      { translateY: isSearchGlitching ? 1 + searchGlitchOffset.y : 0.5 },
                    ],
                  },
                ]}
              />
            )}
            {/* Main search container */}
            <View style={[styles.searchContainer, isFocused && styles.searchContainerFocused]}>
              <Ionicons name="search" size={20} color={isFocused ? Colors.text : Colors.textDim} style={styles.searchIcon} />
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
                accessibilityLabel="Search for a game to log"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton} accessibilityLabel="Clear search" accessibilityRole="button">
                  <Ionicons name="close-circle" size={20} color={Colors.textDim} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results */}
          <View style={styles.resultsContainer}>
            {isLoading ? (
              <View style={styles.centered}>
                <SweatDropIcon size={48} variant="loading" />
                <Text style={styles.loadingText}>Searching...</Text>
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
                <SweatDropIcon size={48} variant="static" />
                <Text style={styles.emptyText}>No games found</Text>
              </View>
            ) : (
              <View style={styles.centered}>
                <SweatDropIcon size={64} variant="default" />
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
  titleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.text,
  },
  headerTitleLayer: {
    position: 'absolute',
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
  },
  headerTitleCyan: {
    color: Colors.cyan,
  },
  headerTitleGreen: {
    color: Colors.accent,
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.lg,
    padding: Spacing.xs,
  },
  searchWrapper: {
    position: 'relative',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  searchBorderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  searchBorderCyan: {
    borderColor: Colors.cyan,
    opacity: 0.5,
  },
  searchBorderGreen: {
    borderColor: Colors.accent,
    opacity: 0.5,
  },
  searchBorderPink: {
    borderColor: Colors.pink,
    opacity: 0.4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    borderColor: Colors.text,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.body,
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
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.md,
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
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  gameYear: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  gamePlatforms: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  // RGB Glitch Add Button styles
  addButtonContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLayer: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonCyan: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.cyan,
    opacity: 0.6,
  },
  addButtonGreen: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.accent,
    opacity: 0.6,
  },
  addButtonMain: {
    backgroundColor: Colors.text,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
