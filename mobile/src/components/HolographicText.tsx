import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, TextStyle, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { Colors } from '../constants/colors'
import { Fonts } from '../constants/fonts'

interface HolographicTextProps {
  text: string
  style?: TextStyle
  containerStyle?: ViewStyle
}

// Holographic/CD shimmer colors - iridescent spectrum
const HOLO_COLORS = [
  '#ffffff',  // White
  '#e0e7ff',  // Soft blue
  '#c4b5fd',  // Lavender
  '#f0abfc',  // Pink
  '#67e8f9',  // Cyan
  '#a5f3fc',  // Light cyan
  '#ffffff',  // White
]

export default function HolographicText({
  text,
  style,
  containerStyle,
}: HolographicTextProps) {
  // Shimmer animation - sweeps across the text
  const shimmerPosition = useRef(new Animated.Value(0)).current

  // Glitch state for occasional distortion
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const [showGlitch, setShowGlitch] = useState(false)

  useEffect(() => {
    // Continuous shimmer animation
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerPosition, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerPosition, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )
    shimmer.start()

    // Occasional glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        setShowGlitch(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 2,
        })

        setTimeout(() => {
          setShowGlitch(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 60)
      }
    }, 400)

    return () => {
      shimmer.stop()
      clearInterval(glitchInterval)
    }
  }, [shimmerPosition])

  // Interpolate shimmer position for gradient translation
  const translateX = shimmerPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  })

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Cyan ghost layer for glitch */}
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

      {/* Magenta ghost layer for glitch */}
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

      {/* Main holographic text with masked gradient */}
      <MaskedView
        maskElement={
          <Text
            style={[
              styles.maskText,
              style,
              {
                transform: [
                  { translateX: glitchOffset.x * 0.5 },
                  { translateY: glitchOffset.y * 0.5 },
                ],
              },
            ]}
          >
            {text}
          </Text>
        }
      >
        <Animated.View style={{ transform: [{ translateX }] }}>
          <LinearGradient
            colors={HOLO_COLORS}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradient}
          >
            {/* Invisible text to maintain size */}
            <Text style={[style, styles.invisibleText]}>{text}</Text>
          </LinearGradient>
        </Animated.View>
      </MaskedView>

      {/* Subtle white highlight overlay */}
      <Animated.View
        style={[
          styles.highlightOverlay,
          {
            transform: [{ translateX }],
            opacity: shimmerPosition.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.3, 0],
            }),
          },
        ]}
      />
    </View>
  )
}

// Simpler version without MaskedView dependency (fallback)
export function HolographicTextSimple({
  text,
  style,
  containerStyle,
}: HolographicTextProps) {
  const shimmerOpacity = useRef(new Animated.Value(0)).current
  const colorIndex = useRef(new Animated.Value(0)).current
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const [showGlitch, setShowGlitch] = useState(false)
  const [currentColor, setCurrentColor] = useState('#ffffff')

  useEffect(() => {
    // Color cycling animation
    const colorCycle = setInterval(() => {
      const colors = ['#ffffff', '#c4b5fd', '#f0abfc', '#67e8f9', '#a5f3fc', '#e0e7ff']
      setCurrentColor(colors[Math.floor(Math.random() * colors.length)])
    }, 150)

    // Shimmer pulse
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    shimmer.start()

    // Glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.8) {
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
    }, 300)

    return () => {
      clearInterval(colorCycle)
      clearInterval(glitchInterval)
      shimmer.stop()
    }
  }, [shimmerOpacity])

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Cyan ghost */}
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

      {/* Magenta ghost */}
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

      {/* Main text with color shimmer */}
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
            textShadowRadius: 8,
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
  maskText: {
    backgroundColor: 'transparent',
  },
  gradient: {
    width: 400, // Wide enough for animation sweep
  },
  invisibleText: {
    opacity: 0,
  },
  highlightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },
})
