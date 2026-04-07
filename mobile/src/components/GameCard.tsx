import React, { useState } from 'react'
import { View, Image, StyleSheet } from 'react-native'
import LoadingSpinner from './LoadingSpinner'
import SweatDropIcon from './SweatDropIcon'
import { Colors, Spacing, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'
import PressableScale from './PressableScale'

interface GameCardProps {
  game: {
    id: number
    name: string
    cover_url?: string | null
    coverUrl?: string | null
  }
  onPress: (gameId: number) => void
  size?: 'small' | 'medium' | 'large'
}

export default function GameCard({ game, onPress, size = 'medium' }: GameCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const coverUrl = game.cover_url || game.coverUrl
  const imageUrl = coverUrl ? getIGDBImageUrl(coverUrl, 'coverBig2x') : null

  const dimensions = {
    small: { width: 80, height: 107 },
    medium: { width: 100, height: 133 },
    large: { width: 120, height: 160 },
  }

  const { width, height } = dimensions[size]

  const handlePress = () => {
    onPress(game.id)
  }

  const showPlaceholder = !imageUrl || imageError

  return (
    <PressableScale
      style={[styles.container, { width }]}
      onPress={handlePress}
      haptic="light"
      scale={0.9}
      accessibilityLabel={game.name}
      accessibilityRole="button"
      accessibilityHint="Opens game details"
    >
      {showPlaceholder ? (
        <View style={[styles.placeholder, { width, height }]}>
          <SweatDropIcon size={24} variant="static" />
        </View>
      ) : (
        <View style={[styles.imageContainer, { width, height }]}>
          <Image
            source={{ uri: imageUrl }}
            style={[styles.cover, { width, height }]}
            resizeMode="cover"
            accessibilityLabel={game.name + ' cover art'}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true)
              setImageLoading(false)
            }}
          />
          {imageLoading && (
            <View style={[styles.loadingOverlay, { width, height }]}>
              <LoadingSpinner size="small" color={Colors.textDim} />
            </View>
          )}
        </View>
      )}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  imageContainer: {
    position: 'relative',
  },
  cover: {
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
