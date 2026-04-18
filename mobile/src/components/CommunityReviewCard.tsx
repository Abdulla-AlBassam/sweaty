import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Toast from 'react-native-toast-message'
import { useNavigation } from '@react-navigation/native'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { haptics } from '../hooks/useHaptics'
import { CommunityReview } from '../hooks/useSupabase'
import { formatTimeAgo } from '../utils/time'
import StarRating from './StarRating'
import ReviewLikeButton from './ReviewLikeButton'
import ReviewComments from './ReviewComments'
import FormattedText from './FormattedText'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
// Slightly wider than a content row (92%) and a 3:2 landscape aspect — reads as
// a game-banner proxy while leaving the review overlay comfortable.
export const COMMUNITY_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.92)
export const COMMUNITY_CARD_ASPECT = 3 / 2
export const COMMUNITY_CARD_HEIGHT = Math.round(COMMUNITY_CARD_WIDTH / COMMUNITY_CARD_ASPECT)

// Small portrait cover anchored bottom-right — blends into the scrim and stands
// in for the game label that used to be inline with the review text.
const COVER_W = 56
const COVER_H = 75

interface CommunityReviewCardProps {
  review: CommunityReview
}

export default function CommunityReviewCard({ review }: CommunityReviewCardProps) {
  const navigation = useNavigation<any>()
  const { user } = useAuth()
  const isOwn = !!user && user.id === review.user.id

  // viewerStatus is pre-computed by the useCommunityReviews hook (batched query)
  // so we never hit Supabase from inside the card on mount. `isSaved` is local
  // state for optimistic toggling but syncs if the parent re-fetches with a
  // different viewerStatus; `hasOtherStatus` is purely derived since it never
  // changes as a result of anything this card does.
  const hasOtherStatus = review.viewerStatus === 'other'
  const [isSaved, setIsSaved] = useState(review.viewerStatus === 'want_to_play')
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    setIsSaved(review.viewerStatus === 'want_to_play')
  }, [review.viewerStatus])

  // Match GameDetailScreen's hero banner: the first landscape screenshot IGDB
  // returns. `games_cache.screenshot_urls` preserves IGDB's order, and
  // `pickBestBannerImage` (used by the details endpoint) almost always selects
  // index 0 in practice.
  const screenshots = review.game.screenshot_urls
  const screenshotUrl = screenshots && screenshots.length > 0 ? screenshots[0] : null
  const heroImageUrl = screenshotUrl
    ? getIGDBImageUrl(screenshotUrl, 'screenshotBig')
    : getIGDBImageUrl(review.game.cover_url, 'coverBig2x')

  const goToGame = () => navigation.navigate('GameDetail', { gameId: review.game.id })
  const goToUser = () =>
    navigation.navigate('UserProfile', {
      username: review.user.username,
      userId: review.user.id,
    })
  const goToReview = () =>
    navigation.navigate('ReviewDetail', {
      gameLogId: review.id,
      gameName: review.game.name,
      gameId: review.game.id,
    })

  const handleSavePress = async () => {
    if (!user) {
      navigation.navigate('Login')
      return
    }
    if (isToggling) return

    if (hasOtherStatus) {
      haptics.light()
      Toast.show({
        type: 'success',
        text1: 'Already in your library',
        text2: `${review.game.name} is logged with another status.`,
        position: 'top',
        visibilityTime: 1800,
      })
      return
    }

    haptics.light()
    const next = !isSaved
    setIsSaved(next)
    setIsToggling(true)
    try {
      if (next) {
        const { error } = await supabase.from('game_logs').insert({
          user_id: user.id,
          game_id: review.game.id,
          status: 'want_to_play',
        })
        if (error) throw error
        Toast.show({
          type: 'success',
          text1: 'Saved to Want to Play',
          text2: review.game.name,
          position: 'top',
          visibilityTime: 1800,
        })
      } else {
        const { error } = await supabase
          .from('game_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('game_id', review.game.id)
          .eq('status', 'want_to_play')
        if (error) throw error
      }
    } catch (err) {
      setIsSaved(!next)
      Toast.show({
        type: 'error',
        text1: 'Could not update library',
        text2: 'Please try again.',
        position: 'top',
        visibilityTime: 2200,
      })
      console.error('Save toggle failed:', err)
    } finally {
      setIsToggling(false)
    }
  }

  const displayName = review.user.display_name || review.user.username

  return (
    <View style={styles.card}>
      {/* Background layer: hero image + scrims. Wrapped in an explicit rounded
          clipper so the image doesn't bleed past the card corners on iOS. */}
      <Pressable style={styles.backdrop} onPress={goToGame} accessibilityLabel={`Open ${review.game.name}`} accessibilityRole="button">
        <Image source={{ uri: heroImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.2)', 'transparent']}
          locations={[0, 0.55, 1]}
          style={styles.topScrim}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.45, 1]}
          style={styles.bottomScrim}
          pointerEvents="none"
        />
      </Pressable>

      {/* Header overlay */}
      <TouchableOpacity
        style={styles.header}
        onPress={goToUser}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`View ${displayName}'s profile`}
      >
        {review.user.avatar_url ? (
          <Image source={{ uri: review.user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color={Colors.textBright} />
          </View>
        )}
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName}
            </Text>
            {review.user.isPremium && (
              <Ionicons name="diamond" size={11} color={Colors.cream} style={styles.premiumIcon} />
            )}
          </View>
          <View style={styles.ratingRow}>
            {review.rating != null && (
              <>
                <StarRating rating={review.rating} size={12} />
                <Text style={styles.metaDot}>·</Text>
              </>
            )}
            <Text style={styles.timestamp}>{formatTimeAgo(review.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Bottom content overlay — paddingRight reserves room for the cover thumb */}
      <View style={styles.bottom} pointerEvents="box-none">
        <Text
          style={styles.gameLabel}
          onPress={goToGame}
          numberOfLines={1}
          accessibilityRole="link"
          accessibilityLabel={`Open ${review.game.name}`}
        >
          {review.game.name}
        </Text>

        <TouchableOpacity
          onPress={goToReview}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Read full review"
        >
          <FormattedText style={styles.caption} numberOfLines={3}>
            {review.review}
          </FormattedText>
        </TouchableOpacity>

        <View style={styles.actions} pointerEvents="box-none">
          <View style={styles.actionsLeft}>
            <ReviewLikeButton
              gameLogId={review.id}
              initialLikeCount={review.likeCount}
              initialIsLiked={review.isLiked}
              size="small"
              onAuthRequired={() => navigation.navigate('Login')}
            />
            <ReviewComments
              gameLogId={review.id}
              initialCommentCount={review.commentCount}
              previewMode
              onPreviewPress={goToReview}
            />
          </View>
          {!isOwn && (
            <Pressable
              onPress={handleSavePress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityState={{ disabled: isToggling, checked: isSaved }}
              accessibilityLabel={isSaved ? 'Remove from Want to Play' : 'Save to Want to Play'}
              style={styles.saveButton}
            >
              {isToggling ? (
                <ActivityIndicator size="small" color={Colors.textBright} />
              ) : (
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={isSaved ? Colors.cream : Colors.textBright}
                />
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Game cover — small portrait thumbnail, bottom-right. Tapping goes to the game. */}
      <Pressable
        onPress={goToGame}
        style={styles.coverThumb}
        accessibilityRole="button"
        accessibilityLabel={`Open ${review.game.name}`}
      >
        <Image
          source={{ uri: getIGDBImageUrl(review.game.cover_url, 'coverBig') }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: COMMUNITY_CARD_WIDTH,
    height: COMMUNITY_CARD_HEIGHT,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textBright,
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  premiumIcon: {
    marginLeft: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  metaDot: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  timestamp: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingLeft: Spacing.md,
    paddingBottom: Spacing.md,
    // Reserve space on the right for the cover thumbnail so text + actions
    // don't collide with it.
    paddingRight: Spacing.md + COVER_W + Spacing.sm,
  },
  gameLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.3,
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.textBright,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  actionsLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  saveButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverThumb: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    width: COVER_W,
    height: COVER_H,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: Colors.surface,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
})
