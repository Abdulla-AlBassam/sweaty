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
  TextInput,
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

function StarIcon({ starNumber, rating, size = 32, color = Colors.accent }: StarIconProps) {
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
  const [showCreateListModal, setShowCreateListModal] = useState(false)

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
    >
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={styles.pickerContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.pickerCloseButton}>
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
              >
                {showIcons && item.icon && (
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={selectedValue === item.value ? Colors.accent : Colors.textMuted}
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
                  <Ionicons name="checkmark" size={22} color={Colors.accent} />
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
              {existingLog ? 'edit log' : 'log game'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Game Info - Tappable to view game details */}
            <TouchableOpacity style={styles.gameInfo} onPress={handleGamePress} activeOpacity={0.7}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.gameCover} />
              ) : (
                <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
                  <SweatDropIcon size={24} variant="static" />
                </View>
              )}
              <Text style={styles.gameTitle} numberOfLines={2}>{game.name}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
            </TouchableOpacity>

            {/* Status Dropdown */}
            <Text style={styles.sectionLabel}>Log Game As...</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setStatusPickerVisible(true)}
            >
              <View style={styles.dropdownContent}>
                {currentStatusOption ? (
                  <>
                    <Ionicons
                      name={currentStatusOption.icon as any}
                      size={20}
                      color={Colors.textMuted}
                    />
                    <Text style={styles.dropdownText}>{currentStatusOption.label}</Text>
                  </>
                ) : (
                  <Text style={styles.dropdownPlaceholder}>Select Status</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Platform Dropdown - Always show with our granular platform options */}
            <Text style={styles.sectionLabel}>Platform</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setPlatformPickerVisible(true)}
            >
              <View style={styles.dropdownContent}>
                {platform ? (
                  <Text style={styles.dropdownText}>{platform}</Text>
                ) : (
                  <Text style={styles.dropdownPlaceholder}>Select Platform</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Rating */}
            <Text style={styles.sectionLabel}>Rating {rating ? `(${rating})` : ''}</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((starNumber) => (
                <View key={starNumber} style={styles.starWrapper}>
                  {/* Left half - gives X.5 rating */}
                  <TouchableOpacity
                    style={styles.starHalfTouch}
                    onPress={() => handleHalfStarPress(starNumber, true)}
                    activeOpacity={0.7}
                  />
                  {/* Right half - gives X.0 rating */}
                  <TouchableOpacity
                    style={styles.starHalfTouch}
                    onPress={() => handleHalfStarPress(starNumber, false)}
                    activeOpacity={0.7}
                  />
                  {/* Star icon (positioned absolutely so touch zones work) */}
                  <View style={styles.starIconContainer} pointerEvents="none">
                    <StarIcon starNumber={starNumber} rating={rating} size={36} />
                  </View>
                </View>
              ))}
              {rating && (
                <TouchableOpacity onPress={() => setRating(null)} style={styles.clearRating}>
                  <Text style={styles.clearRatingText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Review */}
            <Text style={styles.sectionLabel}>Review</Text>
            <View style={styles.reviewContainer}>
              <TextInput
                style={styles.reviewInput}
                placeholder="Write your thoughts about this game..."
                placeholderTextColor={Colors.textDim}
                value={review}
                onChangeText={(text) => setReview(text.slice(0, 2000))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.reviewCharCount}>
                {review.length}/2000
              </Text>
            </View>

            {/* Add to Lists */}
            {user && (
              <>
                <Text style={styles.sectionLabel}>Add to Lists</Text>
                <View style={styles.listsContainer}>
                  {listsLoading ? (
                    <View style={styles.listsLoadingContainer}>
                      <LoadingSpinner size="small" color={Colors.accent} />
                    </View>
                  ) : lists.length === 0 ? (
                    <TouchableOpacity
                      style={styles.createListButton}
                      onPress={() => setShowCreateListModal(true)}
                    >
                      <Ionicons name="add" size={18} color={Colors.accent} />
                      <Text style={styles.createListButtonText}>Create your first list</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      {lists.slice(0, 4).map((list) => {
                        const isInList = gameInLists.has(list.id)
                        const isLoadingItem = loadingLists.has(list.id)

                        return (
                          <TouchableOpacity
                            key={list.id}
                            style={styles.listRow}
                            onPress={() => handleToggleList(list.id)}
                            disabled={isLoadingItem}
                            activeOpacity={0.7}
                          >
                            <View style={styles.listInfo}>
                              <Text style={styles.listTitle} numberOfLines={1}>
                                {list.title}
                              </Text>
                            </View>

                            {isLoadingItem ? (
                              <LoadingSpinner size="small" color={Colors.accent} />
                            ) : isInList ? (
                              <View style={styles.listCheckmark}>
                                <Ionicons name="checkmark" size={14} color={Colors.background} />
                              </View>
                            ) : (
                              <View style={styles.listEmptyCheck} />
                            )}
                          </TouchableOpacity>
                        )
                      })}
                      <TouchableOpacity
                        style={styles.createListButton}
                        onPress={() => setShowCreateListModal(true)}
                      >
                        <Ionicons name="add" size={18} color={Colors.accent} />
                        <Text style={styles.createListButtonText}>New list</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
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

      {/* Create List Modal */}
      <CreateListModal
        visible={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        onCreated={handleListCreated}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
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
  sectionLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  // Dropdown styles
  dropdown: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownText: {
    fontFamily: Fonts.body,
    color: Colors.text,
    fontSize: 16,
  },
  dropdownPlaceholder: {
    fontFamily: Fonts.body,
    color: Colors.textDim,
    fontSize: 16,
  },
  // Picker Modal styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
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
    borderBottomWidth: 1,
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
    color: Colors.accent,
  },
  // Rating styles
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.xl,
  },
  reviewInput: {
    fontFamily: Fonts.body,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewCharCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'right',
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
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  deleteButton: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textDim,
  },
  saveButtonText: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.background,
    fontSize: FontSize.md,
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
    backgroundColor: Colors.accent,
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
    color: Colors.accent,
    marginLeft: Spacing.xs,
  },
})
