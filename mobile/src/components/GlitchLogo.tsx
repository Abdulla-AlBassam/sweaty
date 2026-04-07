import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'
import { Fonts } from '../constants/fonts'

/**
 * Glitchy SWEATY logo with RGB chromatic aberration
 */
export default function GlitchLogo() {
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const [isGlitching, setIsGlitching] = useState(false)

  // Random glitch effect - slower and more subtle
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      // 20% chance to glitch (reduced from 30%)
      if (Math.random() < 0.2) {
        setIsGlitching(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * 3,  // Reduced from 6
          y: (Math.random() - 0.5) * 2,  // Reduced from 4
        })

        // Reset after short duration
        setTimeout(() => {
          setIsGlitching(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 80 + Math.random() * 120)  // Slightly longer glitch
      }
    }, 400)  // Slowed from 200ms to 400ms (50% slower)

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
    color: Colors.textDim, // Gray
    opacity: 0.5,
    transform: [{ translateX: -1 }],
  },
  magentaLayer: {
    color: Colors.accent, // Forest green
    opacity: 0.5,
    transform: [{ translateX: 1 }],
  },
  mainText: {
    color: Colors.textBright,
  },
})
