import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Text, StyleSheet, Animated, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import PressableScale from './PressableScale'
import { HeroBanner } from '../hooks/useHeroBanners'
import { Fonts } from '../constants/fonts'
import { Colors, FontSize, Spacing } from '../constants/colors'

const HOLD_DURATION = 5000 // 5s per banner
const FADE_DURATION = 1200 // 1.2s crossfade

interface Props {
  banners: HeroBanner[]
  onBannerPress: (gameId: number) => void
  height: number
  shuffleTrigger?: number
  hideGameName?: boolean
  onBannerChange?: (banner: HeroBanner) => void
}

export default function HeroBannerCarousel({ banners, onBannerPress, height, shuffleTrigger = 0, hideGameName, onBannerChange }: Props) {
  // Shuffle and pick up to 8 banners on mount
  const [pool] = useState(() => {
    const copy = [...banners]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy.slice(0, 8)
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [pendingIndex, setPendingIndex] = useState(pool.length > 1 ? 1 : 0)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const nameAnim = useRef(new Animated.Value(1)).current
  const isFirstRender = useRef(true)
  const isTransitioning = useRef(false)
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevShuffleTrigger = useRef(shuffleTrigger)
  const onBannerChangeRef = useRef(onBannerChange)
  onBannerChangeRef.current = onBannerChange

  // Report initial banner on mount
  useEffect(() => {
    if (pool.length > 0) {
      onBannerChangeRef.current?.(pool[0])
    }
  }, [pool])

  // After index advances: reset image opacity, fade name back in, report change.
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    fadeAnim.setValue(1)
    nameAnim.setValue(0)
    isTransitioning.current = false
    onBannerChangeRef.current?.(pool[currentIndex])
    Animated.timing(nameAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()
  }, [currentIndex, fadeAnim, nameAnim, pool])

  // Crossfade to a specific target index
  const crossfadeTo = useCallback((targetIndex: number) => {
    if (targetIndex === currentIndex || pool.length <= 1 || isTransitioning.current) return
    isTransitioning.current = true
    if (autoTimer.current) clearTimeout(autoTimer.current)

    setPendingIndex(targetIndex)
    Image.prefetch(pool[targetIndex].screenshot_url)

    Animated.timing(nameAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(targetIndex)
        setPendingIndex((targetIndex + 1) % pool.length)
      })
    })
  }, [currentIndex, pool, fadeAnim, nameAnim])

  // No auto-advance — banner stays fixed until pull-to-refresh

  // Shuffle trigger: instant swap to a random banner on pull-to-refresh
  useEffect(() => {
    if (shuffleTrigger === prevShuffleTrigger.current) return
    prevShuffleTrigger.current = shuffleTrigger
    if (pool.length <= 1) return

    let randomIndex: number
    do {
      randomIndex = Math.floor(Math.random() * pool.length)
    } while (randomIndex === currentIndex)
    setCurrentIndex(randomIndex)
  }, [shuffleTrigger, currentIndex, pool])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fadeAnim.stopAnimation()
      nameAnim.stopAnimation()
      if (autoTimer.current) clearTimeout(autoTimer.current)
    }
  }, [fadeAnim, nameAnim])

  if (pool.length === 0) return null

  const current = pool[currentIndex]
  const pending = pool[pendingIndex]

  return (
    <PressableScale
      style={[styles.container, { height }]}
      onPress={() => onBannerPress(current.game_id)}
      haptic="light"
      scale={0.99}
      accessibilityLabel={current.game_name}
      accessibilityRole="button"
      accessibilityHint="Opens game details"
    >
      {pool.length > 1 && (
        <Image
          source={{ uri: pending.screenshot_url }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      <Animated.Image
        source={{ uri: current.screenshot_url }}
        style={[styles.image, pool.length > 1 && { opacity: fadeAnim }]}
        resizeMode="cover"
      />

      <LinearGradient
        colors={[Colors.gradientEnd, Colors.gradientSubtle, 'transparent']}
        locations={[0, 0.2, 0.7]}
        style={styles.gradientTop}
      />

      <LinearGradient
        colors={['transparent', Colors.gradientEnd, Colors.background]}
        locations={[0, 0.65, 1]}
        style={styles.gradientBottom}
      />

      {!hideGameName && (
        <Animated.View style={[styles.nameContainer, { opacity: pool.length > 1 ? nameAnim : 1 }]}>
          <Text style={styles.gameName}>{current.game_name}</Text>
        </Animated.View>
      )}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  nameContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.screenPadding,
  },
  gameName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: '#B0B0B0',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
})
