import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  TextInput,
} from 'react-native'
import LoadingSpinner from './LoadingSpinner'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { API_CONFIG } from '../constants'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SCREENSHOT_WIDTH = SCREEN_WIDTH - Spacing.lg * 2
const SCREENSHOT_HEIGHT = SCREENSHOT_WIDTH * 0.56  // 16:9 aspect ratio

interface Screenshot {
  url: string
  width: number
  height: number
}

interface SearchGame {
  id: number
  name: string
  coverUrl?: string | null
}

interface BannerSelectorProps {
  visible: boolean
  onClose: () => void
  onSelect: (banner: { url: string; gameName: string }) => void
  currentBannerUrl?: string | null
  isLoading?: boolean
}

type Step = 'search' | 'screenshots'

export default function BannerSelector({
  visible,
  onClose,
  onSelect,
  currentBannerUrl,
  isLoading = false,
}: BannerSelectorProps) {
  const [step, setStep] = useState<Step>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchGame[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedGame, setSelectedGame] = useState<SearchGame | null>(null)
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [isLoadingScreenshots, setIsLoadingScreenshots] = useState(false)
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null)
  const [screenshotError, setScreenshotError] = useState<string | null>(null)

  // Reset state when modal closes
  const handleClose = () => {
    setStep('search')
    setSearchQuery('')
    setSearchResults([])
    setSelectedGame(null)
    setScreenshots([])
    setSelectedScreenshot(null)
    setScreenshotError(null)
    onClose()
  }

  // Search for games
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/games/search?q=${encodeURIComponent(searchQuery)}`
      )
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.games || [])
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  // Select a game and fetch its screenshots
  const handleSelectGame = useCallback(async (game: SearchGame) => {
    setSelectedGame(game)
    setStep('screenshots')
    setIsLoadingScreenshots(true)
    setScreenshotError(null)
    setScreenshots([])
    setSelectedScreenshot(null)

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/games/${game.id}/screenshots`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch screenshots')
      }

      const data = await response.json()

      if (!data.screenshots || data.screenshots.length === 0) {
        setScreenshotError('No screenshots available for this game')
      } else {
        setScreenshots(data.screenshots)
      }
    } catch (err) {
      console.error('Error fetching screenshots:', err)
      setScreenshotError('Failed to load screenshots')
    } finally {
      setIsLoadingScreenshots(false)
    }
  }, [])

  // Go back to search
  const handleBack = () => {
    setStep('search')
    setSelectedGame(null)
    setScreenshots([])
    setSelectedScreenshot(null)
    setScreenshotError(null)
  }

  // Confirm selection
  const handleConfirm = () => {
    if (selectedScreenshot && selectedGame) {
      onSelect({
        url: selectedScreenshot.url,
        gameName: selectedGame.name,
      })
    }
  }

  // Render game search result
  const renderGameItem = ({ item }: { item: SearchGame }) => (
    <TouchableOpacity
      style={styles.gameItem}
      onPress={() => handleSelectGame(item)}
      activeOpacity={0.7}
      accessibilityLabel={`Select ${item.name}`}
      accessibilityRole="button"
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.gameCover} accessibilityLabel={`${item.name} cover`} />
      ) : (
        <View style={[styles.gameCover, styles.coverPlaceholder]}>
          <Ionicons name="game-controller" size={20} color={Colors.textDim} />
        </View>
      )}
      <View style={styles.gameInfo}>
        <Text style={styles.gameName} numberOfLines={2}>{item.name}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
    </TouchableOpacity>
  )

  // Render screenshot item
  const renderScreenshotItem = ({ item, index }: { item: Screenshot; index: number }) => {
    const isSelected = selectedScreenshot?.url === item.url
    const isCurrent = currentBannerUrl === item.url

    return (
      <TouchableOpacity
        style={[styles.screenshotItem, isSelected && styles.screenshotItemSelected]}
        onPress={() => setSelectedScreenshot(item)}
        activeOpacity={0.8}
        accessibilityLabel={`Screenshot ${index + 1}${isCurrent ? ', current banner' : ''}${isSelected ? ', selected' : ''}`}
        accessibilityRole="button"
      >
        <Image
          source={{ uri: item.url }}
          style={styles.screenshotImage}
          resizeMode="cover"
          accessibilityLabel={`${selectedGame?.name || 'Game'} screenshot ${index + 1}`}
        />
        {isCurrent && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.accent} />
          </View>
        )}
        <View style={styles.screenshotNumber}>
          <Text style={styles.screenshotNumberText}>{index + 1}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            {step === 'screenshots' ? (
              <TouchableOpacity onPress={handleBack} style={styles.headerButton} accessibilityLabel="Go back" accessibilityRole="button">
                <Ionicons name="arrow-back" size={24} color={Colors.text} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleClose} style={styles.headerButton} accessibilityLabel="Close" accessibilityRole="button">
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            )}

            <Text style={styles.title} numberOfLines={1}>
              {step === 'search' ? 'Choose a Game' : selectedGame?.name || 'Screenshots'}
            </Text>

            {step === 'screenshots' ? (
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={!selectedScreenshot || isLoading}
                style={[
                  styles.confirmButton,
                  (!selectedScreenshot || isLoading) && styles.confirmButtonDisabled,
                ]}
                accessibilityLabel="Save selected banner"
                accessibilityRole="button"
              >
                {isLoading ? (
                  <LoadingSpinner size="small" color={Colors.text} />
                ) : (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.background} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.headerButton} />
            )}
          </View>

          {/* Search Step */}
          {step === 'search' && (
            <>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color={Colors.textDim} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for a game..."
                    placeholderTextColor={Colors.textDim}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    autoFocus
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search" accessibilityRole="button">
                      <Ionicons name="close-circle" size={18} color={Colors.textDim} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Search Results */}
              {isSearching ? (
                <View style={styles.centered}>
                  <LoadingSpinner size="large" />
                </View>
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={renderGameItem}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              ) : searchQuery.length >= 2 ? (
                <View style={styles.centered}>
                  <Ionicons name="game-controller-outline" size={48} color={Colors.textDim} />
                  <Text style={styles.emptyText}>No games found</Text>
                  <Text style={styles.hintText}>Try a different search term</Text>
                </View>
              ) : (
                <View style={styles.centered}>
                  <Ionicons name="images-outline" size={48} color={Colors.textDim} />
                  <Text style={styles.emptyText}>Search for a game</Text>
                  <Text style={styles.hintText}>
                    Find a game to use its screenshots as your banner
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Screenshots Step */}
          {step === 'screenshots' && (
            <>
              {isLoadingScreenshots ? (
                <View style={styles.centered}>
                  <LoadingSpinner size="large" />
                  <Text style={styles.loadingText}>Loading screenshots...</Text>
                </View>
              ) : screenshotError ? (
                <View style={styles.centered}>
                  <Ionicons name="images-outline" size={48} color={Colors.textDim} />
                  <Text style={styles.emptyText}>{screenshotError}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={handleBack} accessibilityLabel="Try another game" accessibilityRole="button">
                    <Text style={styles.retryButtonText}>Try another game</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={screenshots}
                  renderItem={renderScreenshotItem}
                  keyExtractor={(item, index) => `${item.url}-${index}`}
                  contentContainerStyle={styles.screenshotListContent}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <Text style={styles.screenshotHint}>
                      {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''} available
                    </Text>
                  }
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '90%',
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  confirmButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  searchContainer: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  hintText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  listContent: {
    padding: Spacing.md,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  gameCover: {
    width: 50,
    height: 67,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  screenshotListContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  screenshotHint: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  screenshotItem: {
    width: SCREENSHOT_WIDTH,
    height: SCREENSHOT_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  screenshotItemSelected: {
    borderColor: Colors.accent,
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceLight,
  },
  currentBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  currentBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.background,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenshotNumber: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  screenshotNumberText: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.text,
  },
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.background,
  },
})
