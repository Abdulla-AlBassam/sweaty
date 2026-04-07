import React, { useEffect, useState, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'

interface SweatDropIconProps {
  size?: number
  isRefreshing?: boolean
  variant?: 'default' | 'static' | 'loading'  // default = full animation, static = minimal, loading = pulse
}

/**
 * Glitchy sweat drop icon with RGB chromatic aberration
 * Features:
 * - Intense RGB glitch effect
 * - Random floating/drifting motion
 * - Burst animation on refresh
 * Variants:
 * - default: Full floating + glitch animations
 * - static: Minimal glitch, no floating (for placeholders)
 * - loading: Pulsing animation (for loading states)
 */
export default function SweatDropIcon({ size = 36, isRefreshing = false, variant = 'default' }: SweatDropIconProps) {
  // Glitch state
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const [isGlitching, setIsGlitching] = useState(false)

  // Animated values for floating
  const floatX = useRef(new Animated.Value(0)).current
  const floatY = useRef(new Animated.Value(0)).current

  // Animated values for burst effect
  const burstScale = useRef(new Animated.Value(1)).current
  const burstRotation = useRef(new Animated.Value(0)).current
  const cyanBurst = useRef(new Animated.Value(0)).current
  const greenBurst = useRef(new Animated.Value(0)).current

  // Animated value for scale flicker during glitch
  const glitchScale = useRef(new Animated.Value(1)).current

  // Animated value for loading pulse
  const loadingPulse = useRef(new Animated.Value(1)).current

  // Loading pulse animation
  useEffect(() => {
    if (variant === 'loading') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(loadingPulse, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(loadingPulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
      pulse.start()
      return () => pulse.stop()
    }
  }, [variant, loadingPulse])

  // Intensified random glitch effect (reduced for static/loading variants)
  useEffect(() => {
    // Glitch settings based on variant
    const glitchChance = variant === 'default' ? 0.35 : variant === 'loading' ? 0.2 : 0.1
    const glitchIntensity = variant === 'default' ? 1 : 0.5
    const interval = variant === 'default' ? 250 : 400

    const glitchInterval = setInterval(() => {
      if (Math.random() < glitchChance) {
        setIsGlitching(true)

        // Offset based on variant intensity
        setGlitchOffset({
          x: (Math.random() - 0.5) * 8 * glitchIntensity,
          y: (Math.random() - 0.5) * 6 * glitchIntensity,
        })

        // Random scale flicker
        Animated.sequence([
          Animated.timing(glitchScale, {
            toValue: 0.9 + Math.random() * 0.3, // Random between 0.9-1.2
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(glitchScale, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
          }),
        ]).start()

        // Reset after short duration
        setTimeout(() => {
          setIsGlitching(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 60 + Math.random() * 100)
      }
    }, interval)

    return () => clearInterval(glitchInterval)
  }, [glitchScale, variant])

  // Floating/drifting animation - only for default variant
  useEffect(() => {
    if (variant !== 'default') return

    const createFloatAnimation = () => {
      // Pick random destination within bounds
      const targetX = (Math.random() - 0.5) * 20 // ±10px
      const targetY = (Math.random() - 0.5) * 12 // ±6px
      const duration = 1500 + Math.random() * 2000 // 1.5-3.5 seconds

      Animated.parallel([
        Animated.timing(floatX, {
          toValue: targetX,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: targetY,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Occasionally do a sudden "teleport" jump
        if (Math.random() < 0.15) {
          // Quick jump to new position
          const jumpX = (Math.random() - 0.5) * 30
          const jumpY = (Math.random() - 0.5) * 16

          Animated.parallel([
            Animated.timing(floatX, {
              toValue: jumpX,
              duration: 80,
              useNativeDriver: true,
            }),
            Animated.timing(floatY, {
              toValue: jumpY,
              duration: 80,
              useNativeDriver: true,
            }),
          ]).start(() => createFloatAnimation())
        } else {
          createFloatAnimation()
        }
      })
    }

    createFloatAnimation()

    return () => {
      floatX.stopAnimation()
      floatY.stopAnimation()
    }
  }, [floatX, floatY, variant])

  // Burst animation when refresh is triggered
  useEffect(() => {
    if (isRefreshing) {
      // Epic burst sequence
      Animated.parallel([
        // Scale pulse: grow big, shrink small, normalize
        Animated.sequence([
          Animated.timing(burstScale, {
            toValue: 1.5,
            duration: 150,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
          Animated.timing(burstScale, {
            toValue: 0.7,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(burstScale, {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
        ]),
        // Spin rotation
        Animated.sequence([
          Animated.timing(burstRotation, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(burstRotation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Cyan layer explodes outward
        Animated.sequence([
          Animated.timing(cyanBurst, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(cyanBurst, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        // Green layer explodes outward (opposite direction)
        Animated.sequence([
          Animated.timing(greenBurst, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(greenBurst, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start()
    }
  }, [isRefreshing, burstScale, burstRotation, cyanBurst, greenBurst])

  // Interpolate rotation
  const rotationInterpolate = burstRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Interpolate burst offsets for RGB layers
  const cyanBurstOffset = cyanBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  })

  const greenBurstOffset = greenBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  })

  // Container size varies by variant (default needs extra space for floating)
  const containerWidth = variant === 'default' ? size + 40 : size + 10
  const containerHeight = variant === 'default' ? size + 20 : size + 10

  // Build transform array based on variant
  const getTransforms = () => {
    const transforms: any[] = []
    if (variant === 'default') {
      transforms.push({ translateX: floatX }, { translateY: floatY })
    }
    if (variant === 'loading') {
      transforms.push({ scale: loadingPulse })
    }
    transforms.push({ scale: burstScale }, { rotate: rotationInterpolate })
    return transforms
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: containerWidth,
          height: containerHeight,
          transform: getTransforms(),
        }
      ]}
    >
      {/* Cyan layer (offset left) */}
      <Animated.View
        style={[
          styles.iconLayer,
          {
            opacity: 0.6,
            transform: [
              { translateX: Animated.add(
                cyanBurstOffset,
                isGlitching ? -2 + glitchOffset.x : -2
              )},
              { translateY: isGlitching ? glitchOffset.y : 0 },
              { scale: glitchScale },
            ],
          },
        ]}
      >
        <Ionicons name="water" size={size} color={Colors.textDim} />
      </Animated.View>

      {/* Green layer (offset right) */}
      <Animated.View
        style={[
          styles.iconLayer,
          {
            opacity: 0.6,
            transform: [
              { translateX: Animated.add(
                greenBurstOffset,
                isGlitching ? 2 - glitchOffset.x : 2
              )},
              { translateY: isGlitching ? -glitchOffset.y : 0 },
              { scale: glitchScale },
            ],
          },
        ]}
      >
        <Ionicons name="water" size={size} color={Colors.accent} />
      </Animated.View>

      {/* Main white icon */}
      <Animated.View
        style={[
          styles.iconLayer,
          {
            transform: [{ scale: glitchScale }],
          }
        ]}
      >
        <Ionicons name="water" size={size} color={Colors.textBright} />
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    position: 'absolute',
  },
})
