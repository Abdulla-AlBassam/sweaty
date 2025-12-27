import React, { useState } from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import LoadingSpinner from './LoadingSpinner'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'

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
    <TouchableOpacity
      style={[styles.container, { width }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {showPlaceholder ? (
        <View style={[styles.placeholder, { width, height }]}>
          <Ionicons name="game-controller-outline" size={24} color={Colors.textDim} />
        </View>
      ) : (
        <View style={[styles.imageContainer, { width, height }]}>
          <Image
            source={{ uri: imageUrl }}
            style={[styles.cover, { width, height }]}
            resizeMode="cover"
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
    </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
})
