import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated, TextStyle, ViewStyle } from 'react-native'
import { Colors } from '../constants/colors'
import { Fonts } from '../constants/fonts'

interface GlitchTextProps {
  text: string
  style?: TextStyle
  containerStyle?: ViewStyle
  intensity?: 'subtle' | 'medium' | 'heavy'
  enabled?: boolean
}

export default function GlitchText({
  text,
  style,
  containerStyle,
  intensity = 'medium',
  enabled = true,
}: GlitchTextProps) {
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const [showGlitch, setShowGlitch] = useState(false)
  const opacity = useRef(new Animated.Value(1)).current

  // Glitch timing based on intensity
  const config = {
    subtle: { interval: 3000, probability: 0.3, maxOffset: 2, duration: 50 },
    medium: { interval: 2000, probability: 0.5, maxOffset: 3, duration: 80 },
    heavy: { interval: 800, probability: 0.7, maxOffset: 5, duration: 120 },
  }[intensity]

  useEffect(() => {
    if (!enabled) return

    const glitchInterval = setInterval(() => {
      if (Math.random() < config.probability) {
        // Trigger glitch
        setShowGlitch(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * config.maxOffset * 2,
          y: (Math.random() - 0.5) * config.maxOffset,
        })

        // Optional opacity flicker
        if (Math.random() > 0.7) {
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.7,
              duration: 30,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 30,
              useNativeDriver: true,
            }),
          ]).start()
        }

        // Reset glitch
        setTimeout(() => {
          setShowGlitch(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, config.duration)
      }
    }, config.interval)

    return () => clearInterval(glitchInterval)
  }, [enabled, intensity])

  if (!enabled) {
    return <Text style={style}>{text}</Text>
  }

  return (
    <Animated.View style={[styles.container, containerStyle, { opacity }]}>
      {/* Cyan layer (offset left) */}
      {showGlitch && (
        <Text
          style={[
            styles.glitchLayer,
            styles.cyanLayer,
            style,
            {
              transform: [
                { translateX: -glitchOffset.x - 1 },
                { translateY: glitchOffset.y },
              ],
            },
          ]}
        >
          {text}
        </Text>
      )}

      {/* Magenta layer (offset right) */}
      {showGlitch && (
        <Text
          style={[
            styles.glitchLayer,
            styles.magentaLayer,
            style,
            {
              transform: [
                { translateX: glitchOffset.x + 1 },
                { translateY: -glitchOffset.y },
              ],
            },
          ]}
        >
          {text}
        </Text>
      )}

      {/* Main text */}
      <Text
        style={[
          style,
          showGlitch && {
            transform: [
              { translateX: glitchOffset.x * 0.3 },
              { translateY: glitchOffset.y * 0.3 },
            ],
          },
        ]}
      >
        {text}
      </Text>
    </Animated.View>
  )
}

// Glitchy section header with decorative lines
export function GlitchHeader({
  title,
  style,
}: {
  title: string
  style?: ViewStyle
}) {
  return (
    <View style={[headerStyles.container, style]}>
      <View style={headerStyles.line} />
      <View style={headerStyles.bracket}>
        <Text style={headerStyles.bracketText}>[</Text>
      </View>
      <GlitchText
        text={title}
        style={headerStyles.title}
        intensity="subtle"
      />
      <View style={headerStyles.bracket}>
        <Text style={headerStyles.bracketText}>]</Text>
      </View>
      <View style={headerStyles.line} />
    </View>
  )
}

// Glitch bar - decorative animated line
export function GlitchBar({ style }: { style?: ViewStyle }) {
  const [segments, setSegments] = useState<boolean[]>(new Array(20).fill(true))

  useEffect(() => {
    const interval = setInterval(() => {
      setSegments(prev =>
        prev.map(() => Math.random() > 0.1)
      )
    }, 150)

    return () => clearInterval(interval)
  }, [])

  return (
    <View style={[barStyles.container, style]}>
      {segments.map((visible, i) => (
        <View
          key={i}
          style={[
            barStyles.segment,
            !visible && barStyles.segmentHidden,
          ]}
        />
      ))}
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
  cyanLayer: {
    color: Colors.glitchCyan,
    opacity: 0.8,
  },
  magentaLayer: {
    color: Colors.glitch,
    opacity: 0.8,
  },
})

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  bracket: {
    paddingHorizontal: 4,
  },
  bracketText: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.cyan,
  },
  title: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
})

const barStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    backgroundColor: Colors.accent,
    opacity: 0.6,
  },
  segmentHidden: {
    opacity: 0.1,
  },
})
