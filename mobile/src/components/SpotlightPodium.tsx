import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import type { MainStackParamList } from '../navigation'
import type { SpotlightUser } from '../hooks/useCommunitySpotlight'
import { SkeletonCircle, SkeletonText } from './Skeleton'

type Nav = NativeStackNavigationProp<MainStackParamList>
type CategoryKey = 'supporters' | 'streak' | 'rank'

export interface PodiumData {
  supporters: SpotlightUser[]
  streak: SpotlightUser[]
  rank: SpotlightUser[]
}

interface SpotlightPodiumProps {
  data: PodiumData
  loading: boolean
}

const CATEGORIES: ReadonlyArray<{ key: CategoryKey; label: string }> = [
  { key: 'supporters', label: 'SUPPORTERS' },
  { key: 'streak', label: 'STREAK' },
  { key: 'rank', label: 'RANK' },
]

const ROTATION_MS = 5000
const PAUSE_AFTER_TAP_MS = 10000
const TRANSITION_MS = 450
const PULSE_MS = 1200

const AVATAR_SIZE = 52
const HALO_SIZE = AVATAR_SIZE + 14

// Symmetric 4-2-1-3-5 layout (left → right).
// rankIndex: 0 = 1st place, 1 = 2nd, 2 = 3rd, 3 = 4th, 4 = 5th.
const SLOTS: ReadonlyArray<{ rankIndex: number; height: number }> = [
  { rankIndex: 3, height: 50 },   // 4th (leftmost)
  { rankIndex: 1, height: 78 },   // 2nd
  { rankIndex: 0, height: 100 },  // 1st (center, tallest)
  { rankIndex: 2, height: 78 },   // 3rd
  { rankIndex: 4, height: 50 },   // 5th (rightmost)
]

const SLOT_GRADIENTS: ReadonlyArray<[string, string]> = [
  [Colors.surface, Colors.background],         // 4th
  [Colors.surfaceLight, Colors.surface],       // 2nd
  [Colors.surfaceBright, Colors.surfaceLight], // 1st
  [Colors.surfaceLight, Colors.surface],       // 3rd
  [Colors.surface, Colors.background],         // 5th
]

const RANK_LABELS = ['1', '2', '3', '4', '5']

export default function SpotlightPodium({ data, loading }: SpotlightPodiumProps) {
  const navigation = useNavigation<Nav>()
  const [activeKey, setActiveKey] = useState<CategoryKey>('supporters')
  const [isPaused, setIsPaused] = useState(false)
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fadeAnim = useRef(new Animated.Value(1)).current
  const riseAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(0.25)).current

  // Breathing halo behind the 1st-place avatar — matches the "Currently Playing"
  // dot cadence so it reads as a familiar heartbeat, not a new animation.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.25,
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [pulseAnim])

  // Fade + rise on every category change.
  useEffect(() => {
    fadeAnim.setValue(0)
    riseAnim.setValue(10)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: TRANSITION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(riseAnim, {
        toValue: 0,
        duration: TRANSITION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [activeKey, fadeAnim, riseAnim])

  // Auto-rotate every 5s unless paused by a tap or still loading.
  useEffect(() => {
    if (isPaused || loading) return
    const id = setInterval(() => {
      setActiveKey(prev => {
        const idx = CATEGORIES.findIndex(c => c.key === prev)
        return CATEGORIES[(idx + 1) % CATEGORIES.length].key
      })
    }, ROTATION_MS)
    return () => clearInterval(id)
  }, [isPaused, loading])

  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
    }
  }, [])

  const handleTabPress = useCallback((key: CategoryKey) => {
    setActiveKey(key)
    setIsPaused(true)
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current)
    pauseTimeoutRef.current = setTimeout(() => setIsPaused(false), PAUSE_AFTER_TAP_MS)
  }, [])

  const goToLeaderboard = useCallback(() => {
    navigation.navigate('CommunitySpotlight' as never)
  }, [navigation])

  const goToUser = useCallback(
    (user: SpotlightUser) => {
      navigation.navigate('UserProfile', { username: user.username, userId: user.id })
    },
    [navigation]
  )

  const currentUsers = data[activeKey] || []

  // Hide the section entirely when every category is empty after load.
  const hasAnyData =
    data.supporters.length > 0 || data.streak.length > 0 || data.rank.length > 0
  if (!loading && !hasAnyData) return null

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.header}
        onPress={goToLeaderboard}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Community Spotlight — see the full leaderboard"
      >
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Community Spotlight</Text>
          <Text style={styles.description} numberOfLines={1}>
            Top supporters, longest streaks and highest ranks.
          </Text>
        </View>
        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={20} color={Colors.cream} />
        </View>
      </TouchableOpacity>

      <View style={styles.tabsRow}>
        {CATEGORIES.map(cat => {
          const active = cat.key === activeKey
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => handleTabPress(cat.key)}
              style={styles.tab}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${cat.label} leaderboard`}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {cat.label}
              </Text>
              <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
            </TouchableOpacity>
          )
        })}
      </View>

      <Animated.View
        style={[
          styles.podium,
          {
            opacity: fadeAnim,
            transform: [{ translateY: riseAnim }],
          },
        ]}
      >
        {SLOTS.map((slot, i) => {
          const user = currentUsers[slot.rankIndex]
          const gradient = SLOT_GRADIENTS[i]
          const rankLabel = RANK_LABELS[slot.rankIndex]
          const isWinner = slot.rankIndex === 0

          return (
            <View key={i} style={styles.column}>
              <View style={styles.avatarWrap}>
                {isWinner && (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.halo, { opacity: pulseAnim }]}
                  />
                )}
                {loading ? (
                  <SkeletonCircle size={AVATAR_SIZE} />
                ) : user ? (
                  <TouchableOpacity
                    onPress={() => goToUser(user)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${user.display_name || user.username}'s profile`}
                  >
                    {user.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarInitial}>
                          {(user.display_name || user.username || '?').slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.avatar, styles.avatarEmpty]} />
                )}
              </View>

              {loading ? (
                <SkeletonText width={48} height={10} style={styles.usernameSkeleton} />
              ) : (
                <Text style={styles.username} numberOfLines={1}>
                  {user ? user.display_name || user.username : '—'}
                </Text>
              )}

              <LinearGradient
                colors={gradient}
                style={[styles.block, { height: slot.height }]}
              >
                <Text style={styles.rank}>{rankLabel}</Text>
              </LinearGradient>
            </View>
          )
        })}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  header: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: Spacing.sm,
  },
  chevronWrap: {
    width: 20,
    alignItems: 'center',
    marginTop: 4,
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: Spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  tabLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    letterSpacing: 2,
  },
  tabLabelActive: {
    color: Colors.cream,
  },
  tabUnderline: {
    height: 2,
    width: 16,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: Colors.cream,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.sm,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.cream,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.cream,
  },
  avatarEmpty: {
    opacity: 0.35,
  },
  username: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xxs,
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    maxWidth: '100%',
  },
  usernameSkeleton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  block: {
    width: '100%',
    borderTopLeftRadius: BorderRadius.md,
    borderTopRightRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.cream,
    letterSpacing: 2,
  },
})
