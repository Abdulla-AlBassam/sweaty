import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import LoadingSpinner from './LoadingSpinner'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MainStackParamList } from '../navigation'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, PLATFORMS } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { useCelebration } from '../contexts/CelebrationContext'
import { supabase } from '../lib/supabase'
import { getGamerLevel, getSocialLevel } from '../lib/xp'
import { useStreak } from '../hooks/useStreak'
import { useUserLists, addGameToList, removeGameFromList } from '../hooks/useLists'
import { haptics } from '../hooks/useHaptics'
import PressableScale from './PressableScale'
import SweatDropIcon from './SweatDropIcon'
import CreateListModal from './CreateListModal'
import ReviewEditorModal from './ReviewEditorModal'
import FormattedText from './FormattedText'

// XP values for different statuses
const GAMER_XP_VALUES: Record<string, number> = {
  completed: 100,
  played: 50,
  playing: 25,
  on_hold: 25,
  dropped: 10,
  want_to_play: 0,
}

const SOCIAL_XP_VALUES = {
  review: 30,
  rating: 5,
}

// Helper component to render a star with half-star support
interface StarIconProps {
  starNumber: number
  rating: number | null
  size?: number
  color?: string
}

function StarIcon({ starNumber, rating, size = 32, color = Colors.cream }: StarIconProps) {
  if (!rating) {
    return <Ionicons name="star-outline" size={size} color={Colors.textDim} />
  }

  if (rating >= starNumber) {
    // Full star
    return <Ionicons name="star" size={size} color={color} />
  } else if (rating >= starNumber - 0.5) {
    // Half star
    return <Ionicons name="star-half" size={size} color={color} />
  } else {
    // Empty star
    return <Ionicons name="star-outline" size={size} color={Colors.textDim} />
  }
}

interface GameData {
  id: number
  name: string
  coverUrl?: string | null
  cover_url?: string | null
  platforms?: string[]
  genres?: string[]
  summary?: string
  firstReleaseDate?: string | null
  first_release_date?: string | null
}

interface LogGameModalProps {
  visible: boolean
  onClose: () => void
  game: GameData
  existingLog?: {
    id: string
    status: string
    rating: number | null
    platform: string | null
    review?: string | null
  } | null
  onSaveSuccess?: () => void
}

const STATUS_OPTIONS = [
  { value: 'want_to_play', label: 'Want to Play', icon: 'bookmark-outline' },
  { value: 'playing', label: 'Playing', icon: 'play-circle-outline' },
  { value: 'played', label: 'Played', icon: 'game-controller-outline' },
  { value: 'completed', label: 'Completed', icon: 'checkmark-circle-outline' },
  { value: 'on_hold', label: 'On Hold', icon: 'pause-circle-outline' },
  { value: 'dropped', label: 'Dropped', icon: 'close-circle-outline' },
]

