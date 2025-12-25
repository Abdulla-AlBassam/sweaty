import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StarRating from './StarRating'
import ReviewLikeButton from './ReviewLikeButton'
import ReviewComments from './ReviewComments'

interface Review {
  id: string
  rating: number | null
  review: string
  created_at: string
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  likeCount?: number
  commentCount?: number
  isLiked?: boolean
}

interface GameReviewsProps {
  gameId: number
  refreshKey?: number
}

const INITIAL_LIMIT = 10

export default function GameReviews({ gameId, refreshKey }: GameReviewsProps) {
  const { user } = useAuth()
  const navigation = useNavigation()
  const [reviews, setReviews] = useState<Review[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [gameId, refreshKey, showAll])

  const fetchReviews = async () => {
    try {
      // First get total count
      const { count } = await supabase
        .from('game_logs')
        .select('id', { count: 'exact', head: true })
        .eq('game_id', gameId)
        .not('review', 'is', null)

      setTotalCount(count || 0)

      // Then fetch reviews (limited or all)
      let query = supabase
        .from('game_logs')
        .select(`
          id,
          rating,
          review,
          created_at,
          user:profiles!user_id(id, username, display_name, avatar_url)
        `)
        .eq('game_id', gameId)
        .not('review', 'is', null)
        .order('created_at', { ascending: false })

      if (!showAll) {
        query = query.limit(INITIAL_LIMIT)
      }

      const { data, error } = await query

      if (error) throw error

      const formattedReviews = (data || []).map((item: any) => ({
        ...item,
        user: Array.isArray(item.user) ? item.user[0] : item.user,
      })).filter((item: any) => item.user && item.review) as Review[]

      // Fetch like counts and user's likes for all reviews (wrapped in try-catch in case tables don't exist yet)
      const reviewIds = formattedReviews.map(r => r.id)

      if (reviewIds.length > 0) {
        try {
          // Get like counts for each review
          const { data: likeCounts, error: likesError } = await supabase
            .from('review_likes')
            .select('game_log_id')
            .in('game_log_id', reviewIds)

          // Get user's likes if logged in
          let userLikes: string[] = []
          if (user && !likesError) {
            const { data: userLikesData } = await supabase
              .from('review_likes')
              .select('game_log_id')
              .eq('user_id', user.id)
              .in('game_log_id', reviewIds)

            userLikes = (userLikesData || []).map((l: any) => l.game_log_id)
          }

          // Get comment counts for each review
          const { data: commentCounts, error: commentsError } = await supabase
            .from('review_comments')
            .select('game_log_id')
            .in('game_log_id', reviewIds)

          // Create count maps (only if no errors)
          const likeCountMap: Record<string, number> = {}
          const commentCountMap: Record<string, number> = {}

          if (!likesError && likeCounts) {
            likeCounts.forEach((like: any) => {
              likeCountMap[like.game_log_id] = (likeCountMap[like.game_log_id] || 0) + 1
            })
          }

          if (!commentsError && commentCounts) {
            commentCounts.forEach((comment: any) => {
              commentCountMap[comment.game_log_id] = (commentCountMap[comment.game_log_id] || 0) + 1
            })
          }

          // Attach counts to reviews
          formattedReviews.forEach(review => {
            review.likeCount = likeCountMap[review.id] || 0
            review.commentCount = commentCountMap[review.id] || 0
            review.isLiked = userLikes.includes(review.id)
          })
        } catch (socialError) {
          // Tables might not exist yet - that's ok, just show reviews without likes/comments
          console.log('Social features not available yet:', socialError)
        }
      }

      setReviews(formattedReviews)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleUserPress = (username: string, userId: string) => {
    if (user && userId === user.id) {
      navigation.navigate('MainTabs' as never, { screen: 'Profile' } as never)
    } else {
      navigation.navigate('UserProfile' as never, { username, userId } as never)
    }
  }

  const handleShowAll = () => {
    setShowAll(true)
  }

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      </View>
    )
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={32} color={Colors.textDim} />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>Be the first to share your thoughts!</Text>
        </View>
      </View>
    )
  }

  const hasMore = totalCount > INITIAL_LIMIT && !showAll

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reviews ({totalCount})</Text>
      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <TouchableOpacity
            style={styles.userRow}
            onPress={() => handleUserPress(review.user.username, review.user.id)}
          >
            {review.user.avatar_url ? (
              <Image source={{ uri: review.user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(review.user.display_name || review.user.username)[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.displayName}>
                {review.user.display_name || review.user.username}
              </Text>
              <Text style={styles.username}>@{review.user.username}</Text>
            </View>
            <View style={styles.reviewMeta}>
              {review.rating && (
                <View style={styles.ratingBadge}>
                  <StarRating rating={review.rating} size={12} />
                </View>
              )}
              <Text style={styles.timeText}>{getRelativeTime(review.created_at)}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.reviewText}>{review.review}</Text>

          {/* Likes and Comments */}
          <View style={styles.socialSection}>
            <ReviewLikeButton
              gameLogId={review.id}
              initialLikeCount={review.likeCount || 0}
              initialIsLiked={review.isLiked || false}
              size="small"
            />
            <ReviewComments
              gameLogId={review.id}
              initialCommentCount={review.commentCount || 0}
            />
          </View>
        </View>
      ))}
      {hasMore && (
        <TouchableOpacity style={styles.showAllButton} onPress={handleShowAll}>
          <Text style={styles.showAllText}>Show all {totalCount} reviews</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  reviewCard: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.sm,
    color: Colors.accentLight,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  displayName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  username: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  reviewMeta: {
    alignItems: 'flex-end',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timeText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: 2,
  },
  reviewText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  socialSection: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  showAllButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  showAllText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
})
