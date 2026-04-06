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
  Modal,
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

  // Create/Edit list modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingListMeta, setEditingListMeta] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [newListSlug, setNewListSlug] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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
      if (list.game_ids.length === 0) {
        setListGames([])
        setIsLoadingGames(false)
        return
      }

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
      // First, ensure the game is cached in games_cache
      const { error: cacheError } = await supabase
        .from('games_cache')
        .upsert({
          id: game.id,
          name: game.name,
          cover_url: game.coverUrl || null,
          cached_at: new Date().toISOString(),
        }, { onConflict: 'id' })

      if (cacheError) {
        console.error('[AddGame] Cache error:', cacheError)
        // Continue anyway - game might already be cached
      }

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

  // Move list up/down in order
  const handleMoveList = useCallback(async (list: CuratedList, direction: 'up' | 'down') => {
    const currentIndex = lists.findIndex(l => l.id === list.id)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= lists.length) return

    const targetList = lists[targetIndex]

    try {
      // Swap display_order values
      const [{ error: error1 }, { error: error2 }] = await Promise.all([
        supabase
          .from('curated_lists')
          .update({ display_order: targetList.display_order })
          .eq('id', list.id),
        supabase
          .from('curated_lists')
          .update({ display_order: list.display_order })
          .eq('id', targetList.id),
      ])

      if (error1 || error2) throw error1 || error2

      // Update local state
      const newLists = [...lists]
      newLists[currentIndex] = { ...targetList, display_order: list.display_order }
      newLists[targetIndex] = { ...list, display_order: targetList.display_order }
      newLists.sort((a, b) => a.display_order - b.display_order)
      setLists(newLists)
    } catch (err) {
      console.error('[MoveList] Error:', err)
      Alert.alert('Error', 'Failed to reorder list')
    }
  }, [lists])

  // Create new list
  const handleCreateList = useCallback(async () => {
    if (!newListTitle.trim() || !newListSlug.trim()) {
      Alert.alert('Error', 'Title and slug are required')
      return
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(newListSlug)) {
      Alert.alert('Error', 'Slug must be lowercase letters, numbers, and hyphens only')
      return
    }

    setIsSaving(true)
    try {
      // Get max display_order
      const maxOrder = lists.reduce((max, l) => Math.max(max, l.display_order), 0)

      const { data, error } = await supabase
        .from('curated_lists')
        .insert({
          title: newListTitle.trim(),
          slug: newListSlug.trim(),
          description: newListDescription.trim() || null,
          game_ids: [],
          display_order: maxOrder + 1,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      setLists([...lists, data as CuratedList])
      setShowCreateModal(false)
      setNewListTitle('')
      setNewListSlug('')
      setNewListDescription('')
      Alert.alert('Success', 'List created!')
    } catch (err: any) {
      console.error('[CreateList] Error:', err)
      if (err.code === '23505') {
        Alert.alert('Error', 'A list with this slug already exists')
      } else {
        Alert.alert('Error', 'Failed to create list')
      }
    } finally {
      setIsSaving(false)
    }
  }, [newListTitle, newListSlug, newListDescription, lists])

  // Update list metadata (title, description)
  const handleUpdateListMeta = useCallback(async () => {
    if (!selectedList || !newListTitle.trim()) {
      Alert.alert('Error', 'Title is required')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('curated_lists')
        .update({
          title: newListTitle.trim(),
          description: newListDescription.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedList.id)

      if (error) throw error

      setSelectedList({
        ...selectedList,
        title: newListTitle.trim(),
        description: newListDescription.trim() || null,
      })
      setLists(prev => prev.map(l =>
        l.id === selectedList.id
          ? { ...l, title: newListTitle.trim(), description: newListDescription.trim() || null }
          : l
      ))
      setEditingListMeta(false)
      Alert.alert('Success', 'List updated!')
    } catch (err) {
      console.error('[UpdateListMeta] Error:', err)
      Alert.alert('Error', 'Failed to update list')
    } finally {
      setIsSaving(false)
    }
  }, [selectedList, newListTitle, newListDescription])

  // Delete list
  const handleDeleteList = useCallback(async (list: CuratedList) => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('curated_lists')
                .delete()
                .eq('id', list.id)

              if (error) throw error

              setLists(prev => prev.filter(l => l.id !== list.id))
              Alert.alert('Success', 'List deleted')
            } catch (err) {
              console.error('[DeleteList] Error:', err)
              Alert.alert('Error', 'Failed to delete list')
            }
          },
        },
      ]
    )
  }, [])

  // Open edit metadata modal
  const handleEditListMeta = useCallback(() => {
    if (!selectedList) return
    setNewListTitle(selectedList.title)
    setNewListDescription(selectedList.description || '')
    setEditingListMeta(true)
  }, [selectedList])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  // Render list item with reorder controls
  const renderListItem = ({ item, index }: { item: CuratedList; index: number }) => (
    <View style={[styles.listCard, !item.is_active && styles.listCardInactive]}>
      {/* Reorder buttons */}
      <View style={styles.reorderButtons}>
        <TouchableOpacity
          style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
          onPress={() => handleMoveList(item, 'up')}
          disabled={index === 0}
          accessibilityLabel={`Move ${item.title} up`}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-up" size={18} color={index === 0 ? Colors.textDim : Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.reorderButton, index === lists.length - 1 && styles.reorderButtonDisabled]}
          onPress={() => handleMoveList(item, 'down')}
          disabled={index === lists.length - 1}
          accessibilityLabel={`Move ${item.title} down`}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-down" size={18} color={index === lists.length - 1 ? Colors.textDim : Colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.listCardContent}
        onPress={() => handleSelectList(item)}
        accessibilityLabel={`Edit ${item.title}`}
        accessibilityRole="button"
      >
        <View style={styles.listInfo}>
          <Text style={styles.listTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.listDescription} numberOfLines={1}>{item.description}</Text>
          )}
          <Text style={styles.listCount}>{item.game_ids.length} games</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.listActions}>
        <TouchableOpacity
          style={[styles.actionButton, !item.is_active && styles.actionButtonInactive]}
          onPress={() => handleToggleList(item)}
          accessibilityLabel={`${item.is_active ? 'Hide' : 'Show'} ${item.title}`}
          accessibilityRole="button"
        >
          <Ionicons
            name={item.is_active ? 'eye' : 'eye-off'}
            size={16}
            color={item.is_active ? Colors.accent : Colors.textDim}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteList(item)}
          accessibilityLabel={`Delete ${item.title}`}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  )

  // Render game item in edit mode
  const renderGameItem = ({ item }: { item: SearchGame }) => (
    <View style={styles.gameItem}>
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.gameCover} accessibilityLabel={`${item.name} cover`} />
      ) : (
        <View style={[styles.gameCover, styles.coverPlaceholder]}>
          <Ionicons name="game-controller" size={16} color={Colors.textDim} />
        </View>
      )}
      <Text style={styles.gameName} numberOfLines={2}>{item.name}</Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveGame(item)}
        accessibilityLabel={`Remove ${item.name}`}
        accessibilityRole="button"
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
      accessibilityLabel={`Add ${item.name} to list`}
      accessibilityRole="button"
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.searchCover} accessibilityLabel={`${item.name} cover`} />
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
        <TouchableOpacity onPress={handleBack} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'list' && 'CURATED LISTS'}
          {mode === 'edit' && selectedList?.title.toUpperCase()}
          {mode === 'search' && 'ADD GAME'}
        </Text>
        {mode === 'list' && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
            accessibilityLabel="Create new list"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={24} color={Colors.accent} />
          </TouchableOpacity>
        )}
        {mode === 'edit' && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleEditListMeta}
              accessibilityLabel="Edit list details"
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={20} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setMode('search')}
              accessibilityLabel="Add game to list"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={24} color={Colors.accent} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* List Mode */}
      {mode === 'list' && (
        isLoading ? (
          <View style={styles.centered}>
            <LoadingSpinner size="large" />
          </View>
        ) : lists.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="list-outline" size={48} color={Colors.textDim} />
            <Text style={styles.emptyText}>No lists yet</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowCreateModal(true)}
              accessibilityLabel="Create first list"
              accessibilityRole="button"
            >
              <Text style={styles.emptyButtonText}>Create First List</Text>
            </TouchableOpacity>
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
        <>
          {/* List info header */}
          {selectedList?.description && (
            <View style={styles.listMetaHeader}>
              <Text style={styles.listMetaDescription}>{selectedList.description}</Text>
            </View>
          )}

          {isLoadingGames ? (
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
                accessibilityLabel="Add first game"
                accessibilityRole="button"
              >
                <Text style={styles.emptyButtonText}>Add First Game</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={listGames}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={renderGameItem}
              contentContainerStyle={styles.gamesContent}
            />
          )}
        </>
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
              accessibilityLabel="Search for a game"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search" accessibilityRole="button">
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

      {/* Create List Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
        accessibilityViewIsModal={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREATE NEW LIST</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} accessibilityLabel="Close" accessibilityRole="button">
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Best RPGs"
                placeholderTextColor={Colors.textDim}
                value={newListTitle}
                onChangeText={setNewListTitle}
                accessibilityLabel="List title"
              />

              <Text style={styles.inputLabel}>Slug (URL-friendly)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., best-rpgs"
                placeholderTextColor={Colors.textDim}
                value={newListSlug}
                onChangeText={(text) => setNewListSlug(text.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                autoCapitalize="none"
                accessibilityLabel="List slug"
              />

              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="A short description for this list..."
                placeholderTextColor={Colors.textDim}
                value={newListDescription}
                onChangeText={setNewListDescription}
                multiline
                numberOfLines={3}
                accessibilityLabel="List description"
              />
            </View>

            <TouchableOpacity
              style={[styles.modalButton, isSaving && styles.modalButtonDisabled]}
              onPress={handleCreateList}
              disabled={isSaving}
              accessibilityLabel="Create list"
              accessibilityRole="button"
            >
              {isSaving ? (
                <LoadingSpinner size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Create List</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit List Meta Modal */}
      <Modal
        visible={editingListMeta}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingListMeta(false)}
        accessibilityViewIsModal={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDIT LIST</Text>
              <TouchableOpacity onPress={() => setEditingListMeta(false)} accessibilityLabel="Close" accessibilityRole="button">
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="List title"
                placeholderTextColor={Colors.textDim}
                value={newListTitle}
                onChangeText={setNewListTitle}
                accessibilityLabel="List title"
              />

              <Text style={styles.inputLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="A short description for this list..."
                placeholderTextColor={Colors.textDim}
                value={newListDescription}
                onChangeText={setNewListDescription}
                multiline
                numberOfLines={3}
                accessibilityLabel="List description"
              />
            </View>

            <TouchableOpacity
              style={[styles.modalButton, isSaving && styles.modalButtonDisabled]}
              onPress={handleUpdateListMeta}
              disabled={isSaving}
              accessibilityLabel="Save changes"
              accessibilityRole="button"
            >
              {isSaving ? (
                <LoadingSpinner size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerButton: {
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
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  listCardInactive: {
    opacity: 0.5,
  },
  reorderButtons: {
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.sm,
    gap: 2,
  },
  reorderButton: {
    padding: 4,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  listCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  listDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: 2,
  },
  listCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.sm,
    gap: Spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonInactive: {
    opacity: 0.5,
  },
  listMetaHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listMetaDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayDark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  modalBody: {
    gap: Spacing.md,
  },
  inputLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
})
