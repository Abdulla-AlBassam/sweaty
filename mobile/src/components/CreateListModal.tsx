import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  FlatList,
  Keyboard,
} from 'react-native'
import LoadingSpinner from './LoadingSpinner'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { createList, addGameToList } from '../hooks/useLists'
import { supabase } from '../lib/supabase'
import { GameList, Game } from '../types'

interface CreateListModalProps {
  visible: boolean
  onClose: () => void
  onCreated?: (list: GameList) => void
}

interface LibraryGame {
  id: number
  name: string
  cover_url: string | null
}

export default function CreateListModal({ visible, onClose, onCreated }: CreateListModalProps) {
  const { user } = useAuth()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Game[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)

  // Library state
  const [libraryGames, setLibraryGames] = useState<LibraryGame[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)

  // Selected games
  const [selectedGames, setSelectedGames] = useState<LibraryGame[]>([])

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setTitle('')
      setDescription('')
      setIsPublic(true)
      setError(null)
      setSearchQuery('')
      setSearchResults([])
      setSelectedGames([])
      fetchLibrary()
    }
  }, [visible])

  // Fetch user's library
  const fetchLibrary = async () => {
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
  }

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

  const toggleGameSelection = (game: LibraryGame) => {
    setSelectedGames(prev => {
      const isSelected = prev.some(g => g.id === game.id)
      if (isSelected) {
        return prev.filter(g => g.id !== game.id)
      }
      return [...prev, game]
    })
  }

  const isGameSelected = (gameId: number) => {
    return selectedGames.some(g => g.id === gameId)
  }

  const handleSearchResultPress = (game: Game) => {
    // API returns coverUrl (camelCase), database has cover_url (snake_case)
    const coverUrl = game.cover_url || (game as any).coverUrl || (game as any).cover?.url || (game as any).cover || null
    const libraryGame: LibraryGame = {
      id: game.id,
      name: game.name,
      cover_url: coverUrl,
    }
    toggleGameSelection(libraryGame)
    setSearchQuery('')
    setShowSearchDropdown(false)
    Keyboard.dismiss()
  }

  const handleCreate = async () => {
    if (!user) return
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    setIsCreating(true)
    setError(null)

    // Create the list
    const { data: newList, error: createError } = await createList(
      user.id,
      title.trim(),
      description.trim() || undefined,
      isPublic
    )

    if (createError || !newList) {
      setError(createError || 'Failed to create list')
      setIsCreating(false)
      return
    }

    // Add selected games to the list
    if (selectedGames.length > 0) {
      for (let i = 0; i < selectedGames.length; i++) {
        const game = selectedGames[i]
        await addGameToList(newList.id, game.id, {
          name: game.name,
          cover_url: game.cover_url,
        })
      }
    }

    setIsCreating(false)
    onCreated?.(newList)
    onClose()
  }

  const canCreate = title.trim().length > 0

  // Filter library games that aren't already selected (for display purposes)
  const availableLibraryGames = libraryGames.filter(g => !isGameSelected(g.id))

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New List</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={!canCreate || isCreating}
            style={[styles.createButton, (!canCreate || isCreating) && styles.createButtonDisabled]}
          >
            {isCreating ? (
              <LoadingSpinner size="small" color={Colors.background} />
            ) : (
              <Text style={[styles.createButtonText, !canCreate && styles.createButtonTextDisabled]}>
                Create
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="My awesome list"
              placeholderTextColor={Colors.textDim}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's this list about?"
              placeholderTextColor={Colors.textDim}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Public/Private Toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsPublic(!isPublic)}
            activeOpacity={0.7}
          >
            <View style={styles.toggleInfo}>
              <Ionicons
                name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                size={20}
                color={Colors.text}
              />
              <Text style={styles.toggleLabel}>
                {isPublic ? 'Public' : 'Private'}
              </Text>
            </View>
            <View style={[styles.toggleSwitch, isPublic && styles.toggleSwitchActive]}>
              <View style={[styles.toggleKnob, isPublic && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>

          {/* Selected Games Preview */}
          {selectedGames.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={styles.sectionLabel}>
                Selected ({selectedGames.length})
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.selectedScroll}
                contentContainerStyle={styles.selectedContent}
              >
                {selectedGames.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.selectedGame}
                    onPress={() => toggleGameSelection(game)}
                  >
                    {game.cover_url ? (
                      <Image
                        source={{ uri: getIGDBImageUrl(game.cover_url, 'coverBig') }}
                        style={styles.selectedCover}
                      />
                    ) : (
                      <View style={[styles.selectedCover, styles.coverPlaceholder]}>
                        <Ionicons name="game-controller" size={16} color={Colors.textDim} />
                      </View>
                    )}
                    <View style={styles.removeIcon}>
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Search Section */}
          <View style={styles.searchSection}>
            <Text style={styles.sectionLabel}>Add Games</Text>
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
                {isSearching ? (
                  <View style={styles.searchLoading}>
                    <LoadingSpinner size="small" color={Colors.accent} />
                  </View>
                ) : searchResults.length > 0 ? (
                  searchResults.map((game) => {
                    const selected = isGameSelected(game.id)
                    // API returns coverUrl (camelCase), database has cover_url (snake_case)
                    const coverUrl = game.cover_url || (game as any).coverUrl || (game as any).cover?.url || (game as any).cover
                    return (
                      <TouchableOpacity
                        key={game.id}
                        style={[styles.searchResult, selected && styles.searchResultSelected]}
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
                        {selected && (
                          <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                        )}
                      </TouchableOpacity>
                    )
                  })
                ) : searchQuery.length >= 2 ? (
                  <Text style={styles.noResults}>No games found</Text>
                ) : null}
              </View>
            )}
          </View>

          {/* Library Section */}
          <View style={styles.librarySection}>
            <Text style={styles.sectionLabel}>Select from your library</Text>
            {isLoadingLibrary ? (
              <View style={styles.libraryLoading}>
                <LoadingSpinner size="small" color={Colors.accent} />
              </View>
            ) : libraryGames.length > 0 ? (
              <View style={styles.libraryGrid}>
                {libraryGames.map((game) => {
                  const selected = isGameSelected(game.id)
                  return (
                    <TouchableOpacity
                      key={game.id}
                      style={styles.libraryGame}
                      onPress={() => toggleGameSelection(game)}
                    >
                      {game.cover_url ? (
                        <Image
                          source={{ uri: getIGDBImageUrl(game.cover_url, 'coverBig') }}
                          style={[styles.libraryCover, selected && styles.libraryCoverSelected]}
                        />
                      ) : (
                        <View style={[styles.libraryCover, styles.coverPlaceholder, selected && styles.libraryCoverSelected]}>
                          <Ionicons name="game-controller" size={20} color={Colors.textDim} />
                        </View>
                      )}
                      {selected && (
                        <View style={styles.selectedOverlay}>
                          <Ionicons name="checkmark-circle" size={28} color={Colors.accent} />
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            ) : (
              <View style={styles.emptyLibrary}>
                <Text style={styles.emptyLibraryText}>No games in your library yet</Text>
              </View>
            )}
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
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
  closeButton: {
    padding: Spacing.xs,
    width: 80,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  createButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.background,
  },
  createButtonTextDisabled: {
    color: Colors.textDim,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 70,
    paddingTop: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggleLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: Colors.accent,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.textMuted,
  },
  toggleKnobActive: {
    backgroundColor: Colors.text,
    marginLeft: 'auto',
  },
  selectedSection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  selectedScroll: {
    marginHorizontal: -Spacing.lg,
  },
  selectedContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  selectedGame: {
    position: 'relative',
  },
  selectedCover: {
    width: 60,
    height: 80,
    borderRadius: BorderRadius.sm,
  },
  removeIcon: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  searchSection: {
    marginBottom: Spacing.lg,
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 300,
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
  searchResultSelected: {
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
  librarySection: {
    marginBottom: Spacing.lg,
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
  libraryCoverSelected: {
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  coverPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOverlay: {
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.error,
    marginLeft: Spacing.sm,
    flex: 1,
  },
})
