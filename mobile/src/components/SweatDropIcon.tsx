import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'

interface SweatDropIconProps {
  size?: number
}

/**
 * Glitchy sweat drop icon with RGB chromatic aberration
 * Uses Ionicons water drop with glitch overlay effect
 */
export default function SweatDropIcon({ size = 36 }: SweatDropIconProps) {
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const [isGlitching, setIsGlitching] = useState(false)

  // Random glitch effect - same timing as GlitchLogo
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      // 20% chance to glitch
      if (Math.random() < 0.2) {
        setIsGlitching(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * 3,
          y: (Math.random() - 0.5) * 2,
        })

        // Reset after short duration
        setTimeout(() => {
          setIsGlitching(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 80 + Math.random() * 120)
      }
    }, 400)

    return () => clearInterval(glitchInterval)
  }, [])

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Cyan layer (offset left) */}
      <View
        style={[
          styles.iconLayer,
          {
            opacity: 0.5,
            transform: [
              { translateX: isGlitching ? -1.5 + glitchOffset.x : -1.5 },
              { translateY: isGlitching ? glitchOffset.y : 0 },
            ],
          },
        ]}
      >
        <Ionicons name="water" size={size} color="#00ffff" />
      </View>

      {/* Green layer (offset right) */}
      <View
        style={[
          styles.iconLayer,
          {
            opacity: 0.5,
            transform: [
              { translateX: isGlitching ? 1.5 - glitchOffset.x : 1.5 },
              { translateY: isGlitching ? -glitchOffset.y : 0 },
            ],
          },
        ]}
      >
        <Ionicons name="water" size={size} color={Colors.accent} />
      </View>

      {/* Main white icon */}
      <View style={styles.iconLayer}>
        <Ionicons name="water" size={size} color="#ffffff" />
      </View>
    </View>
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
