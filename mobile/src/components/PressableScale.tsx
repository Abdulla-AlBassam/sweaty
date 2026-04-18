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
  containerStyle?: StyleProp<ViewStyle>
  scale?: number
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none'
  disabled?: boolean
}

/** Pressable with scale-on-press and optional haptic feedback. */
export default function PressableScale({
  children,
  style,
  containerStyle,
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
      if (haptic !== 'none' && !disabled) {
        haptics[haptic]()
      }

      Animated.spring(scaleAnim, {
        toValue: scale,
        useNativeDriver: true,
        speed: 80,
        bounciness: 2,
      }).start()

      onPressIn?.(e)
    },
    [haptic, disabled, scale, scaleAnim, onPressIn]
  )

  const handlePressOut = useCallback(
    (e: any) => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }).start()

      onPressOut?.(e)
    },
    [scaleAnim, onPressOut]
  )

  return (
    <Pressable
      style={containerStyle}
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

export function PressableScaleLight(props: Omit<PressableScaleProps, 'haptic'>) {
  return <PressableScale {...props} haptic="light" scale={0.98} />
}

export function PressableScaleMedium(props: Omit<PressableScaleProps, 'haptic'>) {
  return <PressableScale {...props} haptic="medium" scale={0.96} />
}

export function PressableScaleHeavy(props: Omit<PressableScaleProps, 'haptic'>) {
  return <PressableScale {...props} haptic="heavy" scale={0.94} />
}
