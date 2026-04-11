import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import Svg, { Circle, Ellipse } from 'react-native-svg'

interface LoadingSpinnerProps {
  size?: 'small' | 'large' | number
  color?: string  // Unused — CDs have their own palette. Kept for API compatibility.
}

/**
 * Sideways CD-shuffle loading spinner.
 * Three CDs swap horizontal positions in a 2.4s loop. Adapted from the
 * Framer prototype (which shuffled vertically) to match the new sideways
 * logo layout.
 */

const VIEWBOX_WIDTH = 280
const VIEWBOX_HEIGHT = 220
const DURATION = 2400
const INPUT_RANGE = [0, 0.2, 0.4, 0.6, 0.8, 1]

// X-keyframes in viewBox units. Derived by rotating the original stacked
// shuffle onto the x-axis with 50px CD spacing.
//
// Position sequence across the 6 keyframes:
//   t=0.0  L@90  M@140 R@190   (normal)
//   t=0.2  L@140 M@90  R@140   (L & R meet at middle)
//   t=0.4  L@190 M@140 R@90    (reversed)
//   t=0.6  L@190 M@190 R@190   (all collapsed right)
//   t=0.8  L@140 M@190 R@190
//   t=1.0  L@90  M@140 R@190   (back to start)
const LEFT_KEYS = [0, 50, 100, 100, 50, 0]
const MIDDLE_KEYS = [0, -50, 0, 50, 50, 0]
const RIGHT_KEYS = [0, -50, -100, 0, 0, 0]

export default function LoadingSpinner({ size = 'small' }: LoadingSpinnerProps) {
  const pixelSize =
    typeof size === 'number' ? size : size === 'large' ? 72 : 36

  const scale = pixelSize / VIEWBOX_WIDTH
  const height = VIEWBOX_HEIGHT * scale

  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    progress.setValue(0)
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [progress])

  const toTranslate = (keys: number[]) =>
    progress.interpolate({
      inputRange: INPUT_RANGE,
      outputRange: keys.map((v) => v * scale),
    })

  const leftX = toTranslate(LEFT_KEYS)
  const middleX = toTranslate(MIDDLE_KEYS)
  const rightX = toTranslate(RIGHT_KEYS)

  const layerStyle = { width: pixelSize, height }

  return (
    <View
      style={[styles.container, { width: pixelSize, height }]}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    >
      {/* Left CD - Lightest - drawn first (furthest back) */}
      <Animated.View
        style={[styles.layer, layerStyle, { transform: [{ translateX: leftX }] }]}
      >
        <Svg
          width={pixelSize}
          height={height}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        >
          <Ellipse cx="90" cy="110" rx="16" ry="80" fill="#E5E5E5" />
          <Circle cx="90" cy="110" r="80" fill="#D4D4D4" />
          <Circle cx="90" cy="110" r="24" fill="white" />
          <Circle cx="90" cy="110" r="20" fill="#F5F5F5" />
        </Svg>
      </Animated.View>

      {/* Middle CD */}
      <Animated.View
        style={[styles.layer, layerStyle, { transform: [{ translateX: middleX }] }]}
      >
        <Svg
          width={pixelSize}
          height={height}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        >
          <Ellipse cx="140" cy="110" rx="16" ry="80" fill="#D4D4D4" />
          <Circle cx="140" cy="110" r="80" fill="#A3A3A3" />
          <Circle cx="140" cy="110" r="24" fill="white" />
          <Circle cx="140" cy="110" r="20" fill="#E5E5E5" />
        </Svg>
      </Animated.View>

      {/* Right CD - Darkest - drawn last (foreground) */}
      <Animated.View
        style={[styles.layer, layerStyle, { transform: [{ translateX: rightX }] }]}
      >
        <Svg
          width={pixelSize}
          height={height}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        >
          <Ellipse cx="190" cy="110" rx="16" ry="80" fill="#A3A3A3" />
          <Circle cx="190" cy="110" r="80" fill="#737373" />
          <Circle cx="190" cy="110" r="24" fill="white" />
          <Circle cx="190" cy="110" r="20" fill="#D4D4D4" />
        </Svg>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
})
