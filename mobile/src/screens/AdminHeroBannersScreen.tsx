import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { MainStackParamList } from '../navigation'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { API_CONFIG } from '../constants'
import { useAdminHeroBanners, HeroBanner } from '../hooks/useHeroBanners'
import LoadingSpinner from '../components/LoadingSpinner'
import PressableScale from '../components/PressableScale'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SCREENSHOT_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2

type NavigationProp = NativeStackNavigationProp<MainStackParamList>

interface SearchGame {
  id: number
  name: string
  coverUrl?: string | null
}

interface GameScreenshot {
  url: string
  width: number
  height: number
}

export default function AdminHeroBannersScreen() {
  const navigation = useNavigation<NavigationProp>()
  const {
    banners,
    isLoading,
    addBanner,
    removeBanner,
    toggleBanner,
    refetch,
  } = useAdminHeroBanners()

  const [mode, setMode] = useState<'list' | 'search' | 'screenshots'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchGame[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedGame, setSelectedGame] = useState<SearchGame | null>(null)
  const [screenshots, setScreenshots] = useState<GameScreenshot[]>([])
  const [isLoadingScreenshots, setIsLoadingScreenshots] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

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

  // Fetch screenshots for a game
  const fetchScreenshots = useCallback(async (game: SearchGame) => {
    setSelectedGame(game)
    setIsLoadingScreenshots(true)
    setMode('screenshots')

    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/games/${game.id}/screenshots`
      )
      if (response.ok) {
        const data = await response.json()
        setScreenshots(data.screenshots || [])
      }
    } catch (err) {
      console.error('Screenshots error:', err)
      Alert.alert('Error', 'Failed to load screenshots')
    } finally {
      setIsLoadingScreenshots(false)
    }
  }, [])

  // Add a screenshot as a banner
  const handleAddBanner = useCallback(async (screenshotUrl: string) => {
    if (!selectedGame) return

    setIsAdding(true)
    const result = await addBanner(selectedGame.id, selectedGame.name, screenshotUrl)
    setIsAdding(false)

    if (result.success) {
      Alert.alert('Success', 'Banner added!')
      setMode('list')
      setSelectedGame(null)
      setScreenshots([])
      setSearchQuery('')
      setSearchResults([])
    } else {
      Alert.alert('Error', result.error || 'Failed to add banner')
    }
  }, [selectedGame, addBanner])

  // Remove a banner
  const handleRemoveBanner = useCallback(async (banner: HeroBanner) => {
    Alert.alert(
      'Remove Banner',
      `Remove "${banner.game_name}" banner?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeBanner(banner.id)
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to remove banner')
            }
          },
        },
      ]
    )
  }, [removeBanner])

  // Toggle banner active state
  const handleToggleBanner = useCallback(async (banner: HeroBanner) => {
    const result = await toggleBanner(banner.id, !banner.is_active)
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to toggle banner')
    }
  }, [toggleBanner])

  // Render banner list
  const renderBannerItem = ({ item }: { item: HeroBanner }) => (
    <View style={styles.bannerCard}>
      <Image
        source={{ uri: item.screenshot_url }}
        style={styles.bannerPreview}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.bannerGradient}
      />
      <View style={styles.bannerInfo}>
        <Text style={styles.bannerGameName} numberOfLines={1}>
          {item.game_name}
        </Text>
        <View style={styles.bannerActions}>
          <TouchableOpacity
            style={[styles.actionButton, !item.is_active && styles.actionButtonInactive]}
            onPress={() => handleToggleBanner(item)}
          >
            <Ionicons
              name={item.is_active ? 'eye' : 'eye-off'}
              size={18}
              color={item.is_active ? Colors.accent : Colors.textDim}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleRemoveBanner(item)}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  // Render search result
  const renderSearchResult = ({ item }: { item: SearchGame }) => (
    <TouchableOpacity
      style={styles.searchResult}
      onPress={() => fetchScreenshots(item)}
    >
      {item.coverUrl ? (
        <Image
          source={{ uri: item.coverUrl }}
          style={styles.searchResultCover}
        />
      ) : (
        <View style={[styles.searchResultCover, styles.coverPlaceholder]}>
          <Ionicons name="game-controller" size={20} color={Colors.textDim} />
        </View>
      )}
      <Text style={styles.searchResultName} numberOfLines={2}>
        {item.name}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
    </TouchableOpacity>
  )

  // Render screenshot option
  const renderScreenshot = ({ item }: { item: GameScreenshot }) => (
    <PressableScale
      style={styles.screenshotItem}
      onPress={() => handleAddBanner(item.url)}
      disabled={isAdding}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.screenshotImage}
        resizeMode="cover"
      />
      {isAdding && (
        <View style={styles.screenshotOverlay}>
          <LoadingSpinner size="small" color={Colors.text} />
        </View>
      )}
    </PressableScale>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (mode === 'list') {
              navigation.goBack()
            } else if (mode === 'screenshots') {
              setMode('search')
              setSelectedGame(null)
              setScreenshots([])
            } else {
              setMode('list')
              setSearchQuery('')
              setSearchResults([])
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'list' && 'HERO BANNERS'}
          {mode === 'search' && 'ADD BANNER'}
          {mode === 'screenshots' && selectedGame?.name.toUpperCase()}
        </Text>
        {mode === 'list' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setMode('search')}
          >
            <Ionicons name="add" size={24} color={Colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* List Mode */}
      {mode === 'list' && (
        isLoading ? (
          <View style={styles.centered}>
            <LoadingSpinner size="large" />
          </View>
        ) : banners.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="images-outline" size={48} color={Colors.textDim} />
            <Text style={styles.emptyText}>No banners yet</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setMode('search')}
            >
              <Text style={styles.emptyButtonText}>Add First Banner</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={banners}
            keyExtractor={(item) => item.id}
            renderItem={renderBannerItem}
            contentContainerStyle={styles.listContent}
          />
        )
      )}

      {/* Search Mode */}
      {mode === 'search' && (
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
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textDim} />
              </TouchableOpacity>
            )}
          </View>

          {isSearching ? (
            <View style={styles.centered}>
              <LoadingSpinner size="large" />
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSearchResult}
              contentContainerStyle={styles.searchResults}
            />
          ) : searchQuery.length >= 2 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No games found</Text>
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.hintText}>Search for a game to add its screenshot as a banner</Text>
            </View>
          )}
        </View>
      )}

      {/* Screenshots Mode */}
      {mode === 'screenshots' && (
        isLoadingScreenshots ? (
          <View style={styles.centered}>
            <LoadingSpinner size="large" />
          </View>
        ) : screenshots.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="images-outline" size={48} color={Colors.textDim} />
            <Text style={styles.emptyText}>No screenshots available</Text>
          </View>
        ) : (
          <FlatList
            data={screenshots}
            keyExtractor={(item, index) => `${item.url}-${index}`}
            renderItem={renderScreenshot}
            numColumns={2}
            contentContainerStyle={styles.screenshotsGrid}
            columnWrapperStyle={styles.screenshotRow}
          />
        )
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
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  addButton: {
    padding: Spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  bannerCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    height: 140,
  },
  bannerPreview: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  bannerInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerGameName: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonInactive: {
    opacity: 0.5,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  emptyButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
  },
  emptyButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  hintText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textAlign: 'center',
  },
  searchContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
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
  searchResults: {
    paddingHorizontal: Spacing.lg,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  searchResultCover: {
    width: 50,
    height: 67,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  screenshotsGrid: {
    padding: Spacing.lg,
  },
  screenshotRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  screenshotItem: {
    width: SCREENSHOT_WIDTH,
    height: SCREENSHOT_WIDTH * 0.56, // 16:9 aspect ratio
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  screenshotOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
