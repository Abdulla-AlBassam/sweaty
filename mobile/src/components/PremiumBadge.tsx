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
}

export default function PremiumBadge({ size = 'medium' }: PremiumBadgeProps) {
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
    <View style={[styles.container, { borderRadius: currentSize.borderRadius }]}>
      <LinearGradient
        colors={['#FFD700', '#FFA500', '#FF8C00']}
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
            color="#1a1a1a"
          />
          <Text style={[styles.text, { fontSize: currentSize.fontSize }]}>
            PREMIUM
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
    shadowColor: '#FFD700',
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
    color: '#1a1a1a',
    letterSpacing: 1,
  },
})
