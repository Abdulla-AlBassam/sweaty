import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Colors, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { LevelInfo } from '../types'
import { getBadgeColor } from '../lib/xp'

interface XPProgressBarProps {
  levelInfo: LevelInfo
  /** Compact ring for profile stats row (no XP text) */
  variant?: 'ring' | 'detailed'
}

export default function XPProgressBar({ levelInfo, variant = 'ring' }: XPProgressBarProps) {
  const { level, rank, currentXP, xpForNextLevel, progress } = levelInfo
  const isMaxLevel = level === 15
  const badgeColor = getBadgeColor(level)
  const fillProgress = isMaxLevel ? 100 : progress

  if (variant === 'detailed') {
    // Full detail view for Settings page
    return (
      <View style={styles.detailedContainer} accessibilityLabel={`${rank}, level ${level}, ${currentXP.toLocaleString()} of ${xpForNextLevel.toLocaleString()} XP`}>
        <View style={styles.detailedRow}>
          <Text style={styles.detailedRank}>{rank}</Text>
          <Text style={styles.detailedXP}>
            {isMaxLevel ? 'MAX LEVEL' : `${currentXP.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`}
          </Text>
        </View>
        <View style={styles.detailedTrack}>
          <View style={[styles.detailedFill, { width: `${fillProgress}%`, backgroundColor: badgeColor }]} />
        </View>
        <Text style={styles.detailedLevel}>Level {level} of 15</Text>
      </View>
    )
  }

  // Ring variant for profile
  const size = 72
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (fillProgress / 100) * circumference

  return (
    <View style={styles.ringContainer} accessibilityLabel={`Level ${level}, ${rank}`}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.surfaceLight || '#2a2a2e'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Fill */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={badgeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringContent}>
        <Text style={[styles.ringLevel, { color: badgeColor }]}>{level}</Text>
        <Text style={styles.ringRank} numberOfLines={1}>{rank}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // ── Ring variant (profile) ──────────────────────
  ringContainer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  ringContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLevel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    lineHeight: 24,
  },
  ringRank: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.textDim,
    lineHeight: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    maxWidth: 56,
    textAlign: 'center',
  },

  // ── Detailed variant (settings) ─────────────────
  detailedContainer: {
    gap: 8,
  },
  detailedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailedRank: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  detailedXP: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xxs,
    color: Colors.textDim,
  },
  detailedTrack: {
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  detailedFill: {
    height: '100%',
    borderRadius: 2,
  },
  detailedLevel: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xxs,
    color: Colors.textDim,
  },
})
