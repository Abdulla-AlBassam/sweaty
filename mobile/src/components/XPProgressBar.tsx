import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Spacing, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { LevelInfo } from '../types'

interface XPProgressBarProps {
  levelInfo: LevelInfo
}

/**
 * Compact XP Progress Bar with RGB chromatic aberration effect
 */
export default function XPProgressBar({ levelInfo }: XPProgressBarProps) {
  const { level, rank, currentXP, xpForNextLevel, progress } = levelInfo
  const isMaxLevel = level === 11

  // Glitch state for RGB layers
  const [isGlitching, setIsGlitching] = useState(false)
  const [glitchOffset, setGlitchOffset] = useState(0)

  // Subtle glitch animation
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.15) {
        setIsGlitching(true)
        setGlitchOffset((Math.random() - 0.5) * 4)

        setTimeout(() => {
          setIsGlitching(false)
          setGlitchOffset(0)
        }, 80 + Math.random() * 60)
      }
    }, 500)

    return () => clearInterval(glitchInterval)
  }, [])

  return (
    <View style={styles.container}>
      {/* Level · Rank  ···  XP counter */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.level}>Level {level}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.rank}>{rank}</Text>
        </View>
        <Text style={styles.xpText}>
          {isMaxLevel ? `${currentXP} xp` : `${currentXP} / ${xpForNextLevel} xp`}
        </Text>
      </View>

      {/* RGB Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          {/* Cyan layer (offset left) */}
          <View
            style={[
              styles.progressFill,
              styles.progressCyan,
              {
                width: `${Math.min(progress + 1, 100)}%`,
                transform: [{ translateX: isGlitching ? -2 + glitchOffset : -1 }],
              },
            ]}
          />
          {/* Green layer (offset right) */}
          <View
            style={[
              styles.progressFill,
              styles.progressGreen,
              {
                width: `${Math.min(progress + 1, 100)}%`,
                transform: [{ translateX: isGlitching ? 2 - glitchOffset : 1 }],
              },
            ]}
          />
          {/* Pink layer (offset up) */}
          <View
            style={[
              styles.progressFill,
              styles.progressPink,
              {
                width: `${progress}%`,
                transform: [{ translateY: isGlitching ? glitchOffset * 0.5 : 0.5 }],
              },
            ]}
          />
          {/* Main white fill */}
          <View style={[styles.progressFill, styles.progressMain, { width: `${progress}%` }]} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    // No background — transparent inline element
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  level: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.text,
  },
  dot: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginHorizontal: Spacing.xs,
  },
  rank: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  progressContainer: {
    height: 6,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 1.5,
  },
  progressCyan: {
    backgroundColor: Colors.cyan,
    opacity: 0.5,
  },
  progressGreen: {
    backgroundColor: Colors.accent,
    opacity: 0.5,
  },
  progressPink: {
    backgroundColor: Colors.pink,
    opacity: 0.4,
  },
  progressMain: {
    backgroundColor: Colors.text,
  },
  xpText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.textDim,
  },
})
