import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet, ViewStyle } from 'react-native'
import { Colors } from '../constants/colors'

interface SkeletonProps {
  width: number | string
  height: number
  borderRadius?: number
  style?: ViewStyle
}

export default function Skeleton({
  width,
  height,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()

    return () => pulse.stop()
  }, [pulseAnim])

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  )
}

// Convenience components for common skeleton shapes
export function SkeletonCircle({ size, style }: { size: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />
}

export function SkeletonText({
  width,
  height = 14,
  style,
}: {
  width: number | string
  height?: number
  style?: ViewStyle
}) {
  return <Skeleton width={width} height={height} borderRadius={4} style={style} />
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.surfaceLight,
  },
})
