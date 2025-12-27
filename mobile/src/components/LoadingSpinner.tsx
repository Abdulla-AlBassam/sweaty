import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'

interface LoadingSpinnerProps {
  size?: 'small' | 'large'
  color?: string
}

export default function LoadingSpinner({
  size = 'small',
  color = Colors.accent
}: LoadingSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    spin.start()

    return () => spin.stop()
  }, [spinValue])

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const iconSize = size === 'small' ? 24 : 40

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="disc" size={iconSize} color={color} />
    </Animated.View>
  )
}
