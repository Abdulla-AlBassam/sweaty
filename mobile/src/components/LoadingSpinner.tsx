import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import SweatDropIcon from './SweatDropIcon'

interface LoadingSpinnerProps {
  size?: 'small' | 'large'
}

/**
 * Loading spinner using SweatDropIcon with gentle pulse animation
 */
export default function LoadingSpinner({
  size = 'small',
}: LoadingSpinnerProps) {
  const iconSize = size === 'small' ? 22 : 48
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [opacity])

  return (
    <View style={styles.container} accessibilityLabel="Loading">
      <Animated.View style={{ opacity }}>
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
