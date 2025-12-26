import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { LevelInfo } from '../types'

interface XPProgressBarProps {
  levelInfo: LevelInfo
}

export default function XPProgressBar({ levelInfo }: XPProgressBarProps) {
  const { level, rank, currentXP, xpForNextLevel, progress } = levelInfo
  const isMaxLevel = level === 11

  return (
    <View style={styles.container}>
      {/* Level | Rank */}
      <View style={styles.header}>
        <Text style={styles.level}>Level {level}</Text>
        <View style={styles.separator} />
        <Text style={styles.rank}>{rank}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.startDot} />
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={[styles.endDot, isMaxLevel && styles.endDotFilled]} />
      </View>

      {/* XP Counter */}
      <Text style={styles.xpText}>
        {isMaxLevel ? `${currentXP} xp` : `${currentXP} / ${xpForNextLevel} xp`}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  level: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  separator: {
    width: 1,
    height: 14,
    backgroundColor: Colors.textDim,
    marginHorizontal: Spacing.sm,
  },
  rank: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  startDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  endDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
  },
  endDotFilled: {
    backgroundColor: Colors.accent,
  },
  xpText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
})
