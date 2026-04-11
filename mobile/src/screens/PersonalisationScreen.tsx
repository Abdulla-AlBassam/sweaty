import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import LoadingSpinner from '../components/LoadingSpinner'
import PressableScale from '../components/PressableScale'
import SweatDropIcon from '../components/SweatDropIcon'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { BorderRadius, Colors, FontSize, Spacing } from '../constants/colors'
import { Fonts, Typography } from '../constants/fonts'
import { API_CONFIG, getIGDBImageUrl } from '../constants'
import type { GamingPlatform } from '../types'

interface PersonalisationScreenProps {
  onFinish: () => void | Promise<void>
  // Preview mode skips the Supabase write so a developer can open this screen
  // from Settings > Dev Tools and look at it without wiping their real platforms
  // or favourites. Continue just calls onFinish (which goBacks the preview).
  previewMode?: boolean
}

interface FavGame {
  id: number
  name: string
  cover_url?: string | null
  coverUrl?: string | null
}

// Mirror SettingsScreen's platform row so the personalisation step and the
// settings-edit step feel identical. Icons only, FA5 + MCI libraries.
const PLATFORM_OPTIONS: { key: GamingPlatform; icon: string; iconLibrary: 'fa5' | 'mci'; label: string }[] = [
  { key: 'playstation', icon: 'playstation', iconLibrary: 'fa5', label: 'PlayStation' },
  { key: 'xbox', icon: 'xbox', iconLibrary: 'fa5', label: 'Xbox' },
  { key: 'pc', icon: 'desktop-tower-monitor', iconLibrary: 'mci', label: 'PC' },
  { key: 'nintendo', icon: 'nintendo-switch', iconLibrary: 'mci', label: 'Nintendo' },
]

