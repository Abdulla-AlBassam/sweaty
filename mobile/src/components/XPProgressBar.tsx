import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { LevelInfo } from '../types'
import { getBadgeColor } from '../lib/xp'

interface XPProgressBarProps {
  levelInfo: LevelInfo
}

export default function XPProgressBar({ levelInfo }: XPProgressBarProps) {
  const { level, rank, currentXP, xpForNextLevel, progress } = levelInfo
  const isMaxLevel = level === 11
  const badgeColor = getBadgeColor(level)

  return (
    <View style={styles.container}>
      {/* Rank + XP */}
      <View style={styles.row}>
        <Text style={styles.rank}>{rank}</Text>
        <Text style={styles.xpText}>
          {isMaxLevel ? 'MAX' : `${currentXP.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${isMaxLevel ? 100 : progress}%`,
              backgroundColor: badgeColor,
            },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rank: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  xpText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textDim,
  },
  track: {
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
})
