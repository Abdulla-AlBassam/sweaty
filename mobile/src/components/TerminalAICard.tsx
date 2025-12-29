import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Colors, Spacing, BorderRadius, Glow } from '../constants/colors'
import { Fonts } from '../constants/fonts'

interface TerminalAICardProps {
  onPress: () => void
}

export default function TerminalAICard({ onPress }: TerminalAICardProps) {
  // Blinking cursor animation
  const cursorOpacity = useRef(new Animated.Value(1)).current

  // Glow pulse animation
  const glowIntensity = useRef(new Animated.Value(0.2)).current

  // Scan line position
  const scanLinePosition = useRef(new Animated.Value(0)).current

  // Glitch effect state - now with RGB split
  const [glitchActive, setGlitchActive] = useState(false)
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })

  // Terminal text typing effect
  const [displayText, setDisplayText] = useState('')
  const fullText = 'SWEATY.AI ONLINE'

  // Chromatic aberration intensity
  const [chromaticOffset, setChromaticOffset] = useState(0)

  useEffect(() => {
    // Cursor blink animation
    const cursorBlink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    )

    // Glow pulse animation - more subtle
    const glowPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowIntensity, {
          toValue: 0.4,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowIntensity, {
          toValue: 0.2,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    )

    // Scan line animation
    const scanLine = Animated.loop(
      Animated.timing(scanLinePosition, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )

    cursorBlink.start()
    glowPulse.start()
    scanLine.start()

    // Typing effect
    let index = 0
    const typeInterval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(typeInterval)
      }
    }, 80)

    // Enhanced glitch effect with RGB split
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        setGlitchActive(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * 6,
          y: (Math.random() - 0.5) * 2,
        })
        setChromaticOffset(Math.random() * 3 + 1)

        // Quick reset
        setTimeout(() => {
          setGlitchActive(false)
          setGlitchOffset({ x: 0, y: 0 })
          setChromaticOffset(0)
        }, 80)
      }
    }, 300)

    return () => {
      cursorBlink.stop()
      glowPulse.stop()
      scanLine.stop()
      clearInterval(typeInterval)
      clearInterval(glitchInterval)
    }
  }, [cursorOpacity, glowIntensity, scanLinePosition])

  const scanLineTranslate = scanLinePosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  })

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Outer glow effect - more subtle */}
      <Animated.View style={[styles.glowOuter, { opacity: glowIntensity }]} />

      {/* Main card */}
      <View style={styles.card}>
        {/* Background gradient - refined dark tones */}
        <LinearGradient
          colors={[Colors.surfaceLight, Colors.surface, Colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Scan line effect */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [{ translateY: scanLineTranslate }],
              },
            ]}
          />

          {/* CRT screen edge vignette */}
          <View style={styles.vignette} />

          {/* Terminal content */}
          <View style={styles.content}>
            {/* Terminal header */}
            <View style={styles.terminalHeader}>
              <View style={styles.terminalDots}>
                <View style={[styles.dot, styles.dotRed]} />
                <View style={[styles.dot, styles.dotYellow]} />
                <View style={[styles.dot, styles.dotGreen]} />
              </View>
              <Text style={styles.terminalTitle}>terminal</Text>
            </View>

            {/* Terminal body */}
            <View style={styles.terminalBody}>
              {/* Status line */}
              <View style={styles.statusLine}>
                <Text style={styles.statusBracket}>[</Text>
                <Text style={styles.statusOk}>OK</Text>
                <Text style={styles.statusBracket}>]</Text>
                <Text style={styles.statusText}> System initialized</Text>
              </View>

              {/* Main prompt with RGB split glitch effect */}
              <View style={styles.promptContainer}>
                {/* Cyan ghost layer - left offset */}
                {glitchActive && (
                  <View style={[styles.promptLine, styles.glitchLayer, {
                    transform: [{ translateX: -chromaticOffset }],
                  }]}>
                    <Text style={[styles.prompt, styles.cyanText]}>{'>'}</Text>
                    <Text style={[styles.commandText, styles.cyanText]}>{displayText}</Text>
                  </View>
                )}

                {/* Magenta ghost layer - right offset */}
                {glitchActive && (
                  <View style={[styles.promptLine, styles.glitchLayer, {
                    transform: [{ translateX: chromaticOffset }],
                  }]}>
                    <Text style={[styles.prompt, styles.magentaText]}>{'>'}</Text>
                    <Text style={[styles.commandText, styles.magentaText]}>{displayText}</Text>
                  </View>
                )}

                {/* Main text layer */}
                <View style={[styles.promptLine, {
                  transform: [
                    { translateX: glitchOffset.x },
                    { translateY: glitchOffset.y },
                  ],
                }]}>
                  <Text style={styles.prompt}>{'>'}</Text>
                  <Text style={styles.commandText}>{displayText}</Text>
                  <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
                    █
                  </Animated.Text>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.description}>
                // Personalized game recommendations
              </Text>

              {/* Action hint */}
              <View style={styles.actionHint}>
                <Text style={styles.hintText}>PRESS TO EXECUTE</Text>
                <Text style={styles.hintArrow}>→</Text>
              </View>
            </View>
          </View>

          {/* Border glow */}
          <View style={styles.borderGlow} />
        </LinearGradient>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  glowOuter: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: BorderRadius.lg + 3,
    backgroundColor: Colors.accent,
    ...Glow.subtle,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  gradient: {
    padding: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.accent + '10',
  },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.lg,
    borderWidth: 20,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent + '20',
  },
  terminalDots: {
    flexDirection: 'row',
    gap: 6,
    marginRight: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotRed: {
    backgroundColor: '#ff5f57',
  },
  dotYellow: {
    backgroundColor: '#ffbd2e',
  },
  dotGreen: {
    backgroundColor: Colors.accent,
  },
  terminalTitle: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textDim,
    textTransform: 'lowercase',
  },
  terminalBody: {
    paddingVertical: Spacing.xs,
  },
  statusLine: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  statusBracket: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
  },
  statusOk: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.accent,
  },
  statusText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
  },
  promptContainer: {
    position: 'relative',
    marginVertical: Spacing.sm,
  },
  promptLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glitchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cyanText: {
    color: Colors.glitchCyan,
    opacity: 0.7,
  },
  magentaText: {
    color: Colors.glitch,
    opacity: 0.7,
  },
  prompt: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.accent,
    marginRight: 8,
  },
  commandText: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.accent,
    letterSpacing: 1,
  },
  cursor: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.accent,
    marginLeft: 2,
  },
  description: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textDim,
    marginTop: Spacing.xs,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  hintText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  hintArrow: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.accent,
  },
  borderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
})