export default function LogGameModal({
  visible,
  onClose,
  game,
  existingLog,
  onSaveSuccess,
}: LogGameModalProps) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const { user } = useAuth()
  const { recordActivity } = useStreak()
  const { celebrateLevelUp } = useCelebration()

  const handleGamePress = () => {
    onClose()
    navigation.navigate('GameDetail', { gameId: game.id })
  }
  const [status, setStatus] = useState<string | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [platform, setPlatform] = useState<string | null>(null)
  const [review, setReview] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusPickerVisible, setStatusPickerVisible] = useState(false)
  const [platformPickerVisible, setPlatformPickerVisible] = useState(false)
  const [listsPickerVisible, setListsPickerVisible] = useState(false)
  const [showCreateListModal, setShowCreateListModal] = useState(false)
  const [reviewEditorVisible, setReviewEditorVisible] = useState(false)


  // Lists functionality
  const { lists, isLoading: listsLoading, refetch: refetchLists } = useUserLists(user?.id)
  const [gameInLists, setGameInLists] = useState<Set<string>>(new Set())
  const [loadingLists, setLoadingLists] = useState<Set<string>>(new Set())

  // Check which lists contain this game
  useEffect(() => {
    const checkGameInLists = async () => {
      if (!lists.length || !visible) return

      const inLists = new Set<string>()

      // Check each list's preview games for this game
      lists.forEach((list) => {
        const hasGame = list.preview_games?.some((g) => g.id === game.id)
        if (hasGame) {
          inLists.add(list.id)
        }
      })

      // For more accurate results, check the database
      const { data } = await supabase
        .from('list_items')
        .select('list_id')
        .eq('game_id', game.id)
        .in('list_id', lists.map((l) => l.id))

      if (data) {
        data.forEach((item: any) => {
          inLists.add(item.list_id)
        })
      }

      setGameInLists(inLists)
    }

    if (visible) {
      checkGameInLists()
    }
  }, [lists, game.id, visible])

  const handleToggleList = async (listId: string) => {
    const isInList = gameInLists.has(listId)

    setLoadingLists((prev) => new Set(prev).add(listId))

    if (isInList) {
      const { error } = await removeGameFromList(listId, game.id)
      if (!error) {
        setGameInLists((prev) => {
          const next = new Set(prev)
          next.delete(listId)
          return next
        })
      }
    } else {
      const { error } = await addGameToList(listId, game.id)
      if (!error) {
        setGameInLists((prev) => new Set(prev).add(listId))
      }
    }

    setLoadingLists((prev) => {
      const next = new Set(prev)
      next.delete(listId)
      return next
    })

    refetchLists()
  }

  const handleListCreated = async (newList: any) => {
    setShowCreateListModal(false)
    refetchLists()

    // Auto-add game to the newly created list
    setLoadingLists((prev) => new Set(prev).add(newList.id))
    const { error } = await addGameToList(newList.id, game.id)
    if (!error) {
      setGameInLists((prev) => new Set(prev).add(newList.id))
    }
    setLoadingLists((prev) => {
      const next = new Set(prev)
      next.delete(newList.id)
      return next
    })
    refetchLists()
  }

  // Initialize with existing log data
  useEffect(() => {
    if (existingLog) {
      setStatus(existingLog.status)
      setRating(existingLog.rating)
      setPlatform(existingLog.platform)
      setReview(existingLog.review || '')
    } else {
      setStatus(null)
      setRating(null)
      setPlatform(null)
      setReview('')
    }
  }, [existingLog, visible])

  const coverUrl = game.coverUrl || game.cover_url
  const imageUrl = coverUrl ? getIGDBImageUrl(coverUrl, 'coverBig2x') : null

  // Get the current status option
  const currentStatusOption = STATUS_OPTIONS.find(opt => opt.value === status)

  // Handle half-star rating: left side = X.5, right side = X.0
  const handleHalfStarPress = (starNumber: number, isLeftHalf: boolean) => {
    const newRating = isLeftHalf ? starNumber - 0.5 : starNumber
    // Toggle off if same rating
    setRating(rating === newRating ? null : newRating)
  }

  const handleSave = async () => {
    if (!user || !status) return

    setIsSaving(true)
    setError(null)

    try {
      // Calculate XP before save (for comparison)
      const { data: existingLogs } = await supabase
        .from('game_logs')
        .select('status, rating, review')
        .eq('user_id', user.id)

      const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)

      // Calculate current XP totals
      const logsForXP = existingLogs || []
      let currentGamerXP = logsForXP.reduce((total, log) => {
        return total + (GAMER_XP_VALUES[log.status || 'want_to_play'] || 0)
      }, 0)
      let currentSocialXP = logsForXP.reduce((total, log) => {
        if (log.review && log.review.trim().length > 0) {
          return total + SOCIAL_XP_VALUES.review
        } else if (log.rating !== null && log.rating !== undefined) {
          return total + SOCIAL_XP_VALUES.rating
        }
        return total
      }, 0) + (followerCount || 0) * 10

      const currentGamerLevel = getGamerLevel(currentGamerXP)
      const currentSocialLevel = getSocialLevel(currentSocialXP)

      // First, ensure game is in games_cache
      const { error: cacheError } = await supabase
        .from('games_cache')
        .upsert({
          id: game.id,
          name: game.name,
          slug: game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          cover_url: game.coverUrl || game.cover_url || null,
          summary: game.summary || null,
          genres: game.genres || null,
          platforms: game.platforms || null,
          first_release_date: game.firstReleaseDate || game.first_release_date || null,
          cached_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        })

      if (cacheError) {
        console.error('Cache error:', cacheError)
        // Don't fail on cache error, continue with log
      }

      // Now save the game log
      const logData = {
        user_id: user.id,
        game_id: game.id,
        status,
        rating,
        platform,
        review: review.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (existingLog?.id) {
        // Update existing log
        const { error: updateError } = await supabase
          .from('game_logs')
          .update(logData)
          .eq('id', existingLog.id)

        if (updateError) throw updateError
      } else {
        // Insert new log
        const { error: insertError } = await supabase
          .from('game_logs')
          .insert({
            ...logData,
            created_at: new Date().toISOString(),
          })

        if (insertError) throw insertError
      }

      // Record activity for streak tracking
      await recordActivity()

      // Calculate XP earned from this action
      const oldGamerXP = existingLog ? GAMER_XP_VALUES[existingLog.status] || 0 : 0
      const newGamerXP = GAMER_XP_VALUES[status] || 0
      const gamerXPDiff = newGamerXP - oldGamerXP

      let oldSocialXP = 0
      if (existingLog) {
        if (existingLog.review && existingLog.review.trim().length > 0) {
          oldSocialXP = SOCIAL_XP_VALUES.review
        } else if (existingLog.rating !== null && existingLog.rating !== undefined) {
          oldSocialXP = SOCIAL_XP_VALUES.rating
        }
      }

      let newSocialXP = 0
      if (review.trim().length > 0) {
        newSocialXP = SOCIAL_XP_VALUES.review
      } else if (rating !== null) {
        newSocialXP = SOCIAL_XP_VALUES.rating
      }
      const socialXPDiff = newSocialXP - oldSocialXP

      // Calculate new totals
      const finalGamerXP = currentGamerXP + gamerXPDiff
      const finalSocialXP = currentSocialXP + socialXPDiff
      const newGamerLevel = getGamerLevel(finalGamerXP)
      const newSocialLevel = getSocialLevel(finalSocialXP)

      // Build XP notification message
      const xpParts: string[] = []
      if (gamerXPDiff > 0) xpParts.push(`+${gamerXPDiff} Gamer XP`)
      if (socialXPDiff > 0) xpParts.push(`+${socialXPDiff} Social XP`)

      // Check for level ups
      const gamerLeveledUp = newGamerLevel.level > currentGamerLevel.level
      const socialLeveledUp = newSocialLevel.level > currentSocialLevel.level

      // Haptic feedback on successful save
      haptics.success()

      // Close modal first
      onSaveSuccess?.()
      onClose()

      // Trigger celebration for level ups (after modal closes for better UX)
      if (gamerLeveledUp || socialLeveledUp) {
        // Small delay so modal closes first
        setTimeout(() => {
          if (gamerLeveledUp) {
            celebrateLevelUp(newGamerLevel.rank, newGamerLevel.level)
          } else if (socialLeveledUp) {
            celebrateLevelUp(newSocialLevel.rank, newSocialLevel.level)
          }
        }, 300)
      }

    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingLog?.id) return

    setIsSaving(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('game_logs')
        .delete()
        .eq('id', existingLog.id)

      if (deleteError) throw deleteError

      onSaveSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(err.message || 'Failed to delete')
    } finally {
      setIsSaving(false)
    }
  }

  // Picker Modal Component
  const PickerModal = ({
    visible,
    onClose,
    title,
    options,
    selectedValue,
    onSelect,
    showIcons = false,
  }: {
    visible: boolean
    onClose: () => void
    title: string
    options: { value: string; label: string; icon?: string }[]
    selectedValue: string | null
    onSelect: (value: string) => void
    showIcons?: boolean
  }) => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.pickerCloseButton} accessibilityLabel="Close" accessibilityRole="button">
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  selectedValue === item.value && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  onSelect(item.value)
                  onClose()
                }}
                accessibilityLabel={`Set ${title.toLowerCase()} to ${item.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedValue === item.value }}
              >
                {showIcons && item.icon && (
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={selectedValue === item.value ? Colors.cream : Colors.textMuted}
                    style={styles.pickerItemIcon}
                  />
                )}
                <Text
                  style={[
                    styles.pickerItemText,
                    selectedValue === item.value && styles.pickerItemTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {selectedValue === item.value && (
                  <Ionicons name="checkmark" size={22} color={Colors.cream} />
                )}
              </TouchableOpacity>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {existingLog ? 'Edit Log' : 'Log Game'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close game log" accessibilityRole="button">
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Game Info - Tappable to view game details */}
            <TouchableOpacity style={styles.gameInfo} onPress={handleGamePress} activeOpacity={0.7} accessibilityLabel={`View ${game.name} details`} accessibilityRole="button">
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.gameCover} accessibilityLabel={`${game.name} cover art`} />
              ) : (
                <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
                  <SweatDropIcon size={24} variant="static" />
                </View>
              )}
              <Text style={styles.gameTitle} numberOfLines={2}>{game.name}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
            </TouchableOpacity>

            {/* Status Dropdown */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setStatusPickerVisible(true)}
              accessibilityLabel={currentStatusOption ? `Status: ${currentStatusOption.label}` : 'Select status'}
              accessibilityRole="button"
            >
              <View style={styles.dropdownInner}>
                {currentStatusOption ? (
                  <>
                    <Text style={styles.dropdownLabel}>Log Game As...</Text>
                    <View style={styles.dropdownContent}>
                      <Ionicons
                        name={currentStatusOption.icon as any}
                        size={18}
                        color={Colors.textMuted}
                      />
                      <Text style={styles.dropdownText}>{currentStatusOption.label}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.dropdownPlaceholder}>Log Game As...</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Platform Dropdown */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setPlatformPickerVisible(true)}
              accessibilityLabel={platform ? `Platform: ${platform}` : 'Select platform'}
              accessibilityRole="button"
            >
              <View style={styles.dropdownInner}>
                {platform ? (
                  <>
                    <Text style={styles.dropdownLabel}>Platform</Text>
                    <Text style={styles.dropdownText}>{platform}</Text>
                  </>
                ) : (
                  <Text style={styles.dropdownPlaceholder}>Platform</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Rating */}
            <Text style={styles.ratingLabel}>Rating{rating ? ` (${rating})` : ''}</Text>
            <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((starNumber) => (
                  <View key={starNumber} style={styles.starWrapper}>
                    <TouchableOpacity
                      style={styles.starHalfTouch}
                      onPress={() => handleHalfStarPress(starNumber, true)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Rate ${starNumber - 0.5} stars`}
                      accessibilityRole="button"
                    />
                    <TouchableOpacity
                      style={styles.starHalfTouch}
                      onPress={() => handleHalfStarPress(starNumber, false)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Rate ${starNumber} stars`}
                      accessibilityRole="button"
                    />
                    <View style={styles.starIconContainer} pointerEvents="none">
                      <StarIcon starNumber={starNumber} rating={rating} size={36} />
                    </View>
                  </View>
                ))}
                {rating && (
                  <TouchableOpacity onPress={() => setRating(null)} style={styles.clearRating} accessibilityLabel="Clear rating" accessibilityRole="button">
                    <Text style={styles.clearRatingText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

            {/* Review */}
            <TouchableOpacity
              style={styles.reviewContainer}
              onPress={() => setReviewEditorVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.fieldBoxLabel}>Review</Text>
              {review ? (
                <FormattedText style={styles.reviewPreviewText} numberOfLines={3}>
                  {review}
                </FormattedText>
              ) : (
                <Text style={styles.reviewPlaceholder}>Add a review...</Text>
              )}
            </TouchableOpacity>

            {/* Add to Lists */}
            {user && (
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setListsPickerVisible(true)}
                disabled={listsLoading}
                accessibilityLabel={gameInLists.size > 0 ? `${gameInLists.size} lists selected` : 'Select lists'}
                accessibilityRole="button"
              >
                <View style={styles.dropdownInner}>
                  {listsLoading ? (
                    <Text style={styles.dropdownPlaceholder}>Loading lists...</Text>
                  ) : gameInLists.size > 0 ? (
                    <>
                      <Text style={styles.dropdownLabel}>Add to Lists</Text>
                      <Text style={styles.dropdownText} numberOfLines={1}>
                        {gameInLists.size} {gameInLists.size === 1 ? 'list' : 'lists'} selected
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.dropdownPlaceholder}>Add to Lists</Text>
                  )}
                </View>
                <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            {existingLog && (
              <PressableScale
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={isSaving}
                haptic="medium"
                accessibilityLabel="Remove from library"
                accessibilityRole="button"
                accessibilityHint="Deletes this game from your library"
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </PressableScale>
            )}
            <PressableScale
              containerStyle={{ flex: 1 }}
              style={[
                styles.saveButton,
                !status && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!status || isSaving}
              haptic="medium"
              accessibilityLabel="Save game log"
              accessibilityRole="button"
            >
              {isSaving ? (
                <LoadingSpinner size="small" color={Colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {existingLog ? 'Update' : 'Save'}
                </Text>
              )}
            </PressableScale>
          </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      {/* Status Picker Modal */}
      <PickerModal
        visible={statusPickerVisible}
        onClose={() => setStatusPickerVisible(false)}
        title="Log Game As..."
        options={STATUS_OPTIONS}
        selectedValue={status}
        onSelect={setStatus}
        showIcons={true}
      />

      {/* Platform Picker Modal - Use our granular PLATFORMS constant */}
      <PickerModal
        visible={platformPickerVisible}
        onClose={() => setPlatformPickerVisible(false)}
        title="Select Platform"
        options={PLATFORMS.map(p => ({ value: p, label: p }))}
        selectedValue={platform}
        onSelect={setPlatform}
        showIcons={false}
      />

      {/* Lists Picker Modal - Multi-select with New List option */}
      <Modal
        visible={listsPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setListsPickerVisible(false)}
        accessibilityViewIsModal={true}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setListsPickerVisible(false)}>
          <Pressable style={styles.pickerContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Add to Lists</Text>
              <TouchableOpacity onPress={() => setListsPickerVisible(false)} style={styles.pickerCloseButton} accessibilityLabel="Close" accessibilityRole="button">
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={lists}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={styles.listsEmptyContainer}>
                  <Text style={styles.listsEmptyText}>No lists yet</Text>
                </View>
              }
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.newListButton}
                  onPress={() => {
                    setListsPickerVisible(false)
                    setShowCreateListModal(true)
                  }}
                  accessibilityLabel="Create new list"
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={22} color={'rgba(192, 200, 208, 0.6)'} />
                  <Text style={styles.newListButtonText}>New list</Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => {
                const isInList = gameInLists.has(item.id)
                const isLoadingItem = loadingLists.has(item.id)

                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      isInList && styles.pickerItemSelected,
                    ]}
                    onPress={() => handleToggleList(item.id)}
                    disabled={isLoadingItem}
                    accessibilityLabel={`${isInList ? 'Remove from' : 'Add to'} ${item.title}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isInList }}
                  >
                    <View style={styles.listPickerInfo}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          isInList && styles.pickerItemTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {!item.is_public && (
                        <Ionicons name="lock-closed" size={12} color={Colors.textMuted} style={{ marginLeft: 6 }} />
                      )}
                    </View>
                    {isLoadingItem ? (
                      <LoadingSpinner size="small" color={Colors.cream} />
                    ) : isInList ? (
                      <Ionicons name="checkmark" size={22} color={Colors.cream} />
                    ) : (
                      <View style={styles.listEmptyCheckPicker} />
                    )}
                  </TouchableOpacity>
                )
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create List Modal */}
      <CreateListModal
        visible={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        onCreated={handleListCreated}
      />

      <ReviewEditorModal
        visible={reviewEditorVisible}
        onClose={() => setReviewEditorVisible(false)}
        onSave={(md) => {
          setReview(md)
          setReviewEditorVisible(false)
        }}
        initialValue={review}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
  },
  gameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  gameCover: {
    width: 50,
    height: 67,
    borderRadius: BorderRadius.sm,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  gameCoverPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitle: {
    flex: 1,
    marginLeft: Spacing.md,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  // Dropdown styles
  dropdown: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  dropdownInner: {
    flex: 1,
  },
  dropdownLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginBottom: 2,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dropdownText: {
    fontFamily: Fonts.body,
    color: Colors.text,
    fontSize: FontSize.md,
  },
  dropdownPlaceholder: {
    fontFamily: Fonts.body,
    color: Colors.textDim,
    fontSize: FontSize.md,
  },
  // Rating label (standalone, no box)
  ratingLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  // Shared field box (review)
  fieldBoxLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginBottom: Spacing.sm,
  },
  // Picker Modal styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '50%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pickerTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pickerCloseButton: {
    padding: Spacing.xs,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pickerItemSelected: {
    backgroundColor: Colors.background,
  },
  pickerItemIcon: {
    marginRight: Spacing.md,
  },
  pickerItemText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pickerItemTextSelected: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.cream,
  },
  // Rating styles
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  starWrapper: {
    width: 44,
    height: 44,
    flexDirection: 'row',
    position: 'relative',
  },
  starHalfTouch: {
    width: 22,
    height: 44,
    zIndex: 1,
  },
  starIconContainer: {
    position: 'absolute',
    left: 4,
    top: 4,
    zIndex: 0,
  },
  clearRating: {
    marginLeft: Spacing.md,
    padding: Spacing.sm,
  },
  clearRatingText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  // Review styles
  reviewContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    minHeight: 64,
  },
  reviewPreviewText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: FontSize.sm * 1.5,
    marginTop: Spacing.xs,
  },
  reviewPlaceholder: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: Fonts.body,
    color: Colors.error,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  deleteButton: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    height: 52,
    backgroundColor: 'rgba(192, 200, 208, 0.18)',
    borderWidth: 1,
    borderColor: Colors.cream,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  saveButtonText: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.cream,
    fontSize: FontSize.md,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  // Lists styles
  listsContainer: {
    marginBottom: Spacing.xl,
  },
  listsLoadingContainer: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  listCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listEmptyCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  createListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  createListButtonText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: 'rgba(192, 200, 208, 0.6)',
    marginLeft: Spacing.xs,
  },
  // Lists picker styles
  listsEmptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  listsEmptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  newListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  newListButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: 'rgba(192, 200, 208, 0.6)',
  },
  listPickerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listEmptyCheckPicker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
  },
})
