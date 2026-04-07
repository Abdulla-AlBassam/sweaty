import React from 'react'
import { View, StyleSheet } from 'react-native'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, BorderRadius } from '../constants/colors'
import { GamingPlatform } from '../types'

interface PlatformBadgesProps {
  platforms: GamingPlatform[]
  size?: 'small' | 'medium' | 'large'
}

const PLATFORM_CONFIG: Record<GamingPlatform, { icon: string; library: 'fa5' | 'mci'; color: string }> = {
  playstation: { icon: 'playstation', library: 'fa5', color: Colors.platformPlayStation },
  xbox: { icon: 'xbox', library: 'fa5', color: Colors.platformXbox },
  pc: { icon: 'desktop-tower-monitor', library: 'mci', color: Colors.platformPC },
  nintendo: { icon: 'nintendo-switch', library: 'mci', color: Colors.platformNintendo },
}

const SIZE_CONFIG = {
  small: { iconSize: 12, padding: 4 },
  medium: { iconSize: 14, padding: 5 },
  large: { iconSize: 16, padding: 6 },
}

export default function PlatformBadges({ platforms, size = 'medium' }: PlatformBadgesProps) {
  if (!platforms || platforms.length === 0) return null

  const { iconSize, padding } = SIZE_CONFIG[size]

  return (
    <View style={styles.container} accessibilityLabel={`Plays on ${platforms.map(p => p === 'pc' ? 'PC' : p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}`}>
      {platforms.map((platform) => {
        const config = PLATFORM_CONFIG[platform]
        if (!config) return null

        return (
          <View
            key={platform}
            style={[
              styles.badge,
              { padding, backgroundColor: config.color }
            ]}
          >
            {config.library === 'fa5' ? (
              <FontAwesome5 name={config.icon} size={iconSize} color={Colors.textBright} />
            ) : (
              <MaterialCommunityIcons name={config.icon as any} size={iconSize} color={Colors.textBright} />
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badge: {
    borderRadius: BorderRadius.sm,
  },
})
