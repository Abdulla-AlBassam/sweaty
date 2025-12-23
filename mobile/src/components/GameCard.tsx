import React from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
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
  const coverUrl = game.cover_url || game.coverUrl
  const imageUrl = coverUrl ? getIGDBImageUrl(coverUrl, 'coverBig') : null

  const dimensions = {
    small: { width: 80, height: 107 },
    medium: { width: 100, height: 133 },
    large: { width: 120, height: 160 },
  }

  const { width, height } = dimensions[size]

  return (
    <TouchableOpacity style={[styles.container, { width }]} onPress={() => onPress(game.id)}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.cover, { width, height }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholder, { width, height }]}>
          <Text style={styles.placeholderText}>?</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>
        {game.name}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  cover: {
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  placeholder: {
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: FontSize.xxl,
    color: Colors.textDim,
  },
  title: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
})
