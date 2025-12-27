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

export default function ListCard({ list, onPress, showUser = true }: ListCardProps) {
  const previewGames = list.preview_games || []
  const itemCount = list.item_count || 0

  // Calculate how many covers to show (up to 3)
  const coversToShow = previewGames.slice(0, 3).reverse() // Reverse so first game is on top

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      {/* Stacked game covers - same size as curated list covers */}
      <View style={styles.coversContainer}>
        {coversToShow.length > 0 ? (
          coversToShow.map((game, index) => (
            <View
              key={game.id}
              style={[
                styles.coverWrapper,
                {
                  left: index * 28, // Overlap amount
                  zIndex: index + 1, // Higher index = on top
                },
              ]}
            >
              <Image
                source={{ uri: getIGDBImageUrl(game.cover_url, 'coverBig') || undefined }}
                style={styles.coverImage}
              />
            </View>
          ))
        ) : (
          <View style={styles.emptyCover}>
            <Ionicons name="list" size={32} color={Colors.textDim} />
          </View>
        )}
      </View>

      {/* List info */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {list.title}
          </Text>
          {!list.is_public && (
            <Ionicons name="lock-closed" size={14} color={Colors.textMuted} style={styles.lockIcon} />
          )}
        </View>
        <Text style={styles.gameCount}>
          {itemCount} {itemCount === 1 ? 'game' : 'games'}
        </Text>

        {/* User info */}
        {showUser && list.user && (
          <View style={styles.userRow}>
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
          </View>
        )}
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={Colors.textDim} />
    </TouchableOpacity>
  )
}

// Same size as curated list covers
const COVER_WIDTH = 105
const COVER_HEIGHT = 140
const COVER_OVERLAP = 28 // How much each cover overlaps the previous

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  coversContainer: {
    width: COVER_WIDTH + (COVER_OVERLAP * 2), // Width for 3 stacked covers
    height: COVER_HEIGHT,
    position: 'relative',
    marginRight: Spacing.md,
  },
  coverWrapper: {
    position: 'absolute',
    top: 0,
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.surface,
    backgroundColor: Colors.surfaceLight,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  emptyCover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    flex: 1,
  },
  lockIcon: {
    marginLeft: Spacing.xs,
  },
  gameCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
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
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    flex: 1,
  },
})
