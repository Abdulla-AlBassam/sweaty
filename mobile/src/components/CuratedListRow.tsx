import React from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import { CuratedListWithGames } from '../types'

interface CuratedListRowProps {
  list: CuratedListWithGames
}

export default function CuratedListRow({ list }: CuratedListRowProps) {
  const navigation = useNavigation()

  const handleGamePress = (gameId: number) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const handleSeeAll = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'CuratedListDetail',
        params: {
          listSlug: list.slug,
          listTitle: list.title,
          gameIds: list.game_ids,
        },
      })
    )
  }

  if (list.games.length === 0) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{list.title}</Text>
        <TouchableOpacity onPress={handleSeeAll}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {list.games.slice(0, 15).map((game) => (
          <TouchableOpacity
            key={`${list.slug}-${game.id}`}
            style={styles.gameCard}
            onPress={() => handleGamePress(game.id)}
            activeOpacity={0.7}
          >
            {game.cover_url ? (
              <Image
                source={{ uri: getIGDBImageUrl(game.cover_url, 'cover_big') }}
                style={styles.cover}
              />
            ) : (
              <View style={[styles.cover, styles.placeholderCover]}>
                <Text style={styles.placeholderText} numberOfLines={2}>
                  {game.name}
                </Text>
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
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  gameCard: {
    width: 105,
  },
  cover: {
    width: 105,
    height: 140,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  placeholderText: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'center',
  },
})
