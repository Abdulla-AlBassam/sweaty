import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import { Colors, Spacing, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'

/** Celebration overlay — a quiet fade-in title/subtitle. Haptics (via CelebrationContext) carry most of the feedback. */
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
  const scaleAnim = useRef(new Animated.Value(0.9)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start()

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onHide())
      }, 2000)

      return () => clearTimeout(timer)
    } else {
      fadeAnim.setValue(0)
      scaleAnim.setValue(0.9)
    }
  }, [visible, fadeAnim, scaleAnim, onHide])

  if (!visible) return null

  return (
    <View style={styles.container} accessibilityLabel={title ? `${title}${subtitle ? ': ' + subtitle : ''}` : undefined}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {title && (
          <Animated.Text style={styles.title}>{title}</Animated.Text>
        )}
        {subtitle && (
          <Animated.Text style={styles.subtitle}>{subtitle}</Animated.Text>
        )}
      </Animated.View>
    </View>
  )
}

// Default export kept for import-compatibility with older call sites.
export default function Confetti() {
  return null
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xxl,
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
  },
})
