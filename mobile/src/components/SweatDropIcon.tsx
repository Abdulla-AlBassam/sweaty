import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'

interface SweatDropIconProps {
  size?: number
}

/**
 * Glitchy sweat drop icon with RGB chromatic aberration
 * Matches the terminal/hacker aesthetic of the app
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

  // Calculate dimensions based on size
  const dropWidth = size * 0.65
  const dropHeight = size
  const circleSize = size * 0.55
  const triangleSize = size * 0.5

  const renderDrop = (color: string, opacity: number, offsetX: number, offsetY: number) => (
    <View
      style={[
        styles.dropContainer,
        {
          width: dropWidth,
          height: dropHeight,
          opacity,
          transform: [
            { translateX: isGlitching ? offsetX + glitchOffset.x : offsetX },
            { translateY: isGlitching ? offsetY + glitchOffset.y : offsetY },
          ],
        },
      ]}
    >
      {/* Triangle top (rotated square) */}
      <View
        style={[
          styles.triangle,
          {
            width: triangleSize,
            height: triangleSize,
            backgroundColor: color,
            top: size * 0.08,
          },
        ]}
      />
      {/* Circle bottom */}
      <View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: color,
            bottom: size * 0.05,
          },
        ]}
      />
    </View>
  )

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Cyan layer (offset left) */}
      {renderDrop('#00ffff', 0.5, -1.5, 0)}

      {/* Green/Magenta layer (offset right) */}
      {renderDrop(Colors.accent, 0.5, 1.5, 0)}

      {/* Main white drop */}
      {renderDrop('#ffffff', 1, 0, 0)}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  triangle: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  circle: {
    position: 'absolute',
  },
})
