import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors'
import { LevelInfo } from '../types'

interface XPProgressBarProps {
  type: 'gamer' | 'social'
  levelInfo: LevelInfo
}

export default function XPProgressBar({ type, levelInfo }: XPProgressBarProps) {
  const { level, rank, currentXP, xpForNextLevel, progress } = levelInfo
  const isMaxLevel = level === 10

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Text style={styles.type}>{type === 'gamer' ? 'Gamer' : 'Social'}</Text>
          <Text style={styles.level}>Lv. {level}</Text>
        </View>
        <Text style={styles.rank}>{rank}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.xpText}>
          {isMaxLevel ? 'MAX' : `${currentXP} / ${xpForNextLevel} XP`}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  type: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  level: {
    fontSize: FontSize.sm,
    fontWeight: 'bold',
    color: Colors.accentLight,
  },
  rank: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  progressContainer: {
    gap: Spacing.xs,
  },
  progressBackground: {
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
  },
  xpText: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'right',
  },
})
