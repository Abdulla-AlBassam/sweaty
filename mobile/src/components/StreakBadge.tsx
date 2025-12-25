import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { AntDesign } from '@expo/vector-icons'
import { Colors } from '../constants/colors'

interface StreakBadgeProps {
  streak: number
  size?: 'small' | 'medium' | 'large'
}

export default function StreakBadge({ streak, size = 'medium' }: StreakBadgeProps) {
  // Don't show if no streak
  if (streak <= 0) return null

  const sizeConfig = {
    small: { iconSize: 14, fontSize: 12, gap: 2 },
    medium: { iconSize: 18, fontSize: 14, gap: 4 },
    large: { iconSize: 24, fontSize: 18, gap: 6 },
  }

  const config = sizeConfig[size]

  // Color based on streak length
  const getFireColor = () => {
    if (streak >= 100) return '#FF4500' // Red-orange for 100+
    if (streak >= 30) return '#FF6B35'  // Orange for 30+
    if (streak >= 7) return '#FFA500'   // Yellow-orange for 7+
    return '#FFD700' // Gold for starting streaks
  }

  return (
    <View style={[styles.container, { gap: config.gap }]}>
      <AntDesign name="fire" size={config.iconSize} color={getFireColor()} />
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
    fontWeight: '600',
  },
})
