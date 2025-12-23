import React from 'react'
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'

interface Game {
  id: number
  name: string
  cover_url?: string | null
  coverUrl?: string | null
}

interface HorizontalGameListProps {
  games: Game[]
  onGamePress: (game: Game) => void
  isLoading?: boolean
}

const COVER_WIDTH = 110
const COVER_HEIGHT = Math.round(COVER_WIDTH * (4 / 3))

export default function HorizontalGameList({
  games,
  onGamePress,
  isLoading = false,
}: HorizontalGameListProps) {
  const getCoverUrl = (game: Game) => {
    const url = game.cover_url || game.coverUrl
    return url ? getIGDBImageUrl(url, 'coverBig2x') : null
  }

  if (isLoading) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <View style={styles.skeletonCover}>
              <ActivityIndicator size="small" color={Colors.textDim} />
            </View>
          </View>
        ))}
      </ScrollView>
    )
  }

  if (games.length === 0) {
    return null
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {games.map((game) => {
        const coverUrl = getCoverUrl(game)
        return (
          <TouchableOpacity
            key={game.id}
            style={styles.gameItem}
            onPress={() => onGamePress(game)}
            activeOpacity={0.7}
          >
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons
                  name="game-controller-outline"
                  size={24}
                  color={Colors.textDim}
                />
              </View>
            )}
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  gameItem: {
    width: COVER_WIDTH,
  },
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonItem: {
    width: COVER_WIDTH,
  },
  skeletonCover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
