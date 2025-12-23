import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getGamerLevel, getSocialLevel } from '../lib/xp'

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
  const { user } = useAuth()
  const [status, setStatus] = useState<string | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [platform, setPlatform] = useState<string | null>(null)
  const [review, setReview] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusPickerVisible, setStatusPickerVisible] = useState(false)
  const [platformPickerVisible, setPlatformPickerVisible] = useState(false)

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

      // Build level up message
      const levelUpParts: string[] = []
      if (newGamerLevel.level > currentGamerLevel.level) {
        levelUpParts.push(`🎮 Gamer Rank: ${newGamerLevel.rank}`)
      }
      if (newSocialLevel.level > currentSocialLevel.level) {
        levelUpParts.push(`🌟 Social Rank: ${newSocialLevel.rank}`)
      }

      // Show XP notification using Alert (show BEFORE closing modal)
      if (xpParts.length > 0 || levelUpParts.length > 0) {
        const title = levelUpParts.length > 0 ? '🎉 Level Up!' : 'XP Earned!'
        const message = [
          ...xpParts,
          ...(levelUpParts.length > 0 ? ['', ...levelUpParts] : [])
        ].join('\n')

        // Show alert and close modal when user dismisses it
        Alert.alert(title, message, [
          {
            text: 'OK',
            onPress: () => {
              onSaveSuccess?.()
              onClose()
            }
          }
        ])
        return // Don't call onSaveSuccess/onClose below since we do it in the alert callback
      }

      onSaveSuccess?.()
      onClose()
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
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {existingLog ? 'Edit Log' : 'Log Game'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Game Info */}
            <View style={styles.gameInfo}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.gameCover} />
              ) : (
                <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
                  <Ionicons name="game-controller-outline" size={24} color={Colors.textDim} />
                </View>
              )}
              <Text style={styles.gameTitle} numberOfLines={2}>{game.name}</Text>
            </View>

            {/* Status Dropdown */}
            <Text style={styles.sectionLabel}>Log game as...</Text>
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
                  <Text style={styles.dropdownPlaceholder}>Select status</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Platform Dropdown */}
            {game.platforms && game.platforms.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Platform</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setPlatformPickerVisible(true)}
                >
                  <View style={styles.dropdownContent}>
                    {platform ? (
                      <Text style={styles.dropdownText}>{platform}</Text>
                    ) : (
                      <Text style={styles.dropdownPlaceholder}>Select platform</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </>
            )}

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
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={isSaving}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.saveButton,
                !status && styles.saveButtonDisabled,
                existingLog && styles.saveButtonWithDelete,
              ]}
              onPress={handleSave}
              disabled={!status || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {existingLog ? 'Update' : 'Save'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>

      {/* Status Picker Modal */}
      <PickerModal
        visible={statusPickerVisible}
        onClose={() => setStatusPickerVisible(false)}
        title="Log game as..."
        options={STATUS_OPTIONS}
        selectedValue={status}
        onSelect={setStatus}
        showIcons={true}
      />

      {/* Platform Picker Modal */}
      {game.platforms && (
        <PickerModal
          visible={platformPickerVisible}
          onClose={() => setPlatformPickerVisible(false)}
          title="Select Platform"
          options={game.platforms.map(p => ({ value: p, label: p }))}
          selectedValue={platform}
          onSelect={setPlatform}
          showIcons={false}
        />
      )}
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
    fontSize: FontSize.lg,
    fontWeight: '600',
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
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
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
    color: Colors.text,
    fontSize: 16,
  },
  dropdownPlaceholder: {
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
    fontSize: FontSize.lg,
    fontWeight: '600',
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
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pickerItemTextSelected: {
    color: Colors.accent,
    fontWeight: '600',
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
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  // Review styles
  reviewContainer: {
    marginBottom: Spacing.xl,
  },
  reviewInput: {
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
    flex: 1,
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonWithDelete: {
    flex: 1,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textDim,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
})
