import React, { useEffect, useState } from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native'
import { Colors, Spacing, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import HeartIcon from './HeartIcon'

interface ReviewLikeButtonProps {
  gameLogId: string
  initialLikeCount?: number
  initialIsLiked?: boolean
  onAuthRequired?: () => void
  size?: 'small' | 'medium'
}

const ICON_SIZE = 22

export default function ReviewLikeButton({
  gameLogId,
  initialLikeCount = 0,
  initialIsLiked = false,
  onAuthRequired,
}: ReviewLikeButtonProps) {
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLiked(initialIsLiked)
    setLikeCount(initialLikeCount)
  }, [initialIsLiked, initialLikeCount])

  const handlePress = async () => {
    if (!user) {
      onAuthRequired?.()
      return
    }

    if (isLoading) return

    const newIsLiked = !isLiked
    setIsLiked(newIsLiked)
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1)

    setIsLoading(true)

    try {
      if (newIsLiked) {
        const { error } = await supabase
          .from('review_likes')
          .upsert({
            user_id: user.id,
            game_log_id: gameLogId,
          }, { onConflict: 'user_id,game_log_id' })

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('review_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('game_log_id', gameLogId)

        if (error) throw error
      }
    } catch (error) {
      console.error('Like error:', error)
      setIsLiked(!newIsLiked)
      setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isLoading}
      accessibilityLabel={`${isLiked ? 'Unlike' : 'Like'} review${likeCount > 0 ? `, ${likeCount} likes` : ''}`}
      accessibilityRole="button"
    >
      <HeartIcon
        size={ICON_SIZE}
        color={isLiked ? Colors.error : Colors.textMuted}
        filled={isLiked}
      />
      {likeCount > 0 && (
        <Text style={styles.count}>
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
    height: ICON_SIZE,
    gap: Spacing.xs,
  },
  count: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    lineHeight: ICON_SIZE,
  },
})
