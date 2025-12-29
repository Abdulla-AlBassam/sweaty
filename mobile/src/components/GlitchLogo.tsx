import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Fonts } from '../constants/fonts'

/**
 * Glitchy SWEATY logo with RGB chromatic aberration
 */
export default function GlitchLogo() {
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const [isGlitching, setIsGlitching] = useState(false)

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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: 40,
  },
  text: {
    fontFamily: Fonts.mono,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: 4,
    position: 'absolute',
  },
  cyanLayer: {
    color: '#00ffff',
    opacity: 0.6,
    transform: [{ translateX: -1.5 }],
  },
  magentaLayer: {
    color: '#22c55e', // Green accent instead of magenta
    opacity: 0.6,
    transform: [{ translateX: 1.5 }],
  },
  mainText: {
    color: '#ffffff',
  },
})
