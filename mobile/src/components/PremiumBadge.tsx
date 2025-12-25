import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { Fonts } from '../constants/fonts'
import { FontSize } from '../constants/colors'

interface PremiumBadgeProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'premium' | 'developer'
}

// Color schemes for different badge variants
const BADGE_VARIANTS = {
  premium: {
    colors: ['#FFD700', '#FFA500', '#FF8C00'] as const,
    shadowColor: '#FFD700',
    textColor: '#1a1a1a',
    iconColor: '#1a1a1a',
    label: 'PREMIUM',
  },
  developer: {
    colors: ['#22c55e', '#16a34a', '#15803d'] as const,
    shadowColor: '#22c55e',
    textColor: '#ffffff',
    iconColor: '#ffffff',
    label: 'DEVELOPER',
  },
}

export default function PremiumBadge({ size = 'medium', variant = 'premium' }: PremiumBadgeProps) {
  const badgeStyle = BADGE_VARIANTS[variant]
  const shimmerAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Create looping shimmer animation
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )
    shimmerLoop.start()

    return () => shimmerLoop.stop()
  }, [shimmerAnim])

  // Interpolate for shimmer position
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  })

  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      iconSize: 10,
      fontSize: 9,
      borderRadius: 8,
    },
    medium: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      iconSize: 12,
      fontSize: 11,
      borderRadius: 10,
    },
    large: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      iconSize: 14,
      fontSize: 13,
      borderRadius: 12,
    },
  }

  const currentSize = sizeStyles[size]

  return (
    <View style={[styles.container, { borderRadius: currentSize.borderRadius, shadowColor: badgeStyle.shadowColor }]}>
      <LinearGradient
        colors={badgeStyle.colors as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            paddingHorizontal: currentSize.paddingHorizontal,
            paddingVertical: currentSize.paddingVertical,
            borderRadius: currentSize.borderRadius,
          },
        ]}
      >
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          <Ionicons
            name="diamond"
            size={currentSize.iconSize}
            color={badgeStyle.iconColor}
          />
          <Text style={[styles.text, { fontSize: currentSize.fontSize, color: badgeStyle.textColor }]}>
            {badgeStyle.label}
          </Text>
        </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    // Subtle shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  gradient: {
    position: 'relative',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    zIndex: 1,
  },
  shimmerGradient: {
    flex: 1,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  text: {
    fontFamily: Fonts.bodyBold,
    letterSpacing: 1,
  },
})
