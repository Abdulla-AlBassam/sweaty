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
import { GameListWithUser } from '../types'
import PressableScale from './PressableScale'
import { Ionicons } from '@expo/vector-icons'

interface UserListRowProps {
  list: GameListWithUser
  hideOwner?: boolean
  maxGames?: number
}

export default function UserListRow({ list, hideOwner = false, maxGames = 15 }: UserListRowProps) {
  const navigation = useNavigation()

  const handleGamePress = (gameId: number) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const handleListPress = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ListDetail',
        params: { listId: list.id },
      })
    )
  }

  const handleUserPress = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'UserProfile',
        params: { username: list.user.username },
      })
    )
  }

  const games = list.preview_games || []
  if (games.length === 0) return null

  const hasDescription = !!list.description

  return (
    <View style={styles.container}>
      <View style={[styles.header, !hasDescription && styles.headerFlush]}>
        <PressableScale
          containerStyle={styles.headerLeft}
          onPress={handleListPress}
          haptic="light"
          scale={0.98}
          accessibilityLabel={list.title + ' list'}
          accessibilityRole="button"
          accessibilityHint="Opens list details"
        >
          <Text style={styles.title} numberOfLines={1}>{list.title}</Text>
          {hasDescription && (
            <Text style={styles.description} numberOfLines={1}>{list.description}</Text>
          )}
        </PressableScale>
        <View style={styles.rightCluster}>
          {!hideOwner && (
            <PressableScale
              style={styles.userInfo}
              onPress={handleUserPress}
              haptic="light"
              accessibilityLabel={'View ' + list.user.username + ' profile'}
              accessibilityRole="button"
            >
              {list.user.avatar_url ? (
                <Image
                  source={{ uri: list.user.avatar_url }}
                  style={styles.avatar}
                  accessibilityLabel={list.user.username + ' avatar'}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={10} color={Colors.textDim} />
                </View>
              )}
              <Text style={styles.username} numberOfLines={1}>@{list.user.username}</Text>
            </PressableScale>
          )}
          <PressableScale
            onPress={handleListPress}
            haptic="light"
            accessibilityLabel={'See all games in ' + list.title}
            accessibilityRole="button"
            accessibilityHint="Opens list details"
          >
            <Ionicons name="chevron-forward" size={20} color={Colors.cream} />
          </PressableScale>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {games.slice(0, maxGames).map((game, index) => (
          <PressableScale
            key={`${list.id}-${game.id}-${index}`}
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
                accessibilityLabel={game.name + ' cover art'}
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
    marginBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.xl,
  },
  headerFlush: {
    marginBottom: Spacing.sm,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 20,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    maxWidth: 100,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.cardGap,
  },
  gameCard: {
    width: 105,
  },
  cover: {
    width: 105,
    height: 140,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
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
