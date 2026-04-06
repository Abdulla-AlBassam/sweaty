import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MainStackParamList } from '../navigation'
import StarRating from '../components/StarRating'
import ReviewLikeButton from '../components/ReviewLikeButton'
import ReviewComments from '../components/ReviewComments'
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
  const { user } = useAuth()
  const [review, setReview] = useState<ReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

      // Fetch social data
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review</Text>
          <View style={{ width: 36 }} />
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review</Text>
          <View style={{ width: 36 }} />
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review</Text>
        <View style={{ width: 36 }} />
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
              <TouchableOpacity onPress={handleUserPress} style={styles.userRow}>
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

              <TouchableOpacity onPress={handleGamePress}>
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
              <TouchableOpacity onPress={handleGamePress} style={styles.coverContainer}>
                <Image source={{ uri: coverUrl }} style={styles.gameCover} />
              </TouchableOpacity>
            )}
          </View>

          {/* Review text */}
          {review.review ? (
            <Text style={styles.reviewText}>{review.review}</Text>
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
            <ReviewComments
              gameLogId={review.id}
              initialCommentCount={review.commentCount}
              previewMode={false}
            />
          </View>
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
    justifyContent: 'space-between',
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
    height: 107,
    borderRadius: BorderRadius.sm,
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
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
})
