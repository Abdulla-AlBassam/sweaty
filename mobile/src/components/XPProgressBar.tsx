import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { LevelInfo } from '../types'

interface XPProgressBarProps {
  levelInfo: LevelInfo
}

/**
 * XP Progress Bar with RGB chromatic aberration effect
 * Features layered progress bars in cyan/green/pink that glitch
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
      {/* Level | Rank */}
      <View style={styles.header}>
        <Text style={styles.level}>Level {level}</Text>
        <View style={styles.separator} />
        <Text style={styles.rank}>{rank}</Text>
      </View>

      {/* RGB Progress Bar */}
      <View style={styles.progressContainer}>
        {/* Start dot with RGB effect */}
        <View style={styles.dotContainer}>
          <View style={[styles.dotLayer, styles.dotCyan, isGlitching && { transform: [{ translateX: -1 + glitchOffset * 0.3 }] }]} />
          <View style={[styles.dotLayer, styles.dotGreen, isGlitching && { transform: [{ translateX: 1 - glitchOffset * 0.3 }] }]} />
          <View style={[styles.dotLayer, styles.dotPink, isGlitching && { transform: [{ translateY: glitchOffset * 0.2 }] }]} />
          <View style={styles.startDot} />
        </View>

        {/* Progress track with RGB layers */}
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

        {/* End dot */}
        <View style={styles.dotContainer}>
          <View style={[styles.dotLayer, isMaxLevel ? styles.dotCyan : styles.dotDim]} />
          <View style={[styles.endDot, isMaxLevel && styles.endDotFilled]} />
        </View>
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
    padding: Spacing.lg,
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
    height: 12,
  },
  // Dot container for layered effect
  dotContainer: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotLayer: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotCyan: {
    backgroundColor: Colors.cyan,
    opacity: 0.5,
  },
  dotGreen: {
    backgroundColor: Colors.accent,
    opacity: 0.5,
  },
  dotPink: {
    backgroundColor: Colors.pink,
    opacity: 0.4,
  },
  dotDim: {
    backgroundColor: Colors.surfaceLight,
  },
  startDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.text,
  },
  endDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
  },
  endDotFilled: {
    backgroundColor: Colors.text,
  },
  // Progress track with layers
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: 4,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 2,
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
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
})
