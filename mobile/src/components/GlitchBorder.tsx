import React, { useEffect, useState, useRef } from 'react'
import { View, StyleSheet, Animated, ViewStyle } from 'react-native'
import { Colors, BorderRadius } from '../constants/colors'

interface GlitchBorderProps {
  children: React.ReactNode
  style?: ViewStyle
  borderRadius?: number
  borderWidth?: number
  intensity?: 'low' | 'medium' | 'high'
}

/**
 * GlitchBorder - Animated RGB chromatic aberration border effect
 *
 * Features:
 * - Layered colored shadows (cyan, green, pink, white)
 * - Occasional glitch effect where colors split apart
 * - Subtle color cycling animation
 */
export default function GlitchBorder({
  children,
  style,
  borderRadius = BorderRadius.md,
  borderWidth = 2,
  intensity = 'medium',
}: GlitchBorderProps) {
  // Glitch state
  const [isGlitching, setIsGlitching] = useState(false)
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })

  // Animated values for color cycling
  const colorPhase = useRef(new Animated.Value(0)).current

  // Intensity settings
  const settings = {
    low: { glitchChance: 0.15, maxOffset: 3, interval: 500 },
    medium: { glitchChance: 0.25, maxOffset: 5, interval: 350 },
    high: { glitchChance: 0.4, maxOffset: 8, interval: 200 },
  }[intensity]

  // Color cycling animation
  useEffect(() => {
    const cycleColors = Animated.loop(
      Animated.timing(colorPhase, {
        toValue: 1,
        duration: 4000, // Full cycle every 4 seconds
        useNativeDriver: false, // Need false for color interpolation
      })
    )
    cycleColors.start()
    return () => cycleColors.stop()
  }, [colorPhase])

  // Glitch effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < settings.glitchChance) {
        setIsGlitching(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * settings.maxOffset * 2,
          y: (Math.random() - 0.5) * settings.maxOffset,
        })

        // Reset after short duration
        setTimeout(() => {
          setIsGlitching(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 50 + Math.random() * 100)
      }
    }, settings.interval)

    return () => clearInterval(glitchInterval)
  }, [settings])

  // Interpolate colors for cycling effect
  const cyanOpacity = colorPhase.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0.8, 0.5, 0.3, 0.5, 0.8],
  })

  const greenOpacity = colorPhase.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0.5, 0.8, 0.5, 0.3, 0.5],
  })

  const pinkOpacity = colorPhase.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0.3, 0.5, 0.8, 0.5, 0.3],
  })

  const baseLayerStyle = {
    position: 'absolute' as const,
    top: -borderWidth,
    left: -borderWidth,
    right: -borderWidth,
    bottom: -borderWidth,
    borderRadius: borderRadius + borderWidth,
    borderWidth: borderWidth,
  }

  return (
    <View style={[styles.container, style]}>
      {/* Cyan layer */}
      <Animated.View
        style={[
          baseLayerStyle,
          {
            borderColor: Colors.cyan,
            opacity: cyanOpacity,
            transform: [
              { translateX: isGlitching ? -2 + glitchOffset.x : -1.5 },
              { translateY: isGlitching ? glitchOffset.y : 0 },
            ],
          },
        ]}
      />

      {/* Green layer */}
      <Animated.View
        style={[
          baseLayerStyle,
          {
            borderColor: Colors.accent,
            opacity: greenOpacity,
            transform: [
              { translateX: isGlitching ? 2 - glitchOffset.x : 1.5 },
              { translateY: isGlitching ? -glitchOffset.y : 0 },
            ],
          },
        ]}
      />

      {/* Pink layer */}
      <Animated.View
        style={[
          baseLayerStyle,
          {
            borderColor: Colors.pink,
            opacity: pinkOpacity,
            transform: [
              { translateX: isGlitching ? glitchOffset.y : 0 },
              { translateY: isGlitching ? 2 + glitchOffset.x * 0.5 : 1 },
            ],
          },
        ]}
      />

      {/* White base layer (always visible) */}
      <View
        style={[
          baseLayerStyle,
          {
            borderColor: 'rgba(255, 255, 255, 0.6)',
            opacity: 1,
          },
        ]}
      />

      {/* Content */}
      <View style={[styles.content, { borderRadius }]}>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  content: {
    overflow: 'hidden',
  },
})
