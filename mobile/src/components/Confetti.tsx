import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native'
import { Colors } from '../constants/colors'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// Confetti colors - refined forest green + gray palette
const CONFETTI_COLORS = [
  '#2D6B4A', // Forest green
  '#3D8B63', // Light forest green
  '#4A9E6E', // Soft green
  '#8A8A8A', // Medium gray
  '#A0A0A0', // Light gray
  '#C8C8C8', // Silver
  '#ffffff', // White
  '#1F4D35', // Deep forest
]

interface ConfettiPiece {
  id: number
  x: Animated.Value
  y: Animated.Value
  rotation: Animated.Value
  scale: Animated.Value
  opacity: Animated.Value
  color: string
  size: number
  velocityX: number
  velocityY: number
}

interface ConfettiProps {
  active: boolean
  onComplete?: () => void
  count?: number
  duration?: number
  origin?: { x: number; y: number }
}

export default function Confetti({
  active,
  onComplete,
  count = 50,
  duration = 3000,
  origin = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 3 },
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([])
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)

  const createPieces = useCallback(() => {
    const newPieces: ConfettiPiece[] = []

    for (let i = 0; i < count; i++) {
      // Random initial velocity - burst outward
      const angle = Math.random() * Math.PI * 2
      const speed = 300 + Math.random() * 400
      const velocityX = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1)
      const velocityY = -Math.abs(Math.sin(angle) * speed) - 200 // Always go up first

      newPieces.push({
        id: i,
        x: new Animated.Value(origin.x),
        y: new Animated.Value(origin.y),
        rotation: new Animated.Value(0),
        scale: new Animated.Value(0),
        opacity: new Animated.Value(1),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 8 + Math.random() * 8,
        velocityX,
        velocityY,
      })
    }

    return newPieces
  }, [count, origin])

  const animate = useCallback((pieces: ConfettiPiece[]) => {
    const animations = pieces.map((piece) => {
      // Calculate final positions based on physics
      const gravity = 800
      const airResistance = 0.98
      const finalX = origin.x + piece.velocityX * (duration / 1000) * airResistance
      const finalY = SCREEN_HEIGHT + 100

      return Animated.parallel([
        // Horizontal movement with deceleration
        Animated.timing(piece.x, {
          toValue: finalX,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Vertical movement with gravity
        Animated.timing(piece.y, {
          toValue: finalY,
          duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Rotation
        Animated.timing(piece.rotation, {
          toValue: 360 * (2 + Math.random() * 3),
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        // Scale - pop in then maintain
        Animated.sequence([
          Animated.spring(piece.scale, {
            toValue: 1,
            tension: 200,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
        // Fade out near end
        Animated.sequence([
          Animated.delay(duration * 0.7),
          Animated.timing(piece.opacity, {
            toValue: 0,
            duration: duration * 0.3,
            useNativeDriver: true,
          }),
        ]),
      ])
    })

    animationRef.current = Animated.parallel(animations)
    animationRef.current.start(() => {
      setPieces([])
      onComplete?.()
    })
  }, [duration, origin, onComplete])

  useEffect(() => {
    if (active) {
      const newPieces = createPieces()
      setPieces(newPieces)
      // Small delay to ensure state is set before animation
      setTimeout(() => animate(newPieces), 10)
    } else {
      animationRef.current?.stop()
      setPieces([])
    }

    return () => {
      animationRef.current?.stop()
    }
  }, [active, createPieces, animate])

  if (pieces.length === 0) return null

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <Animated.View
          key={piece.id}
          style={[
            styles.piece,
            {
              width: piece.size,
              height: piece.size * 0.6,
              backgroundColor: piece.color,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                {
                  rotate: piece.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
                { scale: piece.scale },
              ],
              opacity: piece.opacity,
              shadowColor: piece.color,
              shadowOpacity: 0.5,
              shadowRadius: 4,
            },
          ]}
        />
      ))}
    </View>
  )
}

// Full-screen celebration overlay with confetti + optional message
interface CelebrationProps {
  visible: boolean
  onHide: () => void
  title?: string
  subtitle?: string
}

export function Celebration({
  visible,
  onHide,
  title,
  subtitle,
}: CelebrationProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start()

      // Auto-hide after animation
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onHide())
      }, 2500)

      return () => clearTimeout(timer)
    } else {
      fadeAnim.setValue(0)
      scaleAnim.setValue(0.5)
    }
  }, [visible, fadeAnim, scaleAnim, onHide])

  if (!visible) return null

  return (
    <View style={styles.celebrationContainer}>
      <Confetti active={visible} count={60} />
      {(title || subtitle) && (
        <Animated.View
          style={[
            styles.celebrationContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {title && (
            <Animated.Text style={styles.celebrationTitle}>{title}</Animated.Text>
          )}
          {subtitle && (
            <Animated.Text style={styles.celebrationSubtitle}>{subtitle}</Animated.Text>
          )}
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  piece: {
    position: 'absolute',
    borderRadius: 2,
  },
  celebrationContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 999,
  },
  celebrationContent: {
    alignItems: 'center',
    padding: 32,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: Colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  celebrationSubtitle: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
  },
})
