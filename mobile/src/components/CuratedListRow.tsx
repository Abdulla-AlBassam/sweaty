import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { getIGDBImageUrl } from '../constants'
import { CuratedListWithGames } from '../types'

interface CuratedListRowProps {
  list: CuratedListWithGames
  onGamePress: (gameId: number) => void
  onSeeAllPress: (list: CuratedListWithGames) => void
}

const POSTER_WIDTH = 105
const POSTER_ASPECT_RATIO = 3 / 4

export default function CuratedListRow({
  list,
  onGamePress,
  onSeeAllPress,
}: CuratedListRowProps) {
  if (list.games.length === 0) {
    return null
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{list.title}</Text>
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={() => onSeeAllPress(list)}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Games scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gamesContainer}
      >
        {list.games.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={styles.gameCard}
            onPress={() => onGamePress(game.id)}
            activeOpacity={0.8}
          >
            {game.cover_url ? (
              <Image
                source={{ uri: getIGDBImageUrl(game.cover_url) }}
                style={styles.gameCover}
              />
            ) : (
              <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
                <Ionicons
                  name="game-controller-outline"
                  size={24}
                  color={Colors.textDim}
                />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  gamesContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  gameCard: {
    width: POSTER_WIDTH,
    aspectRatio: POSTER_ASPECT_RATIO,
  },
  gameCover: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  gameCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
