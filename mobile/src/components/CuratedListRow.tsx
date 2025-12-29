import React from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import { CuratedListWithGames } from '../types'
import GlitchText from './GlitchText'
import PressableScale from './PressableScale'

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
        <GlitchText
          text={list.title}
          style={styles.title}
          intensity="subtle"
        />
        <PressableScale onPress={handleSeeAll} haptic="light">
          <Text style={styles.seeAll}>See All</Text>
        </PressableScale>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {list.games.slice(0, 15).map((game, index) => (
          <PressableScale
            key={`${list.slug}-${game.id}-${index}`}
            style={styles.gameCard}
            onPress={() => handleGamePress(game.id)}
            haptic="light"
            scale={0.9}
          >
            {game.cover_url ? (
              <Image
                source={{ uri: getIGDBImageUrl(game.cover_url, 'coverBig') }}
                style={styles.cover}
              />
            ) : (
              <View style={[styles.cover, styles.placeholderCover]}>
                <Text style={styles.placeholderText} numberOfLines={2}>
                  {game.name}
                </Text>
              </View>
            )}
          </PressableScale>
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
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seeAll: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.xs,
    color: Colors.textGreen,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'center',
  },
})
