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
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StarRating from './StarRating'

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
}

interface GameReviewsProps {
  gameId: number
  refreshKey?: number
}

export default function GameReviews({ gameId, refreshKey }: GameReviewsProps) {
  const { user } = useAuth()
  const navigation = useNavigation()
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReviews()
  }, [gameId, refreshKey])

  const fetchReviews = async () => {
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
        .limit(10)

      if (error) throw error

      const formattedReviews = (data || []).map((item: any) => ({
        ...item,
        user: Array.isArray(item.user) ? item.user[0] : item.user,
      })).filter((item: any) => item.user && item.review) as Review[]

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
      // Navigate to own profile tab
      navigation.navigate('MainTabs' as never, { screen: 'Profile' } as never)
    } else {
      navigation.navigate('UserProfile' as never, { username, userId } as never)
    }
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

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
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
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
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
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.sm,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  displayName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  username: {
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
  ratingText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: '600',
  },
  timeText: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: 2,
  },
  reviewText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
})
