import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, TextStyle, ViewStyle } from 'react-native'
import { Colors } from '../constants/colors'

interface HolographicTextProps {
  text: string
  style?: TextStyle
  containerStyle?: ViewStyle
}

// Holographic text with CD shimmer effect - iridescent color cycling + glitch
export default function HolographicText({
  text,
  style,
  containerStyle,
}: HolographicTextProps) {
  const shimmerOpacity = useRef(new Animated.Value(0.8)).current
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const [showGlitch, setShowGlitch] = useState(false)
  const [currentColor, setCurrentColor] = useState('#ffffff')

  useEffect(() => {
    // Iridescent color cycling - CD shimmer effect
    const colors = ['#ffffff', '#e0e7ff', '#c4b5fd', '#f0abfc', '#67e8f9', '#a5f3fc']
    let colorIdx = 0
    const colorCycle = setInterval(() => {
      colorIdx = (colorIdx + 1) % colors.length
      setCurrentColor(colors[colorIdx])
    }, 120)

    // Shimmer pulse animation
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0.7,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    )
    shimmer.start()

    // RGB split glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.75) {
        setShowGlitch(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * 6,
          y: (Math.random() - 0.5) * 2,
        })
        setTimeout(() => {
          setShowGlitch(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 80)
      }
    }, 250)

    return () => {
      clearInterval(colorCycle)
      clearInterval(glitchInterval)
      shimmer.stop()
    }
  }, [shimmerOpacity])

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Cyan ghost layer - left offset */}
      {showGlitch && (
        <Text
          style={[
            styles.glitchLayer,
            styles.cyanGhost,
            style,
            { transform: [{ translateX: -glitchOffset.x - 2 }] },
          ]}
        >
          {text}
        </Text>
      )}

      {/* Magenta ghost layer - right offset */}
      {showGlitch && (
        <Text
          style={[
            styles.glitchLayer,
            styles.magentaGhost,
            style,
            { transform: [{ translateX: glitchOffset.x + 2 }] },
          ]}
        >
          {text}
        </Text>
      )}

      {/* Main text with holographic color shimmer */}
      <Animated.Text
        style={[
          style,
          {
            color: currentColor,
            opacity: shimmerOpacity,
            transform: [
              { translateX: glitchOffset.x * 0.3 },
              { translateY: glitchOffset.y * 0.3 },
            ],
            textShadowColor: currentColor,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 10,
          },
        ]}
      >
        {text}
      </Animated.Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  glitchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cyanGhost: {
    color: Colors.glitchCyan,
    opacity: 0.6,
  },
  magentaGhost: {
    color: Colors.glitch,
    opacity: 0.6,
  },
})
