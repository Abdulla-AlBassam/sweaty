import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import FormattedText from '../components/FormattedText'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StarRating from '../components/StarRating'
import ReviewLikeButton from '../components/ReviewLikeButton'
import ReviewComments from '../components/ReviewComments'
import LoadingSpinner from '../components/LoadingSpinner'
import { MainStackParamList } from '../navigation'

type Props = NativeStackScreenProps<MainStackParamList, 'AllReviews'>

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

const PAGE_SIZE = 20

export default function AllReviewsScreen({ navigation, route }: Props) {
  const { gameId, gameName } = route.params
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    fetchReviews(0)
  }, [gameId])

  const fetchReviews = async (offset: number) => {
    try {
      const { data, error } = await supabase
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
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) throw error

      const formatted = (data || []).map((item: any) => ({
        ...item,
        user: Array.isArray(item.user) ? item.user[0] : item.user,
      })).filter((item: any) => item.user && item.review) as Review[]

      // Fetch social data
      const reviewIds = formatted.map(r => r.id)
      if (reviewIds.length > 0) {
        try {
          const { data: likeCounts } = await supabase
            .from('review_likes')
            .select('game_log_id')
            .in('game_log_id', reviewIds)

          let userLikes: string[] = []
          if (user) {
            const { data: userLikesData } = await supabase
              .from('review_likes')
              .select('game_log_id')
              .eq('user_id', user.id)
              .in('game_log_id', reviewIds)
            userLikes = (userLikesData || []).map((l: any) => l.game_log_id)
          }

          const { data: commentCounts } = await supabase
            .from('review_comments')
            .select('game_log_id')
            .in('game_log_id', reviewIds)

          const likeCountMap: Record<string, number> = {}
          const commentCountMap: Record<string, number> = {}

          likeCounts?.forEach((like: any) => {
            likeCountMap[like.game_log_id] = (likeCountMap[like.game_log_id] || 0) + 1
          })
          commentCounts?.forEach((comment: any) => {
            commentCountMap[comment.game_log_id] = (commentCountMap[comment.game_log_id] || 0) + 1
          })

          formatted.forEach(review => {
            review.likeCount = likeCountMap[review.id] || 0
            review.commentCount = commentCountMap[review.id] || 0
            review.isLiked = userLikes.includes(review.id)
          })
        } catch {
          // Social tables may not exist yet
        }
      }

      if (offset === 0) {
        setReviews(formatted)
      } else {
        setReviews(prev => [...prev, ...formatted])
      }
      setHasMore(formatted.length === PAGE_SIZE)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchReviews(0)
  }, [gameId])

  const onEndReached = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true)
      fetchReviews(reviews.length)
    }
  }

  const handleUserPress = (username: string, userId: string) => {
    if (user && userId === user.id) {
      navigation.navigate('MainTabs' as never, { screen: 'Profile' } as never)
    } else {
      navigation.navigate('UserProfile', { username, userId })
    }
  }

  const renderReview = ({ item: review }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {review.rating && (
          <StarRating rating={review.rating} size={14} />
        )}
        <TouchableOpacity
          style={styles.userSection}
          onPress={() => handleUserPress(review.user.username, review.user.id)}
          accessibilityLabel={(review.user.display_name || review.user.username) + ' profile'}
          accessibilityRole="button"
          accessibilityHint="Opens user profile"
        >
          <Text style={styles.username}>{review.user.display_name || review.user.username}</Text>
          {review.user.avatar_url ? (
            <Image source={{ uri: review.user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(review.user.display_name || review.user.username)[0].toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FormattedText style={styles.reviewText}>{review.review}</FormattedText>

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
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back to game" accessibilityRole="button" accessibilityHint="Returns to game details">
            <Text style={styles.backText}>Game</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>Reviews of {gameName}</Text>
        <View style={{ flex: 1 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <LoadingSpinner size="large" color={Colors.accent} />
          </View>
        ) : (
          <FlatList
            data={reviews}
            renderItem={renderReview}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.accent}
              />
            }
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoading}>
                  <LoadingSpinner size="small" color={Colors.accent} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="chatbubble-outline" size={32} color={Colors.textDim} />
                <Text style={styles.emptyText}>No reviews yet</Text>
              </View>
            }
          />
        )}
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
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: Spacing.sm,
  },
  backText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  reviewCard: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  username: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.xs,
    color: Colors.accent,
  },
  reviewText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  socialSection: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  footerLoading: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
})
