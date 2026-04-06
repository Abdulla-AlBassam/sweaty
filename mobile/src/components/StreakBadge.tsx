import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { AntDesign } from '@expo/vector-icons'
import { Colors, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'

interface StreakBadgeProps {
  streak: number
  size?: 'small' | 'medium' | 'large'
}

export default function StreakBadge({ streak, size = 'medium' }: StreakBadgeProps) {
  // Don't show if no streak
  if (streak <= 0) return null

  const sizeConfig = {
    small: { iconSize: 14, fontSize: FontSize.xs, gap: 2 },
    medium: { iconSize: 18, fontSize: FontSize.sm, gap: 4 },
    large: { iconSize: 24, fontSize: FontSize.lg, gap: 6 },
  }

  const config = sizeConfig[size]

  return (
    <View style={[styles.container, { gap: config.gap }]} accessibilityLabel={`${streak} day streak`}>
      <AntDesign name="fire" size={config.iconSize} color={Colors.fire} />
      <Text style={[styles.text, { fontSize: config.fontSize }]}>{streak}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: Colors.text,
    fontFamily: Fonts.bodySemiBold,
  },
})
