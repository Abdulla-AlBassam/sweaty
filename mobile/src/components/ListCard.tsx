import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'

interface ListCardProps {
  list: {
    id: string
    title: string
    description?: string | null
    is_public: boolean
    user?: {
      id?: string
      username: string
      display_name: string | null
      avatar_url: string | null
    }
    item_count?: number
    preview_games?: Array<{
      id: number
      name: string
      cover_url: string | null
    }>
  }
  onPress: () => void
  showUser?: boolean
}

// Smaller covers for overlapping display
const COVER_WIDTH = 80
const COVER_HEIGHT = 107
const COVER_OVERLAP = 50 // ~60% of width visible per cover
const MAX_COVERS = 5

export default function ListCard({ list, onPress, showUser = false }: ListCardProps) {
  const previewGames = list.preview_games || []

  // Show up to 5 covers, reversed so first game is on top
  const coversToShow = previewGames.slice(0, MAX_COVERS).reverse()

  // Calculate container width based on number of covers
  const containerWidth = coversToShow.length > 0
    ? COVER_WIDTH + (COVER_OVERLAP * (coversToShow.length - 1))
    : COVER_WIDTH

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      {/* Header: Avatar + Username • Title OR just Title */}
      <View style={styles.header}>
        {showUser && list.user ? (
          <View style={styles.userHeader}>
            {list.user.avatar_url ? (
              <Image source={{ uri: list.user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {(list.user.display_name || list.user.username)[0].toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.username} numberOfLines={1}>
              {list.user.display_name || list.user.username}
            </Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.title} numberOfLines={1}>
              {list.title}
            </Text>
            {!list.is_public && (
              <Ionicons name="lock-closed" size={12} color={Colors.textDim} style={styles.lockIcon} />
            )}
          </View>
        ) : (
          <View style={styles.titleHeader}>
            <Text style={styles.titleOnly} numberOfLines={1}>
              {list.title}
            </Text>
            {!list.is_public && (
              <Ionicons name="lock-closed" size={12} color={Colors.textDim} style={styles.lockIcon} />
            )}
          </View>
        )}
      </View>

      {/* Overlapping game covers */}
      <View style={[styles.coversContainer, { width: containerWidth }]}>
        {coversToShow.map((game, index) => (
          <View
            key={`${game.id}-${index}`}
            style={[
              styles.coverWrapper,
              {
                left: index * COVER_OVERLAP,
                zIndex: index + 1,
              },
            ]}
          >
            <Image
              source={{ uri: getIGDBImageUrl(game.cover_url, 'coverBig') || undefined }}
              style={styles.coverImage}
            />
          </View>
        ))}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginRight: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: Spacing.xs,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.textMuted,
  },
  username: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text,
    maxWidth: 80,
  },
  separator: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textDim,
    marginHorizontal: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    flex: 1,
    maxWidth: 100,
  },
  titleOnly: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  lockIcon: {
    marginLeft: Spacing.xs,
  },
  coversContainer: {
    height: COVER_HEIGHT,
    position: 'relative',
  },
  coverWrapper: {
    position: 'absolute',
    top: 0,
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
})
