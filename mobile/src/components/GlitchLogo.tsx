import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Fonts } from '../constants/fonts'

/**
 * Glitchy SWEATY logo with RGB chromatic aberration
 * Inspired by classic glitch/VHS aesthetic
 */
export default function GlitchLogo() {
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const [isGlitching, setIsGlitching] = useState(false)
  const scanlineAnim = useRef(new Animated.Value(0)).current

  // Scanline animation - moves down continuously
  useEffect(() => {
    const scanline = Animated.loop(
      Animated.timing(scanlineAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    )
    scanline.start()
    return () => scanline.stop()
  }, [])

  // Random glitch effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      // 30% chance to glitch
      if (Math.random() < 0.3) {
        setIsGlitching(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * 6,
          y: (Math.random() - 0.5) * 4,
        })

        // Reset after short duration
        setTimeout(() => {
          setIsGlitching(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 50 + Math.random() * 100)
      }
    }, 200)

    return () => clearInterval(glitchInterval)
  }, [])

  const scanlineTranslateY = scanlineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  })

  return (
    <View style={styles.container}>
      {/* Cyan layer (offset left) */}
      <Text
        style={[
          styles.text,
          styles.cyanLayer,
          isGlitching && {
            transform: [
              { translateX: -2 + glitchOffset.x },
              { translateY: glitchOffset.y },
            ],
          },
        ]}
      >
        SWEATY
      </Text>

      {/* Magenta/Pink layer (offset right) */}
      <Text
        style={[
          styles.text,
          styles.magentaLayer,
          isGlitching && {
            transform: [
              { translateX: 2 - glitchOffset.x },
              { translateY: -glitchOffset.y },
            ],
          },
        ]}
      >
        SWEATY
      </Text>

      {/* Main white text */}
      <Text style={[styles.text, styles.mainText]}>SWEATY</Text>

      {/* Animated scanline */}
      <Animated.View
        style={[
          styles.scanline,
          {
            transform: [{ translateY: scanlineTranslateY }],
          },
        ]}
      />

      {/* Static noise lines (decorative) */}
      <View style={styles.noiseLinesContainer}>
        <View style={[styles.noiseLine, { top: '20%' }]} />
        <View style={[styles.noiseLine, { top: '50%' }]} />
        <View style={[styles.noiseLine, { top: '80%' }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    overflow: 'hidden',
  },
  text: {
    fontFamily: Fonts.mono,
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 8,
    position: 'absolute',
  },
  cyanLayer: {
    color: '#00ffff',
    opacity: 0.7,
    transform: [{ translateX: -2 }],
  },
  magentaLayer: {
    color: '#ff00ff',
    opacity: 0.7,
    transform: [{ translateX: 2 }],
  },
  mainText: {
    color: '#ffffff',
  },
  scanline: {
    position: 'absolute',
    width: '120%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  noiseLinesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  noiseLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
})
