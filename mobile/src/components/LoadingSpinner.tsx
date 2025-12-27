import React, { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
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
        duration: 800,
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

  const iconSize = size === 'small' ? 22 : 36

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <MaterialCommunityIcons name="controller-classic-outline" size={iconSize} color={color} />
    </Animated.View>
  )
}
