import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { MainStackParamList } from '../navigation'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { supabase } from '../lib/supabase'
import { API_CONFIG } from '../constants'
import LoadingSpinner from '../components/LoadingSpinner'

type NavigationProp = NativeStackNavigationProp<MainStackParamList>

interface CuratedList {
  id: string
  slug: string
  title: string
  description: string | null
  game_ids: number[]
  display_order: number
  is_active: boolean
}

interface SearchGame {
  id: number
  name: string
  coverUrl?: string | null
}

type Mode = 'list' | 'edit' | 'search'

export default function AdminCuratedListsScreen() {
  const navigation = useNavigation<NavigationProp>()

  const [lists, setLists] = useState<CuratedList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [selectedList, setSelectedList] = useState<CuratedList | null>(null)
  const [listGames, setListGames] = useState<SearchGame[]>([])
  const [isLoadingGames, setIsLoadingGames] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchGame[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  // Fetch all curated lists
  const fetchLists = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('curated_lists')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setLists((data || []) as CuratedList[])
    } catch (err) {
      console.error('[AdminCuratedLists] Error:', err)
      Alert.alert('Error', 'Failed to fetch lists')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch games for a specific list
  const fetchListGames = useCallback(async (list: CuratedList) => {
    setIsLoadingGames(true)
    try {
      const { data, error } = await supabase
        .from('games_cache')
        .select('id, name, cover_url')
        .in('id', list.game_ids)

      if (error) throw error

      // Map to correct format and preserve order
      const gamesMap = new Map(
        (data || []).map((g: any) => [g.id, { id: g.id, name: g.name, coverUrl: g.cover_url }])
      )
      const orderedGames = list.game_ids
        .map(id => gamesMap.get(id))
        .filter((g): g is SearchGame => g !== undefined)

      setListGames(orderedGames)
    } catch (err) {
      console.error('[AdminCuratedLists] Error fetching games:', err)
    } finally {
      setIsLoadingGames(false)
    }
  }, [])

  // Select a list to edit
  const handleSelectList = useCallback((list: CuratedList) => {
    setSelectedList(list)
    setMode('edit')
    fetchListGames(list)
  }, [fetchListGames])

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

  // Add game to list
  const handleAddGame = useCallback(async (game: SearchGame) => {
    if (!selectedList) return

    // Check if already in list
    if (selectedList.game_ids.includes(game.id)) {
      Alert.alert('Already Added', 'This game is already in the list')
      return
    }

    setIsAdding(true)
    try {
      const newGameIds = [...selectedList.game_ids, game.id]

      const { error } = await supabase
        .from('curated_lists')
        .update({ game_ids: newGameIds, updated_at: new Date().toISOString() })
        .eq('id', selectedList.id)

      if (error) throw error

      // Update local state
      setSelectedList({ ...selectedList, game_ids: newGameIds })
      setListGames([...listGames, game])
      setMode('edit')
      setSearchQuery('')
      setSearchResults([])

      Alert.alert('Success', `Added "${game.name}" to list`)
    } catch (err) {
      console.error('[AddGame] Error:', err)
      Alert.alert('Error', 'Failed to add game')
    } finally {
      setIsAdding(false)
    }
  }, [selectedList, listGames])

  // Remove game from list
  const handleRemoveGame = useCallback(async (game: SearchGame) => {
    if (!selectedList) return

    Alert.alert(
      'Remove Game',
      `Remove "${game.name}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const newGameIds = selectedList.game_ids.filter(id => id !== game.id)

              const { error } = await supabase
                .from('curated_lists')
                .update({ game_ids: newGameIds, updated_at: new Date().toISOString() })
                .eq('id', selectedList.id)

              if (error) throw error

              setSelectedList({ ...selectedList, game_ids: newGameIds })
              setListGames(listGames.filter(g => g.id !== game.id))
            } catch (err) {
              console.error('[RemoveGame] Error:', err)
              Alert.alert('Error', 'Failed to remove game')
            }
          },
        },
      ]
    )
  }, [selectedList, listGames])

  // Toggle list active state
  const handleToggleList = useCallback(async (list: CuratedList) => {
    try {
      const { error } = await supabase
        .from('curated_lists')
        .update({ is_active: !list.is_active, updated_at: new Date().toISOString() })
        .eq('id', list.id)

      if (error) throw error

      setLists(prev => prev.map(l =>
        l.id === list.id ? { ...l, is_active: !l.is_active } : l
      ))
    } catch (err) {
      console.error('[ToggleList] Error:', err)
      Alert.alert('Error', 'Failed to toggle list')
    }
  }, [])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  // Render list item
  const renderListItem = ({ item }: { item: CuratedList }) => (
    <TouchableOpacity
      style={[styles.listCard, !item.is_active && styles.listCardInactive]}
      onPress={() => handleSelectList(item)}
    >
      <View style={styles.listInfo}>
        <Text style={styles.listTitle}>{item.title}</Text>
        <Text style={styles.listSlug}>/{item.slug}</Text>
        <Text style={styles.listCount}>{item.game_ids.length} games</Text>
      </View>
      <View style={styles.listActions}>
        <TouchableOpacity
          style={[styles.actionButton, !item.is_active && styles.actionButtonInactive]}
          onPress={() => handleToggleList(item)}
        >
          <Ionicons
            name={item.is_active ? 'eye' : 'eye-off'}
            size={18}
            color={item.is_active ? Colors.accent : Colors.textDim}
          />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
      </View>
    </TouchableOpacity>
  )

  // Render game item in edit mode
  const renderGameItem = ({ item }: { item: SearchGame }) => (
    <View style={styles.gameItem}>
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.gameCover} />
      ) : (
        <View style={[styles.gameCover, styles.coverPlaceholder]}>
          <Ionicons name="game-controller" size={16} color={Colors.textDim} />
        </View>
      )}
      <Text style={styles.gameName} numberOfLines={2}>{item.name}</Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveGame(item)}
      >
        <Ionicons name="close-circle" size={24} color={Colors.error} />
      </TouchableOpacity>
    </View>
  )

  // Render search result
  const renderSearchResult = ({ item }: { item: SearchGame }) => (
    <TouchableOpacity
      style={styles.searchResult}
      onPress={() => handleAddGame(item)}
      disabled={isAdding}
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.searchCover} />
      ) : (
        <View style={[styles.searchCover, styles.coverPlaceholder]}>
          <Ionicons name="game-controller" size={16} color={Colors.textDim} />
        </View>
      )}
      <Text style={styles.searchName} numberOfLines={2}>{item.name}</Text>
      {selectedList?.game_ids.includes(item.id) ? (
        <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
      ) : (
        <Ionicons name="add-circle-outline" size={24} color={Colors.accent} />
      )}
    </TouchableOpacity>
  )

  // Handle back button
  const handleBack = () => {
    if (mode === 'search') {
      setMode('edit')
      setSearchQuery('')
      setSearchResults([])
    } else if (mode === 'edit') {
      setMode('list')
      setSelectedList(null)
      setListGames([])
      fetchLists() // Refresh list counts
    } else {
      navigation.goBack()
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'list' && 'CURATED LISTS'}
          {mode === 'edit' && selectedList?.title.toUpperCase()}
          {mode === 'search' && 'ADD GAME'}
        </Text>
        {mode === 'edit' && (
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
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            contentContainerStyle={styles.listContent}
          />
        )
      )}

      {/* Edit Mode */}
      {mode === 'edit' && (
        isLoadingGames ? (
          <View style={styles.centered}>
            <LoadingSpinner size="large" />
          </View>
        ) : listGames.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="game-controller-outline" size={48} color={Colors.textDim} />
            <Text style={styles.emptyText}>No games in this list</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setMode('search')}
            >
              <Text style={styles.emptyButtonText}>Add First Game</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={listGames}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderGameItem}
            contentContainerStyle={styles.gamesContent}
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
              <Text style={styles.hintText}>Search for a game to add it to the list</Text>
            </View>
          )}
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
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listCardInactive: {
    opacity: 0.5,
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  listSlug: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: 2,
  },
  listCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  gamesContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.md,
  },
  gameCover: {
    width: 40,
    height: 53,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  removeButton: {
    padding: Spacing.xs,
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
  searchCover: {
    width: 40,
    height: 53,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  searchName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
  },
})
