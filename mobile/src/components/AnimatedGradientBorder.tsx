import React, { useEffect } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { Colors, BorderRadius } from '../constants/colors'

interface AnimatedGradientBorderProps {
  children: React.ReactNode
  width: number
  height: number
  borderWidth?: number
  borderRadius?: number
  style?: ViewStyle
}

export default function AnimatedGradientBorder({
  children,
  width,
  height,
  borderWidth = 2,
  borderRadius = BorderRadius.md,
  style,
}: AnimatedGradientBorderProps) {
  const rotation = useSharedValue(0)

  useEffect(() => {
    // Continuous rotation animation
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 3000,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Don't reverse
    )
  }, [rotation])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  // The gradient container needs to be larger to account for rotation
  const gradientSize = Math.sqrt(width * width + height * height) * 1.5

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      {/* Animated gradient background */}
      <Animated.View
        style={[
          styles.gradientWrapper,
          {
            width: gradientSize,
            height: gradientSize,
            left: (width - gradientSize) / 2,
            top: (height - gradientSize) / 2,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={[
            Colors.accent,      // #255F38
            Colors.accentLight, // #1F7D53
            Colors.accent,      // #255F38
            Colors.accentLight, // #1F7D53
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>

      {/* Inner content with background to create border effect */}
      <View
        style={[
          styles.innerContent,
          {
            width: width - borderWidth * 2,
            height: height - borderWidth * 2,
            borderRadius: borderRadius - borderWidth,
            top: borderWidth,
            left: borderWidth,
          },
        ]}
      >
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  gradientWrapper: {
    position: 'absolute',
  },
  gradient: {
    flex: 1,
  },
  innerContent: {
    position: 'absolute',
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
})
