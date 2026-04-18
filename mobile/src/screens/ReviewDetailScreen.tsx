import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import FormattedText from '../components/FormattedText'
import { Fonts } from '../constants/fonts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MainStackParamList } from '../navigation'
import { ReviewComment } from '../types'
import StarRating from '../components/StarRating'
import ReviewLikeButton from '../components/ReviewLikeButton'
import ReviewComments from '../components/ReviewComments'
import CommentIcon from '../components/CommentIcon'
import LoadingSpinner from '../components/LoadingSpinner'

type Props = NativeStackScreenProps<MainStackParamList, 'ReviewDetail'>

interface ReviewData {
  id: string
  rating: number | null
  review: string
  created_at: string
  game_id: number
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  likeCount: number
  commentCount: number
  isLiked: boolean
}

export default function ReviewDetailScreen({ navigation, route }: Props) {
  const { gameLogId, gameName, gameId, coverUrl } = route.params
  const { user, profile } = useAuth()
  const [review, setReview] = useState<ReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<ReviewComment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentRefreshKey, setCommentRefreshKey] = useState(0)
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const [commentCount, setCommentCount] = useState(0)

  useEffect(() => {
    fetchReview()
  }, [gameLogId])

  const fetchReview = async () => {
    try {
      const { data, error } = await supabase
        .from('game_logs')
        .select(`
          id,
          rating,
          review,
          created_at,
          game_id,
          user:profiles!user_id(id, username, display_name, avatar_url)
        `)
        .eq('id', gameLogId)
        .single()

      if (error) throw error

      const userData = Array.isArray(data.user) ? data.user[0] : data.user

      let likeCount = 0
      let commentCount = 0
      let isLiked = false

      try {
        const { data: likes } = await supabase
          .from('review_likes')
          .select('id')
          .eq('game_log_id', gameLogId)
        likeCount = likes?.length || 0

        const { data: comments } = await supabase
          .from('review_comments')
          .select('id')
          .eq('game_log_id', gameLogId)
        commentCount = comments?.length || 0

        if (user) {
          const { data: userLike } = await supabase
            .from('review_likes')
            .select('id')
            .eq('game_log_id', gameLogId)
            .eq('user_id', user.id)
            .maybeSingle()
          isLiked = !!userLike
        }
      } catch {
        // Social tables may not exist
      }

      setReview({
        ...data,
        user: userData,
        likeCount,
        commentCount,
        isLiked,
      } as ReviewData)
      setCommentCount(commentCount)
    } catch (error) {
      console.error('Error fetching review:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleUserPress = () => {
    if (!review) return
    if (user && review.user.id === user.id) {
      navigation.navigate('MainTabs', { screen: 'Profile' } as any)
    } else {
      navigation.navigate('UserProfile', { username: review.user.username })
    }
  }

  const handleGamePress = () => {
    if (review) {
      navigation.navigate('GameDetail', { gameId: review.game_id })
    }
  }

  const handleCommentSubmit = async () => {
    if (!user || !commentText.trim() || isSubmitting || !review) return
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('review_comments')
        .insert({
          user_id: user.id,
          game_log_id: review.id,
          parent_id: replyingTo?.id || null,
          content: commentText.trim(),
        })
      if (error) throw error
      setCommentText('')
      setReplyingTo(null)
      Keyboard.dismiss()
      setCommentCount(c => c + 1)
      setCommentsExpanded(true)
      setCommentRefreshKey(k => k + 1)
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button" accessibilityHint="Returns to previous screen">
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Review</Text>
          <View style={{ flex: 1 }} />
        </View>
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    )
  }

  if (!review) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button" accessibilityHint="Returns to previous screen">
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Review</Text>
          <View style={{ flex: 1 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Review not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button" accessibilityHint="Returns to previous screen">
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Review</Text>
        <View style={{ flex: 1 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top row: user info left, poster right */}
          <View style={styles.topRow}>
            <View style={styles.topLeft}>
              <TouchableOpacity onPress={handleUserPress} style={styles.userRow} accessibilityLabel={(review.user.display_name || review.user.username) + ' profile'} accessibilityRole="button" accessibilityHint="Opens user profile">
                {review.user.avatar_url ? (
                  <Image source={{ uri: review.user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={12} color={Colors.textMuted} />
                  </View>
                )}
                <Text style={styles.username}>
                  {review.user.display_name || review.user.username}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleGamePress} accessibilityLabel={gameName} accessibilityRole="button" accessibilityHint="Opens game details">
                <Text style={styles.gameName}>{gameName}</Text>
              </TouchableOpacity>
              {review.rating && (
                <View style={styles.ratingRow}>
                  <StarRating rating={review.rating} size={16} />
                </View>
              )}
              <Text style={styles.dateText}>Played {formatDate(review.created_at)}</Text>
            </View>

            {coverUrl && (
              <TouchableOpacity onPress={handleGamePress} style={styles.coverContainer} accessibilityLabel={gameName + ' cover'} accessibilityRole="button" accessibilityHint="Opens game details">
                <Image source={{ uri: coverUrl }} style={styles.gameCover} />
              </TouchableOpacity>
            )}
          </View>

          {/* Review text */}
          {review.review ? (
            <FormattedText style={styles.reviewText}>{review.review}</FormattedText>
          ) : null}

          {/* Separator + social actions */}
          <View style={styles.separator} />
          <View style={styles.socialRow}>
            <ReviewLikeButton
              gameLogId={review.id}
              initialLikeCount={review.likeCount}
              initialIsLiked={review.isLiked}
              size="medium"
            />
            <TouchableOpacity
              style={styles.commentToggle}
              onPress={() => setCommentsExpanded(prev => !prev)}
              activeOpacity={0.7}
              accessibilityLabel={commentsExpanded ? 'Hide comments' : `Show comments${commentCount > 0 ? `, ${commentCount} comments` : ''}`}
              accessibilityRole="button"
            >
              <CommentIcon size={22} color={Colors.textBright} />
              {commentCount > 0 && (
                <Text style={styles.commentToggleCount}>{commentCount}</Text>
              )}
            </TouchableOpacity>
          </View>

          {commentsExpanded && (
            <View style={styles.commentsExpanded}>
              <ReviewComments
                key={commentRefreshKey}
                gameLogId={review.id}
                initialCommentCount={commentCount}
                hideToggle
                autoExpand
                hideInput
                onReplyRequest={setReplyingTo}
                onCountChange={setCommentCount}
              />
            </View>
          )}

          {user && (
            <View style={styles.inputBar}>
              {replyingTo && (
                <View style={styles.replyingTo}>
                  <Text style={styles.replyingToText}>
                    Replying to <Text style={styles.replyingToName}>@{replyingTo.user?.username}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)} accessibilityLabel="Cancel reply" accessibilityRole="button">
                    <Ionicons name="close" size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputRow}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.inputAvatar} />
                ) : (
                  <View style={[styles.inputAvatar, styles.inputAvatarPlaceholder]}>
                    <Ionicons name="person" size={12} color={Colors.textDim} />
                  </View>
                )}
                <TextInput
                  style={styles.commentInput}
                  placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
                  placeholderTextColor={Colors.textDim}
                  value={commentText}
                  onChangeText={(text) => setCommentText(text.slice(0, 500))}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled]}
                  onPress={handleCommentSubmit}
                  disabled={!commentText.trim() || isSubmitting}
                  accessibilityLabel={replyingTo ? 'Send reply' : 'Send comment'}
                  accessibilityRole="button"
                >
                  {isSubmitting ? (
                    <LoadingSpinner size="small" color={Colors.text} />
                  ) : (
                    <Ionicons name="arrow-up" size={18} color={commentText.trim() ? Colors.background : Colors.textDim} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  topLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  coverContainer: {
    marginTop: 2,
  },
  gameCover: {
    width: 80,
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  gameName: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dateText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  reviewText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  commentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    gap: Spacing.xs,
  },
  commentToggleCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  commentsExpanded: {
    marginBottom: Spacing.md,
  },
  commentsLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  inputBar: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  replyingToText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  replyingToName: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    minHeight: 52,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  inputAvatarPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
})
