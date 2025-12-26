import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Pressable,
  Keyboard,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, API_CONFIG } from '../constants'
import { supabase } from '../lib/supabase'

interface Game {
  id: number
  name: string
  cover_url?: string | null
  coverUrl?: string | null
}

interface EditFavoritesModalProps {
  visible: boolean
  onClose: () => void
  currentFavorites: Game[]
  userId: string
  onSaveSuccess: () => void
}

export default function EditFavoritesModal({
  visible,
  onClose,
  currentFavorites,
  userId,
  onSaveSuccess,
}: EditFavoritesModalProps) {
  const [favorites, setFavorites] = useState<Game[]>([])
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Game[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null)
  const searchInputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visible) {
      setFavorites(currentFavorites)
      setQuery('')
      setSearchResults([])
      setIsSearchMode(false)
      setActiveSlotIndex(null)
    }
  }, [visible, currentFavorites])

  const searchGames = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `${API_CONFIG.baseUrl}/api/games/search?q=${encodeURIComponent(searchQuery)}`
      )
      if (response.ok) {
        const data = await response.json()
        // Filter out games already in favorites
        const favoriteIds = favorites.map(f => f.id)
        const filtered = (data.games || []).filter(
          (g: Game) => !favoriteIds.includes(g.id)
        )
        setSearchResults(filtered)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [favorites])

  const handleSearchChange = (text: string) => {
    setQuery(text)
    const timeoutId = setTimeout(() => {
      searchGames(text)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const openSearchForSlot = (slotIndex: number) => {
    setActiveSlotIndex(slotIndex)
    setIsSearchMode(true)
    setQuery('')
    setSearchResults([])
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)
  }

  const closeSearch = () => {
    setIsSearchMode(false)
    setActiveSlotIndex(null)
    setQuery('')
    setSearchResults([])
    Keyboard.dismiss()
  }

  const addFavorite = (game: Game) => {
    if (favorites.length >= 3) return

    const newGame: Game = {
      id: game.id,
      name: game.name,
      cover_url: game.cover_url || game.coverUrl,
    }

    setFavorites([...favorites, newGame])
    closeSearch()
  }

  const removeFavorite = (gameId: number) => {
    setFavorites(favorites.filter(f => f.id !== gameId))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // First, ensure all favorite games are in games_cache
      for (const game of favorites) {
        await supabase
          .from('games_cache')
          .upsert({
            id: game.id,
            name: game.name,
            cover_url: game.cover_url || game.coverUrl || null,
            cached_at: new Date().toISOString(),
          }, { onConflict: 'id' })
      }

      // Update profile with favorite game IDs
      const favoriteIds = favorites.map(f => f.id)
      const { error } = await supabase
        .from('profiles')
        .update({
          favorite_games: favoriteIds.length > 0 ? favoriteIds : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      onSaveSuccess()
      onClose()
    } catch (error: any) {
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getCoverUrl = (game: Game) => {
    const url = game.cover_url || game.coverUrl
    return url ? getIGDBImageUrl(url, 'coverBig2x') : null
  }

  const renderSearchResult = ({ item }: { item: Game }) => {
    const coverUrl = getCoverUrl(item)

    return (
      <TouchableOpacity
        style={styles.searchResultItem}
        onPress={() => addFavorite(item)}
      >
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.resultCover} />
        ) : (
          <View style={[styles.resultCover, styles.resultCoverPlaceholder]}>
            <Ionicons name="game-controller-outline" size={16} color={Colors.textDim} />
          </View>
        )}
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <Ionicons
          name="add-circle"
          size={24}
          color={Colors.accent}
        />
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            {isSearchMode ? (
              <>
                <TouchableOpacity onPress={closeSearch} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Game</Text>
              </>
            ) : (
              <Text style={styles.headerTitle}>Edit Favorites</Text>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {isSearchMode ? (
            /* Search Mode View */
            <>
              {/* Search Input */}
              <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={Colors.textDim} style={styles.searchIcon} />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Search for a game..."
                    placeholderTextColor={Colors.textDim}
                    value={query}
                    onChangeText={handleSearchChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {query.length > 0 && (
                    <TouchableOpacity onPress={() => { setQuery(''); setSearchResults([]) }}>
                      <Ionicons name="close-circle" size={20} color={Colors.textDim} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Search Results */}
              <View style={styles.resultsContainer}>
                {isSearching ? (
                  <View style={styles.centered}>
                    <ActivityIndicator size="small" color={Colors.accent} />
                  </View>
                ) : searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSearchResult}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  />
                ) : query.length >= 2 ? (
                  <View style={styles.centered}>
                    <Text style={styles.noResults}>No games found</Text>
                  </View>
                ) : (
                  <View style={styles.centered}>
                    <Ionicons name="search" size={48} color={Colors.textDim} />
                    <Text style={styles.noResults}>Search for a game to add</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            /* Normal View - Favorites Grid */
            <>
              {/* Current Favorites */}
              <View style={styles.currentFavorites}>
                <Text style={styles.sectionLabel}>
                  Your Favorites ({favorites.length}/3)
                </Text>
                <View style={styles.favoritesRow}>
                  {[0, 1, 2].map((index) => {
                    const game = favorites[index]
                    if (game) {
                      const coverUrl = getCoverUrl(game)
                      return (
                        <View key={game.id} style={styles.favoriteSlot}>
                          {coverUrl ? (
                            <Image source={{ uri: coverUrl }} style={styles.favoriteCover} />
                          ) : (
                            <View style={[styles.favoriteCover, styles.favoriteCoverPlaceholder]}>
                              <Ionicons name="game-controller-outline" size={20} color={Colors.textDim} />
                            </View>
                          )}
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeFavorite(game.id)}
                          >
                            <Ionicons name="close-circle" size={22} color={Colors.error} />
                          </TouchableOpacity>
                          <Text style={styles.favoriteName} numberOfLines={1}>{game.name}</Text>
                        </View>
                      )
                    }
                    return (
                      <TouchableOpacity
                        key={`empty-${index}`}
                        style={styles.favoriteSlot}
                        onPress={() => openSearchForSlot(index)}
                      >
                        <View style={[styles.favoriteCover, styles.emptySlot]}>
                          <Ionicons name="add" size={28} color={Colors.textDim} />
                        </View>
                        <Text style={styles.emptySlotText}>Tap to add</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* Spacer */}
              <View style={styles.spacer} />

              {/* Save Button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Favorites</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    flex: 1,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  currentFavorites: {
    padding: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  favoritesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  favoriteSlot: {
    flex: 1,
    alignItems: 'center',
  },
  favoriteCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  favoriteCoverPlaceholder: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    borderStyle: 'dashed',
    borderColor: Colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  emptySlotText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  favoriteName: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  searchSection: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
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
  resultsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  noResults: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  resultCover: {
    width: 40,
    height: 53,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  resultCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
    marginHorizontal: Spacing.md,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.background,
    fontSize: FontSize.md,
  },
})
