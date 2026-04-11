import React, { useEffect, useRef } from 'react'
import { StyleSheet, Animated, Easing } from 'react-native'
import Svg, { Circle, Ellipse, G } from 'react-native-svg'

interface SweatDropIconProps {
  size?: number
  isRefreshing?: boolean
  variant?: 'default' | 'static' | 'loading'  // default = idle, static = no animation, loading = pulse
}

/**
 * Sweaty CD-stack logo.
 * Three overlapping CDs arranged in a vertical stack (rotated 90deg).
 * Variants:
 * - default / static: static render
 * - loading: gentle pulse animation
 * Refresh feedback: brief scale bump when `isRefreshing` turns true.
 */

// ViewBox matches the finetuned source SVG: 280 × 220, CDs at cy=110
const ORIGINAL_WIDTH = 280
const ORIGINAL_HEIGHT = 220

// Global size multiplier — bump this to make the logo larger everywhere at once
const SIZE_MULTIPLIER = 1.2

// CD positions (cx values) — left (back/lightest) to right (front/darkest)
const CD_LAYOUT = [
  { cx: 90, edge: '#E5E5E5', disc: '#D4D4D4', innerRing: '#F5F5F5' },  // Lightest
  { cx: 140, edge: '#D4D4D4', disc: '#A3A3A3', innerRing: '#E5E5E5' }, // Medium
  { cx: 190, edge: '#A3A3A3', disc: '#737373', innerRing: '#D4D4D4' }, // Darkest
]
const CD_CY = 110
const CD_RADIUS = 80
const EDGE_RX = 16
const EDGE_RY = 80
const HOLE_OUTER = 24
const HOLE_INNER = 20

function SweatLogo({ size }: { size: number }) {
  const scale = size / ORIGINAL_WIDTH
  const height = ORIGINAL_HEIGHT * scale

  return (
    <Svg width={size} height={height} viewBox={`0 0 ${ORIGINAL_WIDTH} ${ORIGINAL_HEIGHT}`}>
      <G>
        {CD_LAYOUT.map((cd, i) => (
          <React.Fragment key={`cd${i}`}>
            <Ellipse cx={cd.cx} cy={CD_CY} rx={EDGE_RX} ry={EDGE_RY} fill={cd.edge} />
            <Circle cx={cd.cx} cy={CD_CY} r={CD_RADIUS} fill={cd.disc} />
            <Circle cx={cd.cx} cy={CD_CY} r={HOLE_OUTER} fill="white" />
            <Circle cx={cd.cx} cy={CD_CY} r={HOLE_INNER} fill={cd.innerRing} />
          </React.Fragment>
        ))}
      </G>
    </Svg>
  )
}

export default function SweatDropIcon({ size = 36, isRefreshing = false, variant = 'default' }: SweatDropIconProps) {
  const scaledSize = Math.round(size * SIZE_MULTIPLIER)
  const loadingPulse = useRef(new Animated.Value(1)).current
  const refreshScale = useRef(new Animated.Value(1)).current

  // Loading pulse animation
  useEffect(() => {
    if (variant !== 'loading') return

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
  }, [variant, loadingPulse])

  // Simple scale bump when refresh is triggered
  useEffect(() => {
    if (!isRefreshing) return

    Animated.sequence([
      Animated.timing(refreshScale, {
        toValue: 1.2,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(refreshScale, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start()
  }, [isRefreshing, refreshScale])

  const transforms: Array<{ scale: Animated.Value } | { rotate: string }> = []
  if (variant === 'loading') {
    transforms.push({ scale: loadingPulse })
  }
  transforms.push({ scale: refreshScale })
  // Flip the CD stack from horizontal to vertical
  transforms.push({ rotate: '90deg' })

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: scaledSize + 10,
          height: scaledSize + 10,
          transform: transforms,
        },
      ]}
    >
      <SweatLogo size={scaledSize} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
