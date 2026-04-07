import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import Svg, { Circle } from 'react-native-svg'
import PressableScale from '../components/PressableScale'
import { useAuth } from '../contexts/AuthContext'
import { useGameLogs, useFollowCounts } from '../hooks/useSupabase'
import { calculateXP, getLevel, getBadgeColor } from '../lib/xp'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'

// ── COLOR SCHEME TEST (mirrors DashboardScreen) ───────────
const TestBg = {
  background: '#1A1A1C',
  surface: '#2A2A2E',
  surfaceLight: '#333338',
  border: '#2E2E32',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  textDim: '#999999',
  textMuted: '#A3A3A3',
}

const LEVEL_THRESHOLDS = [0, 50, 150, 400, 800, 1500, 2500, 4000, 6000, 9000, 13000, 18000, 25000, 35000, 50000, 60000]

const RANK_NAMES = [
  'Newcomer', 'Apprentice', 'Player', 'Regular',
  'Dedicated', 'Skilled', 'Veteran', 'Expert',
  'Elite', 'Champion', 'Master', 'Grandmaster',
  'Legend', 'Icon', 'Mythic', 'Sweat',
]

const XP_SOURCES = [
  { action: 'Complete a game', xp: 100 },
  { action: 'Mark as played', xp: 50 },
  { action: 'Write a review', xp: 30 },
  { action: 'Currently playing / on hold', xp: 25 },
  { action: 'Drop a game', xp: 10 },
  { action: 'Rate a game', xp: 5 },
  { action: 'Gain a follower', xp: 10 },
]

export default function RankProgressScreen() {
  const navigation = useNavigation()
  const { user, profile } = useAuth()
  const { logs } = useGameLogs(user?.id)
  const { followers } = useFollowCounts(user?.id)

  const totalXP = calculateXP(logs, followers)
  const levelInfo = getLevel(totalXP)
  const { level, rank, currentXP, xpForNextLevel, progress } = levelInfo
  const isMaxLevel = level === 15
  const badgeColor = getBadgeColor(level)
  const fillProgress = isMaxLevel ? 100 : progress

  // Large ring for hero
  const ringSize = 120
  const ringStroke = 6
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (fillProgress / 100) * ringCircumference

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} containerStyle={styles.backButton} haptic="light">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>RANK</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero: Current Rank */}
        <View style={styles.heroSection}>
          <View style={styles.heroRing}>
            <Svg width={ringSize} height={ringSize}>
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke={TestBg.surfaceLight}
                strokeWidth={ringStroke}
                fill="none"
              />
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke={badgeColor}
                strokeWidth={ringStroke}
                fill="none"
                strokeDasharray={`${ringCircumference}`}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${ringSize / 2}, ${ringSize / 2}`}
              />
            </Svg>
            <View style={styles.heroRingContent}>
              <Text style={[styles.heroLevel, { color: badgeColor }]}>{level}</Text>
              <Text style={styles.heroRank}>{rank}</Text>
            </View>
          </View>

          {/* XP Progress */}
          <View style={styles.xpRow}>
            <Text style={styles.xpText}>
              {isMaxLevel
                ? 'MAX LEVEL'
                : `${currentXP.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${fillProgress}%`, backgroundColor: badgeColor }]} />
          </View>
          {!isMaxLevel && (
            <Text style={styles.xpRemaining}>
              {(xpForNextLevel - currentXP).toLocaleString()} XP to {RANK_NAMES[level + 1]}
            </Text>
          )}
        </View>

        {/* XP Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOW TO EARN XP</Text>
          <View style={styles.card}>
            {XP_SOURCES.map((source, i) => (
              <View key={source.action} style={[styles.sourceRow, i < XP_SOURCES.length - 1 && styles.sourceRowBorder]}>
                <Text style={styles.sourceAction}>{source.action}</Text>
                <Text style={styles.sourceXP}>+{source.xp} XP</Text>
              </View>
            ))}
          </View>
        </View>

        {/* All Ranks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ALL RANKS</Text>
          <View style={styles.card}>
            {RANK_NAMES.map((rankName, i) => {
              const color = getBadgeColor(i)
              const isCurrent = i === level
              const isUnlocked = i <= level
              const threshold = LEVEL_THRESHOLDS[i]

              return (
                <View
                  key={rankName}
                  style={[
                    styles.rankRow,
                    i < RANK_NAMES.length - 1 && styles.rankRowBorder,
                    isCurrent && styles.rankRowCurrent,
                  ]}
                >
                  <View style={[styles.rankDot, { backgroundColor: isUnlocked ? color : TestBg.surfaceLight }]} />
                  <View style={styles.rankInfo}>
                    <Text style={[styles.rankName, !isUnlocked && styles.rankLocked]}>
                      {rankName}
                    </Text>
                    <Text style={styles.rankThreshold}>
                      {threshold === 0 ? 'Starting rank' : `${threshold.toLocaleString()} XP`}
                    </Text>
                  </View>
                  <Text style={[styles.rankLevel, { color: isUnlocked ? color : TestBg.textDim }]}>
                    {i}
                  </Text>
                  {isCurrent && (
                    <View style={[styles.currentBadge, { borderColor: color }]}>
                      <Text style={[styles.currentBadgeText, { color }]}>YOU</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TestBg.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TestBg.border,
  },
  backButton: {
    padding: Spacing.sm,
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
  },
  content: {
    paddingBottom: Spacing.xxl,
  },

  // Hero section
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.screenPadding,
  },
  heroRing: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRingContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLevel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 36,
    lineHeight: 42,
  },
  heroRank: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: TestBg.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  xpRow: {
    marginTop: Spacing.lg,
  },
  xpText: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: TestBg.textMuted,
  },
  progressTrack: {
    width: '60%',
    height: 4,
    backgroundColor: TestBg.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  xpRemaining: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xxs,
    color: TestBg.textDim,
    marginTop: Spacing.sm,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.screenPadding,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.sm,
    color: Colors.cream,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: TestBg.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },

  // XP Sources
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sourceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: TestBg.borderSubtle,
  },
  sourceAction: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  sourceXP: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: TestBg.textMuted,
  },

  // Rank list
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  rankRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: TestBg.borderSubtle,
  },
  rankRowCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  rankDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.md,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  rankLocked: {
    color: TestBg.textDim,
  },
  rankThreshold: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xxs,
    color: TestBg.textDim,
    marginTop: 2,
  },
  rankLevel: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.md,
    marginRight: Spacing.sm,
  },
  currentBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
})
