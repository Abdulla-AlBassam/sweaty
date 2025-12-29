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
import { Fonts, Typography } from '../constants/fonts'

interface TerminalAICardProps {
  onPress: () => void
}

export default function TerminalAICard({ onPress }: TerminalAICardProps) {
  // Blinking cursor animation
  const cursorOpacity = useRef(new Animated.Value(1)).current

  // Glow pulse animation
  const glowIntensity = useRef(new Animated.Value(0.3)).current

  // Scan line position
  const scanLinePosition = useRef(new Animated.Value(0)).current

  // Glitch effect state
  const [glitchOffset, setGlitchOffset] = useState(0)

  // Terminal text typing effect
  const [displayText, setDisplayText] = useState('')
  const fullText = 'SWEATY.AI ONLINE'

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

    // Glow pulse animation
    const glowPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowIntensity, {
          toValue: 0.6,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowIntensity, {
          toValue: 0.3,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    )

    // Scan line animation
    const scanLine = Animated.loop(
      Animated.timing(scanLinePosition, {
        toValue: 1,
        duration: 3000,
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

    // Random glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setGlitchOffset(Math.random() * 4 - 2)
        setTimeout(() => setGlitchOffset(0), 50)
      }
    }, 200)

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
      {/* Outer glow effect */}
      <Animated.View style={[styles.glowOuter, { opacity: glowIntensity }]} />

      {/* Main card */}
      <View style={styles.card}>
        {/* Background gradient */}
        <LinearGradient
          colors={['#001a00', '#000d00', '#000000']}
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

              {/* Main prompt with glitch effect */}
              <View style={[styles.promptLine, { transform: [{ translateX: glitchOffset }] }]}>
                <Text style={styles.prompt}>{'>'}</Text>
                <Text style={styles.commandText}>{displayText}</Text>
                <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
                  █
                </Animated.Text>
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
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: BorderRadius.lg + 4,
    backgroundColor: Colors.accent,
    ...Glow.accent,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.accent + '60',
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
    backgroundColor: Colors.accent + '15',
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
  promptLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  prompt: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.accent,
    marginRight: 8,
    ...Glow.text,
  },
  commandText: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    color: Colors.accent,
    letterSpacing: 1,
    ...Glow.text,
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
