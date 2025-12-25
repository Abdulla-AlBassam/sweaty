import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'

interface StarRatingProps {
  rating: number | null
  size?: number
  color?: string
  showEmpty?: boolean
  filledOnly?: boolean // Only show filled/half stars, no empty stars
}

// Render a single star icon based on rating value
function StarIcon({
  starNumber,
  rating,
  size,
  color
}: {
  starNumber: number
  rating: number
  size: number
  color: string
}) {
  if (rating >= starNumber) {
    // Full star
    return <Ionicons name="star" size={size} color={color} />
  } else if (rating >= starNumber - 0.5) {
    // Half star
    return <Ionicons name="star-half" size={size} color={color} />
  } else {
    // Empty star
    return <Ionicons name="star-outline" size={size} color={Colors.textDim} />
  }
}

export default function StarRating({
  rating,
  size = 16,
  color = Colors.accentLight,
  showEmpty = false,
  filledOnly = false
}: StarRatingProps) {
  if (!rating && !showEmpty) {
    return null
  }

  const displayRating = rating || 0

  // If filledOnly, only render stars up to the rating
  if (filledOnly && rating) {
    const fullStars = Math.floor(rating)
    const hasHalf = rating % 1 >= 0.5
    const starsToShow = hasHalf ? fullStars + 1 : fullStars

    return (
      <View style={styles.container}>
        {Array.from({ length: starsToShow }, (_, i) => i + 1).map((starNumber) => (
          <StarIcon
            key={starNumber}
            starNumber={starNumber}
            rating={displayRating}
            size={size}
            color={color}
          />
        ))}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((starNumber) => (
        <StarIcon
          key={starNumber}
          starNumber={starNumber}
          rating={displayRating}
          size={size}
          color={color}
        />
      ))}
    </View>
  )
}

// Compact version - shows rating as single star + number
export function CompactStarRating({
  rating,
  size = 14,
  color = Colors.accent
}: Omit<StarRatingProps, 'showEmpty'>) {
  if (!rating) {
    return null
  }

  return (
    <View style={styles.compactContainer}>
      <Ionicons name="star" size={size} color={color} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})
