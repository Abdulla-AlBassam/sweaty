import React, { useRef, useEffect, useState } from 'react'
import {
  TouchableOpacity,
  Animated,
  Text,
  StyleSheet,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface ReviewLikeButtonProps {
  gameLogId: string
  initialLikeCount?: number
  initialIsLiked?: boolean
  onAuthRequired?: () => void
  size?: 'small' | 'medium'
}

export default function ReviewLikeButton({
  gameLogId,
  initialLikeCount = 0,
  initialIsLiked = false,
  onAuthRequired,
  size = 'medium',
}: ReviewLikeButtonProps) {
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [isLoading, setIsLoading] = useState(false)

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current
  const fillAnim = useRef(new Animated.Value(initialIsLiked ? 1 : 0)).current

  // Update state when props change
  useEffect(() => {
    setIsLiked(initialIsLiked)
    setLikeCount(initialLikeCount)
    fillAnim.setValue(initialIsLiked ? 1 : 0)
  }, [initialIsLiked, initialLikeCount])

  const animateLike = (liked: boolean) => {
    // Bounce animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: liked ? 1.3 : 0.8,
        useNativeDriver: true,
        tension: 400,
        friction: 3,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
    ]).start()

    // Fill animation
    Animated.timing(fillAnim, {
      toValue: liked ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start()
  }

  const handlePress = async () => {
    if (!user) {
      onAuthRequired?.()
      return
    }

    if (isLoading) return

    // Optimistic update
    const newIsLiked = !isLiked
    setIsLiked(newIsLiked)
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1)
    animateLike(newIsLiked)

    setIsLoading(true)

    try {
      if (newIsLiked) {
        // Like the review
        const { error } = await supabase
          .from('review_likes')
          .insert({
            user_id: user.id,
            game_log_id: gameLogId,
          })

        if (error) throw error
      } else {
        // Unlike the review
        const { error } = await supabase
          .from('review_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('game_log_id', gameLogId)

        if (error) throw error
      }
    } catch (error) {
      // Revert on error
      console.error('Like error:', error)
      setIsLiked(!newIsLiked)
      setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1)
      animateLike(!newIsLiked)
    } finally {
      setIsLoading(false)
    }
  }

  const iconSize = size === 'small' ? 18 : 22
  const fontSize = size === 'small' ? FontSize.xs : FontSize.sm

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={iconSize}
          color={isLiked ? Colors.error : Colors.textMuted}
        />
      </Animated.View>
      {likeCount > 0 && (
        <Text style={[styles.count, { fontSize }]}>
          {likeCount}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  count: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
})
