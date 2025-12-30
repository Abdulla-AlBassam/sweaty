import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, BorderRadius, Glow } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import SweatDropIcon from './SweatDropIcon'

interface ChromeAICardProps {
  onPress: () => void
}

/**
 * Chrome Glitch AI Card - Matches the app's RGB chromatic aberration aesthetic
 * Features:
 * - RGB glitch border effect
 * - SweatDropIcon with loading animation
 * - Clean modern design (no terminal styling)
 */
export default function ChromeAICard({ onPress }: ChromeAICardProps) {
  // Glitch state for RGB borders
  const [isGlitching, setIsGlitching] = useState(false)
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })

  // Title glitch animation
  const titleGlitchAnim = useRef(new Animated.Value(0)).current

  // Subtle pulse for the card
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Glitch effect for borders
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.2) {
        setIsGlitching(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 3,
        })

        setTimeout(() => {
          setIsGlitching(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 60 + Math.random() * 80)
      }
    }, 350)

    return () => clearInterval(glitchInterval)
  }, [])

  // Title glitch animation
  useEffect(() => {
    const glitchAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(titleGlitchAnim, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(titleGlitchAnim, {
          toValue: 0,
          duration: 2500 + Math.random() * 2000,
          useNativeDriver: true,
        }),
      ])
    )
    glitchAnimation.start()
    return () => glitchAnimation.stop()
  }, [titleGlitchAnim])

  // Subtle pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.01,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Animated.View style={[styles.cardWrapper, { transform: [{ scale: pulseAnim }] }]}>
        {/* RGB Border Layers */}
        <View
          style={[
            styles.borderLayer,
            styles.borderCyan,
            {
              transform: [
                { translateX: isGlitching ? -2 + glitchOffset.x : -1.5 },
                { translateY: isGlitching ? glitchOffset.y : 0 },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.borderLayer,
            styles.borderGreen,
            {
              transform: [
                { translateX: isGlitching ? 2 - glitchOffset.x : 1.5 },
                { translateY: isGlitching ? -glitchOffset.y : 0 },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.borderLayer,
            styles.borderPink,
            {
              transform: [
                { translateY: isGlitching ? 1.5 + glitchOffset.y : 0.5 },
              ],
            },
          ]}
        />

        {/* Main Card */}
        <View style={styles.card}>
          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <SweatDropIcon size={32} variant="loading" />
            </View>

            {/* Text Content */}
            <View style={styles.textContent}>
              {/* Title with RGB glitch */}
              <View style={styles.titleContainer}>
                {/* Cyan layer */}
                <Animated.Text
                  style={[
                    styles.titleLayer,
                    styles.titleCyan,
                    {
                      transform: [
                        {
                          translateX: titleGlitchAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -2],
                          }),
                        },
                      ],
                      opacity: titleGlitchAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 0.6, 0.3],
                      }),
                    },
                  ]}
                >
                  AI Recommendations
                </Animated.Text>
                {/* Green layer */}
                <Animated.Text
                  style={[
                    styles.titleLayer,
                    styles.titleGreen,
                    {
                      transform: [
                        {
                          translateX: titleGlitchAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 2],
                          }),
                        },
                      ],
                      opacity: titleGlitchAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.3, 0.6, 0.3],
                      }),
                    },
                  ]}
                >
                  AI Recommendations
                </Animated.Text>
                {/* Main title */}
                <Text style={styles.title}>AI Recommendations</Text>
              </View>

              <Text style={styles.description}>
                Get personalized game suggestions
              </Text>
            </View>

            {/* Arrow */}
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.screenPadding,
  },
  cardWrapper: {
    position: 'relative',
  },
  borderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  borderCyan: {
    borderColor: Colors.cyan,
    opacity: 0.5,
  },
  borderGreen: {
    borderColor: Colors.accent,
    opacity: 0.5,
  },
  borderPink: {
    borderColor: Colors.pink,
    opacity: 0.4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  textContent: {
    flex: 1,
  },
  titleContainer: {
    position: 'relative',
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.text,
  },
  titleLayer: {
    position: 'absolute',
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
  },
  titleCyan: {
    color: Colors.cyan,
  },
  titleGreen: {
    color: Colors.accent,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  arrowContainer: {
    marginLeft: Spacing.sm,
  },
})
