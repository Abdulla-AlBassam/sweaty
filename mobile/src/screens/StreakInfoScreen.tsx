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
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'

const STREAK_MILESTONES = [
  { days: 3, label: 'Warming Up' },
  { days: 7, label: 'One Week' },
  { days: 14, label: 'Two Weeks' },
  { days: 30, label: 'One Month' },
  { days: 60, label: 'Two Months' },
  { days: 100, label: 'Century' },
  { days: 180, label: 'Half a Year' },
  { days: 365, label: 'One Year' },
]

const STREAK_RULES = [
  {
    icon: 'flame' as const,
    title: 'Log something each day',
    description:
      'Any tracked action counts: logging a game, rating, reviewing, or updating your library.',
  },
  {
    icon: 'time-outline' as const,
    title: '24-hour window',
    description:
      'You have until the end of the next day to keep the streak alive. Miss it and the streak resets to 1.',
  },
  {
    icon: 'trophy-outline' as const,
    title: 'Longest streak is permanent',
    description:
      'Your longest run is saved forever, even if the current streak resets.',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'One activity a day is enough',
    description:
      'Extra activity in the same day will not add to the count. Keep it relaxed.',
  },
]

export default function StreakInfoScreen() {
  const navigation = useNavigation()
  const { profile } = useAuth()

  const currentStreak = (profile as any)?.current_streak || 0
  const longestStreak = (profile as any)?.longest_streak || 0

  const nextMilestone =
    STREAK_MILESTONES.find((m) => m.days > currentStreak) ||
    STREAK_MILESTONES[STREAK_MILESTONES.length - 1]
  const isPastAllMilestones = currentStreak >= STREAK_MILESTONES[STREAK_MILESTONES.length - 1].days
  const progress = isPastAllMilestones
    ? 100
    : Math.min(100, (currentStreak / nextMilestone.days) * 100)

  const ringSize = 168
  const ringStroke = 8
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (progress / 100) * ringCircumference

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} containerStyle={styles.backButton} haptic="light">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>STREAK</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero: Current Streak */}
        <View style={styles.heroSection}>
          <View style={styles.heroRing}>
            <Svg width={ringSize} height={ringSize}>
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke={Colors.surfaceLight}
                strokeWidth={ringStroke}
                fill="none"
              />
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke={Colors.fire}
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
              <Ionicons name="flame" size={28} color={Colors.fire} />
              <Text style={[styles.heroLevel, { color: Colors.fire }]}>{currentStreak}</Text>
              <Text style={styles.heroRank}>{currentStreak === 1 ? 'DAY' : 'DAYS'}</Text>
            </View>
          </View>

          <View style={styles.xpRow}>
            <Text style={styles.xpText}>
              {isPastAllMilestones
                ? 'LEGENDARY STREAK'
                : `${currentStreak} / ${nextMilestone.days} DAYS`}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: Colors.fire }]} />
          </View>
          {!isPastAllMilestones && (
            <Text style={styles.xpRemaining}>
              {nextMilestone.days - currentStreak} days to {nextMilestone.label}
            </Text>
          )}
          {longestStreak > 0 && (
            <Text style={styles.longestText}>
              Longest streak: <Text style={styles.longestValue}>{longestStreak}</Text>
            </Text>
          )}
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOW IT WORKS</Text>
          <View style={styles.card}>
            {STREAK_RULES.map((rule, i) => (
              <View
                key={rule.title}
                style={[styles.ruleRow, i < STREAK_RULES.length - 1 && styles.ruleRowBorder]}
              >
                <View style={styles.ruleIcon}>
                  <Ionicons name={rule.icon} size={22} color={Colors.fire} />
                </View>
                <View style={styles.ruleInfo}>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                  <Text style={styles.ruleDescription}>{rule.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MILESTONES</Text>
          <View style={styles.card}>
            {STREAK_MILESTONES.map((milestone, i) => {
              const isUnlocked = currentStreak >= milestone.days
              const isCurrent = !isUnlocked && milestone.days === nextMilestone.days

              return (
                <View
                  key={milestone.days}
                  style={[
                    styles.milestoneRow,
                    i < STREAK_MILESTONES.length - 1 && styles.milestoneRowBorder,
                    isCurrent && styles.milestoneRowCurrent,
                  ]}
                >
                  <View
                    style={[
                      styles.milestoneDot,
                      { backgroundColor: isUnlocked ? Colors.fire : Colors.surfaceLight },
                    ]}
                  />
                  <View style={styles.milestoneInfo}>
                    <Text style={[styles.milestoneName, !isUnlocked && styles.milestoneLocked]}>
                      {milestone.label}
                    </Text>
                    <Text style={styles.milestoneThreshold}>
                      {milestone.days} {milestone.days === 1 ? 'day' : 'days'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.milestoneDays,
                      { color: isUnlocked ? Colors.fire : Colors.textDim },
                    ]}
                  >
                    {milestone.days}
                  </Text>
                  {isCurrent && (
                    <View style={[styles.currentBadge, { borderColor: Colors.fire }]}>
                      <Text style={[styles.currentBadgeText, { color: Colors.fire }]}>NEXT</Text>
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    width: 44,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },

  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.screenPadding,
  },
  heroRing: {
    width: 168,
    height: 168,
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
    fontSize: 56,
    lineHeight: 62,
    marginTop: 2,
  },
  heroRank: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  xpRow: {
    marginTop: Spacing.xl,
  },
  xpText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  progressTrack: {
    width: '65%',
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpRemaining: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.md,
  },
  longestText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: Spacing.lg,
  },
  longestValue: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
  },

  section: {
    paddingHorizontal: Spacing.screenPadding,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.cream,
    letterSpacing: 1.5,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },

  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  ruleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  ruleIcon: {
    width: 36,
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  ruleDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: 6,
    lineHeight: 20,
  },

  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  milestoneRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  milestoneRowCurrent: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  milestoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.lg,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  milestoneLocked: {
    color: Colors.textDim,
  },
  milestoneThreshold: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginTop: 3,
  },
  milestoneDays: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSize.lg,
    marginRight: Spacing.md,
  },
  currentBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
})
