import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Fonts } from '../constants/fonts'
import { BorderRadius } from '../constants/colors'

interface EsrbBadgeProps {
  rating: string
  size?: number
}

// RAWG esrb_rating.name -> ESRB display fields
// Renders a stylised ESRB rating mark (black square, big letter, descriptor
// underneath) using RN primitives rather than hotlinked official assets.
const RATING_MAP: Record<string, { letter: string; label: string }> = {
  everyone: { letter: 'E', label: 'EVERYONE' },
  'everyone 10+': { letter: 'E10+', label: 'EVERYONE 10+' },
  teen: { letter: 'T', label: 'TEEN' },
  mature: { letter: 'M', label: 'MATURE 17+' },
  'adults only': { letter: 'AO', label: 'ADULTS ONLY 18+' },
  'rating pending': { letter: 'RP', label: 'RATING PENDING' },
}

function resolveRating(rating: string) {
  const key = rating.trim().toLowerCase()
  return (
    RATING_MAP[key] ?? {
      letter: rating.charAt(0).toUpperCase(),
      label: rating.toUpperCase(),
    }
  )
}

export default function EsrbBadge({ rating, size = 40 }: EsrbBadgeProps) {
  const { letter, label } = resolveRating(rating)

  // Scale internal typography off the outer size so a single prop controls the whole badge
  const letterSize = Math.round(size * 0.42)
  const labelSize = Math.max(6, Math.round(size * 0.12))
  const padding = Math.round(size * 0.1)

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          paddingHorizontal: padding,
          paddingVertical: padding,
          borderRadius: BorderRadius.xs,
        },
      ]}
      accessibilityLabel={`ESRB rating ${label}`}
      accessibilityRole="image"
    >
      <Text
        style={[
          styles.letter,
          { fontSize: letterSize, lineHeight: letterSize * 1.05 },
        ]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {letter}
      </Text>
      <Text
        style={[
          styles.label,
          { fontSize: labelSize, lineHeight: labelSize * 1.1 },
        ]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: Fonts.display,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: 2,
  },
})
