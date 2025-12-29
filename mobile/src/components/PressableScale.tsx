import React, { useRef, useCallback } from 'react'
import {
  Pressable,
  Animated,
  ViewStyle,
  StyleProp,
  PressableProps,
} from 'react-native'
import { haptics } from '../hooks/useHaptics'

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  scale?: number
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none'
  disabled?: boolean
}

/**
 * A pressable component with built-in scale animation and haptic feedback
 * Use this for all interactive elements to create premium feel
 */
export default function PressableScale({
  children,
  style,
  scale = 0.96,
  haptic = 'light',
  disabled = false,
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: PressableScaleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = useCallback(
    (e: any) => {
      // Haptic feedback
      if (haptic !== 'none' && !disabled) {
        haptics[haptic]()
      }

      // Scale down animation
      Animated.spring(scaleAnim, {
        toValue: scale,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start()

      onPressIn?.(e)
    },
    [haptic, disabled, scale, scaleAnim, onPressIn]
  )

  const handlePressOut = useCallback(
    (e: any) => {
      // Scale back up with bounce
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }).start()

      onPressOut?.(e)
    },
    [scaleAnim, onPressOut]
  )

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  )
}

/**
 * Pre-configured button variants
 */
export function PressableScaleLight(props: Omit<PressableScaleProps, 'haptic'>) {
  return <PressableScale {...props} haptic="light" scale={0.98} />
}

export function PressableScaleMedium(props: Omit<PressableScaleProps, 'haptic'>) {
  return <PressableScale {...props} haptic="medium" scale={0.96} />
}

export function PressableScaleHeavy(props: Omit<PressableScaleProps, 'haptic'>) {
  return <PressableScale {...props} haptic="heavy" scale={0.94} />
}
