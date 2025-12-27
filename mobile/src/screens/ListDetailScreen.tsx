import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, RouteProp, CommonActions, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import { MainStackParamList } from '../navigation'
import { useAuth } from '../contexts/AuthContext'
import { useListDetail, removeGameFromList, deleteList, addGameToList } from '../hooks/useLists'
import { supabase } from '../lib/supabase'
import { Game } from '../types'

type ListDetailRouteProp = RouteProp<MainStackParamList, 'ListDetail'>

interface LibraryGame {
  id: number
  name: string
  cover_url: string | null
}

export default function ListDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute<ListDetailRouteProp>()
  const { listId } = route.params
  const { user } = useAuth()

  const { list, isLoading, error, refetch } = useListDetail(listId)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Game[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)

  // Library state
  const [libraryGames, setLibraryGames] = useState<LibraryGame[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  const isOwner = user && list && user.id === list.user_id

  // Get IDs of games already in the list
  const gamesInList = list?.items?.map(item => item.game.id) || []

  // Fetch user's library
  const fetchLibrary = useCallback(async () => {
    if (!user) return
    setIsLoadingLibrary(true)

    try {
      const { data } = await supabase
        .from('game_logs')
        .select(`
          game_id,
          game:games_cache(id, name, cover_url)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (data) {
        const games = data
          .map((log: any) => {
            const game = Array.isArray(log.game) ? log.game[0] : log.game
            return game ? { id: game.id, name: game.name, cover_url: game.cover_url } : null
          })
          .filter(Boolean) as LibraryGame[]
        setLibraryGames(games)
      }
    } catch (err) {
      console.error('Error fetching library:', err)
    } finally {
      setIsLoadingLibrary(false)
    }
  }, [user])

  useEffect(() => {
    if (isOwner) {
      fetchLibrary()
    }
  }, [isOwner, fetchLibrary])

  // Search games from IGDB
  const searchGames = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }

    setIsSearching(true)
    setShowSearchDropdown(true)

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/api/games/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      // Handle both array response and object with games property
      const games = Array.isArray(data) ? data : (data?.games || data?.results || [])
      setSearchResults(games.slice(0, 8))
    } catch (err) {
      console.error('Search error:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchGames(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchGames])

  const handleGamePress = (gameId: number) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const handleAddGame = async (game: LibraryGame | Game) => {
    if (gamesInList.includes(game.id)) {
      // Remove from list
      const { error } = await removeGameFromList(listId, game.id)
      if (error) {
        Alert.alert('Error', error)
      } else {
        refetch()
      }
    } else {
      // Add to list - pass game info for caching
      // API returns coverUrl (camelCase), database has cover_url (snake_case)
      const coverUrl = game.cover_url || (game as any).coverUrl || (game as any).cover?.url || (game as any).cover
      const { error } = await addGameToList(listId, game.id, {
        name: game.name,
        cover_url: coverUrl,
      })
      if (error) {
        Alert.alert('Error', error)
      } else {
        refetch()
      }
    }
  }

  const handleSearchResultPress = (game: Game) => {
    handleAddGame(game)
    setSearchQuery('')
    setShowSearchDropdown(false)
    Keyboard.dismiss()
  }

  const handleGameLongPress = (gameId: number, gameName: string) => {
    if (!isOwner) return

    Alert.alert(
      'Remove Game',
      `Remove "${gameName}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeGameFromList(listId, gameId)
            if (error) {
              Alert.alert('Error', error)
            } else {
              refetch()
            }
          },
        },
      ]
    )
  }

  const handleDeleteList = () => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list?.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            const { error } = await deleteList(listId)
            setIsDeleting(false)
            if (error) {
              Alert.alert('Error', error)
            } else {
              navigation.goBack()
            }
          },
        },
      ]
    )
  }

  const isGameInList = (gameId: number) => gamesInList.includes(gameId)

  // Filter library to games not already in list
  const availableLibraryGames = libraryGames.filter(g => !isGameInList(g.id))

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>List</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={styles.retryButton}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {list?.title || 'List'}
        </Text>

        {isOwner ? (
          <View style={styles.headerActions}>
            {isEditMode ? (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setIsEditMode(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => setIsEditMode(true)}
                >
                  <Ionicons name="pencil" size={20} color={Colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleDeleteList}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={Colors.error} />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* List Info */}
          <View style={styles.listInfo}>
            {list?.description && (
              <Text style={styles.description}>{list.description}</Text>
            )}
            <Text style={styles.gameCount}>
              {list?.item_count || 0} {(list?.item_count || 0) === 1 ? 'game' : 'games'}
            </Text>
          </View>

          {/* Add Games Section - Only in edit mode */}
          {isOwner && isEditMode && (
            <View style={styles.addSection}>
              <Text style={styles.sectionTitle}>Add Games</Text>

              {/* Search Bar with Dropdown */}
              <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color={Colors.textDim} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for games..."
                    placeholderTextColor={Colors.textDim}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => searchQuery.length >= 2 && setShowSearchDropdown(true)}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearchDropdown(false); }}>
                      <Ionicons name="close-circle" size={18} color={Colors.textDim} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Search Dropdown */}
                {showSearchDropdown && (
                  <View style={styles.searchDropdown}>
                    <ScrollView
                      style={styles.searchDropdownScroll}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                    >
                      {isSearching ? (
                        <View style={styles.searchLoading}>
                          <ActivityIndicator size="small" color={Colors.accent} />
                        </View>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((game) => {
                          const inList = isGameInList(game.id)
                          // API returns coverUrl (camelCase), database has cover_url (snake_case)
                          const coverUrl = game.cover_url || (game as any).coverUrl || (game as any).cover?.url || (game as any).cover
                          return (
                            <TouchableOpacity
                              key={game.id}
                              style={[styles.searchResult, inList && styles.searchResultInList]}
                              onPress={() => handleSearchResultPress(game)}
                            >
                              {coverUrl ? (
                                <Image
                                  source={{ uri: getIGDBImageUrl(coverUrl, 'thumb') }}
                                  style={styles.searchResultCover}
                                />
                              ) : (
                                <View style={[styles.searchResultCover, styles.coverPlaceholder]}>
                                  <Ionicons name="game-controller" size={12} color={Colors.textDim} />
                                </View>
                              )}
                              <Text style={styles.searchResultName} numberOfLines={1}>
                                {game.name}
                              </Text>
                              {inList ? (
                                <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                              ) : (
                                <Ionicons name="add-circle-outline" size={20} color={Colors.textMuted} />
                              )}
                            </TouchableOpacity>
                          )
                        })
                      ) : searchQuery.length >= 2 ? (
                        <Text style={styles.noResults}>No games found</Text>
                      ) : null}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Select from Library */}
              <Text style={styles.libraryTitle}>Select from your library</Text>
              {isLoadingLibrary ? (
                <View style={styles.libraryLoading}>
                  <ActivityIndicator size="small" color={Colors.accent} />
                </View>
              ) : libraryGames.length > 0 ? (
                <View style={styles.libraryGrid}>
                  {libraryGames.map((game) => {
                    const inList = isGameInList(game.id)
                    return (
                      <TouchableOpacity
                        key={game.id}
                        style={styles.libraryGame}
                        onPress={() => handleAddGame(game)}
                      >
                        {game.cover_url ? (
                          <Image
                            source={{ uri: getIGDBImageUrl(game.cover_url, 'coverBig') }}
                            style={[styles.libraryCover, inList && styles.libraryCoverInList]}
                          />
                        ) : (
                          <View style={[styles.libraryCover, styles.coverPlaceholder, inList && styles.libraryCoverInList]}>
                            <Ionicons name="game-controller" size={20} color={Colors.textDim} />
                          </View>
                        )}
                        {inList && (
                          <View style={styles.inListOverlay}>
                            <Ionicons name="checkmark-circle" size={28} color={Colors.accent} />
                          </View>
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              ) : (
                <View style={styles.emptyLibrary}>
                  <Text style={styles.emptyLibraryText}>No games in your library</Text>
                </View>
              )}
            </View>
          )}

          {/* Games in List */}
          <View style={styles.listSection}>
            {isEditMode && (
              <Text style={styles.sectionTitle}>
                In this list ({list?.items?.length || 0})
              </Text>
            )}

            {(list?.items?.length || 0) > 0 ? (
              <View style={styles.gamesGrid}>
                {list?.items?.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.gameCard}
                    onPress={() => handleGamePress(item.game.id)}
                    onLongPress={() => isOwner && isEditMode && handleGameLongPress(item.game.id, item.game.name)}
                    activeOpacity={0.7}
                    delayLongPress={500}
                  >
                    {item.game.cover_url ? (
                      <Image
                        source={{ uri: getIGDBImageUrl(item.game.cover_url, 'coverBig') }}
                        style={styles.gameCover}
                      />
                    ) : (
                      <View style={[styles.gameCover, styles.coverPlaceholder]}>
                        <Text style={styles.placeholderText} numberOfLines={2}>
                          {item.game.name}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyList}>
                <Ionicons name="game-controller-outline" size={40} color={Colors.textDim} />
                <Text style={styles.emptyListText}>No games in this list yet</Text>
                {isOwner && (
                  <Text style={styles.emptyListSubtext}>Use search or tap games from your library above</Text>
                )}
              </View>
            )}

            {isOwner && isEditMode && (list?.items?.length || 0) > 0 && (
              <Text style={styles.hint}>Long press a game to remove it</Text>
            )}
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerSpacer: {
    width: 40,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  doneButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  listInfo: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  description: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  gameCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  addSection: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  searchWrapper: {
    position: 'relative',
    zIndex: 10,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
    maxHeight: 280,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  searchDropdownScroll: {
    maxHeight: 280,
  },
  searchLoading: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultInList: {
    backgroundColor: Colors.accent + '20',
  },
  searchResultCover: {
    width: 32,
    height: 43,
    borderRadius: BorderRadius.xs,
    marginRight: Spacing.sm,
  },
  searchResultName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  noResults: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  libraryTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  libraryLoading: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  libraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  libraryGame: {
    position: 'relative',
  },
  libraryCover: {
    width: 70,
    height: 93,
    borderRadius: BorderRadius.sm,
  },
  libraryCoverInList: {
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  coverPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inListOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLibrary: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  emptyLibraryText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  listSection: {
    padding: Spacing.lg,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gameCard: {
    width: '30%',
  },
  gameCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  placeholderText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'center',
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
  },
  emptyListText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyListSubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
})
