import React, { useCallback, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { BorderRadius, Colors, Spacing } from '../constants/colors'
import { Fonts, Typography } from '../constants/fonts'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

type Page = {
  id: 'track' | 'discover' | 'share'
  eyebrow: string
  headline: string
  body: string
  backdrop?: ImageSourcePropType
  hero?: ImageSourcePropType
}

// To swap in real screenshots, drop PNGs into mobile/assets/onboarding/ and
// replace the undefined fields below, for example:
//   backdrop: require('../../assets/onboarding/track-backdrop.png'),
//   hero: require('../../assets/onboarding/track-hero.png'),
const PAGES: Page[] = [
  {
    id: 'track',
    eyebrow: '01 / 03',
    headline: 'TRACK',
    body: 'Your library, your ratings, your words.',
    backdrop: require('../../assets/onboarding/track-backdrop.png'),
  },
  {
    id: 'discover',
    eyebrow: '02 / 03',
    headline: 'DISCOVER',
    body: 'Curated rows and honest scores.',
  },
  {
    id: 'share',
    eyebrow: '03 / 03',
    headline: 'SHARE',
    body: 'Your reviews, your lists, your voice.',
  },
]

interface OnboardingScreenProps {
  onFinish: () => void | Promise<void>
}

export default function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const listRef = useRef<FlatList<Page>>(null)
  const [index, setIndex] = useState(0)

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
      if (newIndex !== index) {
        setIndex(newIndex)
        Haptics.selectionAsync()
      }
    },
    [index],
  )

  const handleNext = useCallback(() => {
    if (index < PAGES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true })
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      onFinish()
    }
  }, [index, onFinish])

  const isLastPage = index === PAGES.length - 1

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Pressable
        onPress={onFinish}
        style={styles.skipButton}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(page) => page.id}
        renderItem={({ item }) => <PageView page={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        getItemLayout={(_, i) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * i,
          index: i,
        })}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((page, i) => (
            <View
              key={page.id}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          accessibilityRole="button"
          accessibilityLabel={isLastPage ? 'Get started' : 'Next'}
        >
          <Text style={styles.ctaText}>
            {isLastPage ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

function PageView({ page }: { page: Page }) {
  return (
    <View style={styles.page}>
      <View style={styles.visualWrap}>
        <View style={styles.backdropFrame}>
          {page.backdrop ? (
            <Image
              source={page.backdrop}
              style={styles.backdropImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderBackdrop}>
              <Text style={styles.placeholderLabel}>{page.headline}</Text>
              <Text style={styles.placeholderHint}>
                assets/onboarding/{'\n'}
                {page.id}-backdrop.png
              </Text>
            </View>
          )}
        </View>

        <View style={styles.heroLift}>
          {page.hero ? (
            <Image
              source={page.hero}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderHero}>
              <Text style={styles.placeholderHeroLabel}>
                {page.headline.charAt(0)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{page.eyebrow}</Text>
        <Text style={styles.headline}>{page.headline}</Text>
        <Text style={styles.body}>{page.body}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.xl,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  skipText: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  visualWrap: {
    flex: 1,
    marginTop: 110,
    marginHorizontal: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdropFrame: {
    width: '90%',
    aspectRatio: 9 / 14,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    opacity: 0.55,
    transform: [{ scale: 0.92 }],
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing.xl,
  },
  placeholderLabel: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: 3,
    marginBottom: Spacing.md,
  },
  placeholderHint: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 16,
  },
  heroLift: {
    position: 'absolute',
    width: '54%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    transform: [{ rotate: '-3deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 12,
    backgroundColor: Colors.surfaceBright,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholderHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderGlow,
  },
  placeholderHeroLabel: {
    fontFamily: Fonts.display,
    fontSize: 72,
    color: Colors.cream,
    letterSpacing: 2,
  },
  copy: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  eyebrow: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.textDim,
    letterSpacing: 2,
    marginBottom: Spacing.lg,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 44,
    color: Colors.cream,
    letterSpacing: 4,
    marginBottom: Spacing.md,
  },
  body: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 48,
    paddingTop: Spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.cream,
  },
  cta: {
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    ...Typography.button,
    color: Colors.background,
    letterSpacing: 1,
  },
})

export const ONBOARDING_STORAGE_KEY = '@sweaty:hasSeenOnboarding'
