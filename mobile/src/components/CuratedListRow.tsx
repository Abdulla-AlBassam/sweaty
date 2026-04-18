import React from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
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
    const topGame = list.games[0]
    const bannerImage = topGame?.screenshot_urls?.[0] ?? topGame?.cover_url ?? null
    navigation.dispatch(
      CommonActions.navigate({
        name: 'CuratedListDetail',
        params: {
          listSlug: list.slug,
          listTitle: list.title,
          gameIds: list.game_ids,
          listDescription: list.description,
          bannerCoverUrl: bannerImage,
        },
      })
    )
  }

  if (list.games.length === 0) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <GlitchText
            text={list.title}
            style={styles.title}
            intensity="subtle"
          />
          {list.description && (
            <Text style={styles.description} numberOfLines={1}>{list.description}</Text>
          )}
        </View>
        <PressableScale onPress={handleSeeAll} haptic="light" accessibilityLabel={'See all games in ' + list.title} accessibilityRole="button" accessibilityHint="Shows all games in this list">
          <Ionicons name="chevron-forward" size={20} color={Colors.cream} />
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
            accessibilityLabel={game.name}
            accessibilityRole="button"
            accessibilityHint="Opens game details"
          >
            {game.cover_url ? (
              <Image
                source={{ uri: getIGDBImageUrl(game.cover_url, 'coverBig') }}
                style={styles.cover}
                accessible={false}
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
    marginBottom: Spacing.xl,             // 24px between sections — more breathing room
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  seeAll: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.cream,
    lineHeight: 17,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.cardGap,                 // 12px gap between cards
  },
  gameCard: {
    width: 105,
  },
  cover: {
    width: 105,
    height: 140,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
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
