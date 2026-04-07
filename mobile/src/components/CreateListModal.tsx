import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import LoadingSpinner from './LoadingSpinner'
import { Ionicons } from '@expo/vector-icons'
import SweatDropIcon from './SweatDropIcon'
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
  const titleInputRef = useRef<TextInput>(null)
  const focusTimeoutRef = useRef<NodeJS.Timeout>(undefined)

  // Auto-focus title input when modal opens
  useEffect(() => {
    if (visible) {
      focusTimeoutRef.current = setTimeout(() => {
        titleInputRef.current?.focus()
      }, 300)
    }
    return () => {
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)
    }
  }, [visible])

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isRanked, setIsRanked] = useState(false)
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
      setIsRanked(false)
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
      isPublic,
      isRanked
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
      accessibilityViewIsModal={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close" accessibilityRole="button">
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New List</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={!canCreate || isCreating}
            style={[styles.createButton, (!canCreate || isCreating) && styles.createButtonDisabled]}
            accessibilityLabel="Create list"
            accessibilityRole="button"
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
              ref={titleInputRef}
              style={styles.input}
              placeholder="My awesome list"
              placeholderTextColor={Colors.textDim}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              accessibilityLabel="List title"
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
              accessibilityLabel="List description"
            />
          </View>

          {/* Public/Private Toggle */}
          <TouchableOpacity
            style={[styles.toggleRow, { marginBottom: Spacing.sm }]}
            onPress={() => setIsPublic(!isPublic)}
            activeOpacity={0.7}
            accessibilityLabel="Make list public"
            accessibilityRole="button"
            accessibilityState={{ checked: isPublic }}
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

          {/* Ranked Toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsRanked(!isRanked)}
            activeOpacity={0.7}
            accessibilityLabel="Make list ranked"
            accessibilityRole="button"
            accessibilityState={{ checked: isRanked }}
          >
            <View style={styles.toggleInfo}>
              <Ionicons
                name={isRanked ? 'podium' : 'podium-outline'}
                size={20}
                color={Colors.text}
              />
              <Text style={styles.toggleLabel}>Ranked</Text>
            </View>
            <View style={[styles.toggleSwitch, isRanked && styles.toggleSwitchActive]}>
              <View style={[styles.toggleKnob, isRanked && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>

          {/* Selected Games Preview */}
          {selectedGames.length > 0 && (
            <View style={styles.selectedSection}>
              <View style={styles.selectedHeader}>
                <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>
                  Selected ({selectedGames.length})
                </Text>
                {isRanked && (
                  <View style={styles.rankedBadge}>
                    <Ionicons name="podium" size={11} color={Colors.textMuted} />
                    <Text style={styles.rankedBadgeText}>Ranked</Text>
                  </View>
                )}
              </View>
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
                    accessibilityLabel={`Remove ${game.name} from selection`}
                    accessibilityRole="button"
                  >
                    {game.cover_url ? (
                      <Image
                        source={{ uri: getIGDBImageUrl(game.cover_url, 'coverBig') }}
                        style={styles.selectedCover}
                        accessibilityLabel={`${game.name} cover art`}
                      />
                    ) : (
                      <View style={[styles.selectedCover, styles.coverPlaceholder]}>
                        <SweatDropIcon size={16} variant="static" />
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
                accessibilityLabel="Search for games to add to list"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearchDropdown(false); }} accessibilityLabel="Clear search" accessibilityRole="button">
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
                        accessibilityLabel={`${selected ? 'Deselect' : 'Select'} ${game.name}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        {coverUrl ? (
                          <Image
                            source={{ uri: getIGDBImageUrl(coverUrl, 'thumb') }}
                            style={styles.searchResultCover}
                            accessibilityLabel={`${game.name} cover art`}
                          />
                        ) : (
                          <View style={[styles.searchResultCover, styles.coverPlaceholder]}>
                            <SweatDropIcon size={12} variant="static" />
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
              <FlatList
                data={libraryGames}
                keyExtractor={(item) => item.id.toString()}
                numColumns={4}
                scrollEnabled={false}
                columnWrapperStyle={styles.libraryRow}
                renderItem={({ item: game }) => {
                  const selected = isGameSelected(game.id)
                  return (
                    <TouchableOpacity
                      style={styles.libraryGame}
                      onPress={() => toggleGameSelection(game)}
                      accessibilityLabel={`${selected ? 'Deselect' : 'Select'} ${game.name}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      {game.cover_url ? (
                        <Image
                          source={{ uri: getIGDBImageUrl(game.cover_url, 'coverBig') }}
                          style={[styles.libraryCover, selected && styles.libraryCoverSelected]}
                          accessibilityLabel={`${game.name} cover art`}
                        />
                      ) : (
                        <View style={[styles.libraryCover, styles.coverPlaceholder, selected && styles.libraryCoverSelected]}>
                          <SweatDropIcon size={20} variant="static" />
                        </View>
                      )}
                      {selected && (
                        <View style={styles.selectedOverlay}>
                          <Ionicons name="checkmark-circle" size={28} color={Colors.accent} />
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                }}
              />
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
      </KeyboardAvoidingView>
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
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  rankedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  rankedBadgeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.textMuted,
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
    paddingTop: 6,
    gap: Spacing.sm,
  },
  selectedGame: {
    position: 'relative',
    overflow: 'visible',
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
  libraryRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
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
    backgroundColor: Colors.overlay,
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
