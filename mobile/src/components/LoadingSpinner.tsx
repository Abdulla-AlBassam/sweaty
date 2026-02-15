import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import SweatDropIcon from './SweatDropIcon'

interface LoadingSpinnerProps {
  size?: 'small' | 'large'
}

/**
 * Loading spinner using SweatDropIcon with bounce + pulse animation
 * Features RGB chromatic aberration glitch effect
 */
export default function LoadingSpinner({
  size = 'small',
}: LoadingSpinnerProps) {
  const iconSize = size === 'small' ? 22 : 48
  const bounceY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceY, {
          toValue: -6,
          duration: 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceY, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    )
    bounce.start()
    return () => bounce.stop()
  }, [bounceY])

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ translateY: bounceY }] }}>
        <SweatDropIcon size={iconSize} variant="loading" />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