export default function PersonalisationScreen({ onFinish, previewMode = false }: PersonalisationScreenProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [platforms, setPlatforms] = useState<GamingPlatform[]>(profile?.gaming_platforms || [])
  const [favorites, setFavorites] = useState<FavGame[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const [isSearchVisible, setSearchVisible] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FavGame[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef<TextInput>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const togglePlatform = useCallback((key: GamingPlatform) => {
    Haptics.selectionAsync()
    setPlatforms((current) =>
      current.includes(key) ? current.filter((p) => p !== key) : [...current, key],
    )
  }, [])

  const openSearch = useCallback(() => {
    if (favorites.length >= 5) return
    setSearchVisible(true)
    setQuery('')
    setSearchResults([])
    setTimeout(() => searchInputRef.current?.focus(), 120)
  }, [favorites.length])

  const closeSearch = useCallback(() => {
    setSearchVisible(false)
    setQuery('')
    setSearchResults([])
    Keyboard.dismiss()
  }, [])

  const runSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setSearchResults([])
        return
      }
      setIsSearching(true)
      try {
        const res = await fetch(
          `${API_CONFIG.baseUrl}/api/games/search?q=${encodeURIComponent(q)}`,
        )
        if (res.ok) {
          const data = await res.json()
          const favIds = favorites.map((f) => f.id)
          setSearchResults(
            (data.games || []).filter((g: FavGame) => !favIds.includes(g.id)),
          )
        }
      } catch (err) {
        console.error('Personalisation search error:', err)
      } finally {
        setIsSearching(false)
      }
    },
    [favorites],
  )

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => runSearch(text), 300)
    },
    [runSearch],
  )

  const addFavorite = useCallback(
    (game: FavGame) => {
      if (favorites.length >= 5) return
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setFavorites((current) => [
        ...current,
        { id: game.id, name: game.name, cover_url: game.cover_url || game.coverUrl },
      ])
      closeSearch()
    },
    [favorites.length, closeSearch],
  )

  const removeFavorite = useCallback((id: number) => {
    Haptics.selectionAsync()
    setFavorites((current) => current.filter((g) => g.id !== id))
  }, [])

  const handleContinue = useCallback(async () => {
    if (previewMode) {
      Haptics.selectionAsync()
      await onFinish()
      return
    }

    if (!user) return
    if (platforms.length === 0) return

    setIsSaving(true)
    try {
      for (const game of favorites) {
        await supabase
          .from('games_cache')
          .upsert(
            {
              id: game.id,
              name: game.name,
              cover_url: game.cover_url || game.coverUrl || null,
              cached_at: new Date().toISOString(),
            },
            { onConflict: 'id' },
          )
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          gaming_platforms: platforms,
          favorite_games: favorites.length > 0 ? favorites.map((f) => f.id) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await onFinish()
    } catch (err) {
      console.error('Personalisation save error:', err)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setIsSaving(false)
    }
  }, [previewMode, user, platforms, favorites, refreshProfile, onFinish])

  const canContinue = (previewMode || platforms.length > 0) && !isSaving

  const getCoverUri = (game: FavGame) => {
    const raw = game.cover_url || game.coverUrl
    return raw ? getIGDBImageUrl(raw, 'coverBig2x') : null
  }

  const renderSearchResult = ({ item }: { item: FavGame }) => {
    const cover = getCoverUri(item)
    return (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => addFavorite(item)}
        accessibilityRole="button"
        accessibilityLabel={`Add ${item.name} to favourites`}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={styles.resultCover} />
        ) : (
          <View style={[styles.resultCover, styles.resultCoverPlaceholder]}>
            <SweatDropIcon size={16} variant="static" />
          </View>
        )}
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name}
        </Text>
        <Ionicons name="add-circle" size={24} color={Colors.accent} />
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageEyebrow}>STEP 01</Text>
        <Text style={styles.pageTitle}>A FEW THINGS</Text>
        <Text style={styles.pageSubtitle}>
          So your library and recommendations feel like yours.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WHAT DO YOU PLAY ON?</Text>
          <Text style={styles.sectionHint}>Pick any that apply.</Text>
          <View style={styles.platformsGrid}>
            {PLATFORM_OPTIONS.map((platform) => {
              const selected = platforms.includes(platform.key)
              const iconColor = selected ? Colors.cream : Colors.textMuted
              return (
                <PressableScale
                  key={platform.key}
                  containerStyle={{ flex: 1 }}
                  style={[
                    styles.platformButton,
                    selected && styles.platformButtonSelected,
                  ]}
                  onPress={() => togglePlatform(platform.key)}
                  haptic="selection"
                  scale={0.94}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={platform.label}
                >
                  {platform.iconLibrary === 'fa5' ? (
                    <FontAwesome5 name={platform.icon} size={22} color={iconColor} />
                  ) : (
                    <MaterialCommunityIcons name={platform.icon as any} size={22} color={iconColor} />
                  )}
                </PressableScale>
              )
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR TOP 5</Text>
          <Text style={styles.sectionHint}>
            Pick up to five favourites. You can change them later.
          </Text>
          <View style={styles.favGrid}>
            {[0, 1, 2, 3, 4].map((i) => {
              const game = favorites[i]
              if (game) {
                const cover = getCoverUri(game)
                return (
                  <View key={game.id} style={styles.favSlot}>
                    {cover ? (
                      <Image source={{ uri: cover }} style={styles.favCover} />
                    ) : (
                      <View style={[styles.favCover, styles.favCoverPlaceholder]}>
                        <SweatDropIcon size={20} variant="static" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFavorite(game.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${game.name}`}
                    >
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                )
              }
              return (
                <TouchableOpacity
                  key={`empty-${i}`}
                  style={styles.favSlot}
                  onPress={openSearch}
                  accessibilityRole="button"
                  accessibilityLabel={`Add favourite ${i + 1}`}
                >
                  <View style={[styles.favCover, styles.favSlotEmpty]}>
                    <Ionicons name="add" size={24} color={Colors.textDim} />
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.cta,
            !canContinue && styles.ctaDisabled,
            pressed && canContinue && styles.ctaPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          {isSaving ? (
            <LoadingSpinner size="small" color={Colors.background} />
          ) : (
            <Text style={[styles.ctaText, !canContinue && styles.ctaTextDisabled]}>
              {previewMode ? 'Done' : 'Continue'}
            </Text>
          )}
        </Pressable>
        {!previewMode && platforms.length === 0 && (
          <Text style={styles.footerHint}>Pick at least one platform to continue.</Text>
        )}
        {previewMode && (
          <Text style={styles.footerHint}>Preview only — nothing is saved.</Text>
        )}
      </View>

      <Modal
        visible={isSearchVisible}
        animationType="slide"
        transparent
        onRequestClose={closeSearch}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalAvoid}
        >
          <Pressable style={styles.modalOverlay} onPress={closeSearch}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeSearch} accessibilityRole="button" accessibilityLabel="Back">
                  <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Add a favourite</Text>
                <View style={{ width: 24 }} />
              </View>

              <View style={styles.searchField}>
                <Ionicons name="search" size={18} color={Colors.textDim} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search for a game..."
                  placeholderTextColor={Colors.textDim}
                  value={query}
                  onChangeText={handleQueryChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => { setQuery(''); setSearchResults([]) }}>
                    <Ionicons name="close-circle" size={18} color={Colors.textDim} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.resultsWrap}>
                {isSearching ? (
                  <View style={styles.centered}>
                    <LoadingSpinner size="small" color={Colors.accent} />
                  </View>
                ) : searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(g) => g.id.toString()}
                    renderItem={renderSearchResult}
                    keyboardShouldPersistTaps="handled"
                  />
                ) : query.length >= 2 ? (
                  <View style={styles.centered}>
                    <Text style={styles.emptyText}>No games found</Text>
                  </View>
                ) : (
                  <View style={styles.centered}>
                    <Ionicons name="search" size={40} color={Colors.textDim} />
                    <Text style={styles.emptyText}>Search to add a game</Text>
                  </View>
                )}
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  pageEyebrow: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.textDim,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  pageTitle: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.cream,
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  pageSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: Colors.cream,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  sectionHint: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginBottom: Spacing.lg,
  },
  platformsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  platformButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  platformButtonSelected: {
    borderColor: Colors.cream,
    backgroundColor: 'rgba(192, 200, 208, 0.08)',
  },
  favGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  favSlot: {
    flex: 1,
    aspectRatio: 3 / 4,
  },
  favCover: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
  },
  favCoverPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favSlotEmpty: {
    borderStyle: 'dashed',
    borderColor: Colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    borderRadius: BorderRadius.full,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cta: {
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  ctaText: {
    ...Typography.button,
    color: Colors.background,
    letterSpacing: 1,
  },
  ctaTextDisabled: {
    color: Colors.textDim,
  },
  footerHint: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  modalAvoid: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    minHeight: '60%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    margin: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  resultsWrap: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
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
  },
})
