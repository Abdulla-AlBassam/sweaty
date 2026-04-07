import React, { useRef, useEffect, useState } from 'react'
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'

// Glitchy Add Button Component with burst animation
export default function GlitchAddButton({ onPress }: { onPress: () => void }) {
  const [isGlitching, setIsGlitching] = useState(false)
  const [glitchOffset, setGlitchOffset] = useState({ x: 0, y: 0 })
  const scaleAnim = useRef(new Animated.Value(1)).current
  const rotationAnim = useRef(new Animated.Value(0)).current

  // Burst animation values
  const burstScale = useRef(new Animated.Value(1)).current
  const cyanBurst = useRef(new Animated.Value(0)).current
  const greenBurst = useRef(new Animated.Value(0)).current
  const pinkBurst = useRef(new Animated.Value(0)).current

  // Glitch effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.25) {
        setIsGlitching(true)
        setGlitchOffset({
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 3,
        })

        // Scale flicker
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95 + Math.random() * 0.15,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 40,
            useNativeDriver: true,
          }),
        ]).start()

        setTimeout(() => {
          setIsGlitching(false)
          setGlitchOffset({ x: 0, y: 0 })
        }, 60 + Math.random() * 80)
      }
    }, 300)

    return () => clearInterval(glitchInterval)
  }, [scaleAnim])

  // Handle press with burst animation
  const handlePress = () => {
    // Play burst animation
    Animated.parallel([
      // Scale: grow big, shrink small, normalize
      Animated.sequence([
        Animated.timing(burstScale, {
          toValue: 1.4,
          duration: 100,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(burstScale, {
          toValue: 0.8,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(burstScale, {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]),
      // Rotation: quick spin
      Animated.sequence([
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rotationAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // Cyan layer burst outward (left-up)
      Animated.sequence([
        Animated.timing(cyanBurst, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(cyanBurst, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Green layer burst outward (right-down)
      Animated.sequence([
        Animated.timing(greenBurst, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(greenBurst, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Pink glow pulse
      Animated.sequence([
        Animated.timing(pinkBurst, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pinkBurst, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start()

    // Call onPress after a slight delay for visual feedback
    setTimeout(() => {
      onPress()
    }, 80)
  }

  // Interpolations for burst animation
  const rotationInterpolate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  const cyanBurstX = cyanBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  })

  const cyanBurstY = cyanBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  })

  const cyanBurstOpacity = cyanBurst.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.6, 0.9, 0],
  })

  const greenBurstX = greenBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  })

  const greenBurstY = greenBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  })

  const greenBurstOpacity = greenBurst.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.6, 0.9, 0],
  })

  const pinkGlowScale = pinkBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  })

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View
        style={[
          styles.addButtonContainer,
          {
            transform: [
              { scale: Animated.multiply(scaleAnim, burstScale) },
              { rotate: rotationInterpolate },
            ],
          },
        ]}
      >
        {/* Cyan layer with burst (offset left) */}
        <Animated.View
          style={[
            styles.addButtonLayer,
            styles.addButtonCyan,
            {
              opacity: cyanBurstOpacity,
              transform: [
                {
                  translateX: Animated.add(
                    cyanBurstX,
                    isGlitching ? -2 + glitchOffset.x : -1.5
                  ),
                },
                {
                  translateY: Animated.add(
                    cyanBurstY,
                    isGlitching ? glitchOffset.y : 0
                  ),
                },
              ],
            },
          ]}
        >
          <Ionicons name="add" size={22} color={Colors.background} />
        </Animated.View>

        {/* Green layer with burst (offset right) */}
        <Animated.View
          style={[
            styles.addButtonLayer,
            styles.addButtonGreen,
            {
              opacity: greenBurstOpacity,
              transform: [
                {
                  translateX: Animated.add(
                    greenBurstX,
                    isGlitching ? 2 - glitchOffset.x : 1.5
                  ),
                },
                {
                  translateY: Animated.add(
                    greenBurstY,
                    isGlitching ? -glitchOffset.y : 0
                  ),
                },
              ],
            },
          ]}
        >
          <Ionicons name="add" size={22} color={Colors.background} />
        </Animated.View>

        {/* Main white button */}
        <Animated.View
          style={[
            styles.addButtonMain,
            {
              transform: [{ scale: pinkGlowScale }],
            },
          ]}
        >
          <Ionicons name="add" size={22} color={Colors.background} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  addButtonContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
  },
  addButtonLayer: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonCyan: {
    backgroundColor: Colors.cyan,
    opacity: 0.7,
  },
  addButtonGreen: {
    backgroundColor: Colors.accent,
    opacity: 0.7,
  },
  addButtonMain: {
    backgroundColor: Colors.text,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
