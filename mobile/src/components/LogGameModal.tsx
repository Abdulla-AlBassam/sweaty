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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
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
  const imageUrl = coverUrl ? getIGDBImageUrl(coverUrl, 'coverSmall') : null

  const handleRatingPress = (value: number) => {
    // Toggle off if same rating
    setRating(rating === value ? null : value)
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

      // Show XP toasts
      if (gamerXPDiff > 0 || socialXPDiff > 0) {
        const xpParts: string[] = []
        if (gamerXPDiff > 0) xpParts.push(`+${gamerXPDiff} Gamer XP`)
        if (socialXPDiff > 0) xpParts.push(`+${socialXPDiff} Social XP`)

        Toast.show({
          type: 'xp',
          text1: xpParts.join('  •  '),
          text2: game.name,
          visibilityTime: 2000,
          position: 'top',
        })
      }

      // Check for level ups
      setTimeout(() => {
        if (newGamerLevel.level > currentGamerLevel.level) {
          Toast.show({
            type: 'levelUp',
            text1: '🎮 Level Up!',
            text2: `Gamer Rank: ${newGamerLevel.rank}`,
            visibilityTime: 3000,
            position: 'top',
          })
        }

        setTimeout(() => {
          if (newSocialLevel.level > currentSocialLevel.level) {
            Toast.show({
              type: 'levelUp',
              text1: '🌟 Level Up!',
              text2: `Social Rank: ${newSocialLevel.rank}`,
              visibilityTime: 3000,
              position: 'top',
            })
          }
        }, newGamerLevel.level > currentGamerLevel.level ? 3500 : 0)
      }, gamerXPDiff > 0 || socialXPDiff > 0 ? 2500 : 0)

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

            {/* Status Picker */}
            <Text style={styles.sectionLabel}>Status *</Text>
            <View style={styles.statusGrid}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusChip,
                    status === option.value && styles.statusChipSelected,
                  ]}
                  onPress={() => setStatus(option.value)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={status === option.value ? Colors.background : Colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.statusChipText,
                      status === option.value && styles.statusChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Rating */}
            <Text style={styles.sectionLabel}>Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRatingPress(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={rating && star <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color={rating && star <= rating ? Colors.accent : Colors.textDim}
                  />
                </TouchableOpacity>
              ))}
              {rating && (
                <TouchableOpacity onPress={() => setRating(null)} style={styles.clearRating}>
                  <Text style={styles.clearRatingText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Platform Picker */}
            {game.platforms && game.platforms.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Platform</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.platformScroll}
                >
                  {game.platforms.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.platformChip,
                        platform === p && styles.platformChipSelected,
                      ]}
                      onPress={() => setPlatform(platform === p ? null : p)}
                    >
                      <Text
                        style={[
                          styles.platformChipText,
                          platform === p && styles.platformChipTextSelected,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

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
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  statusChipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  statusChipText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  statusChipTextSelected: {
    color: Colors.background,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  starButton: {
    padding: Spacing.xs,
  },
  clearRating: {
    marginLeft: Spacing.md,
    padding: Spacing.sm,
  },
  clearRatingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  platformScroll: {
    marginBottom: Spacing.xl,
  },
  platformChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  platformChipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  platformChipText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  platformChipTextSelected: {
    color: Colors.background,
    fontWeight: '600',
  },
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
