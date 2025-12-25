import React from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { ActivityItem as ActivityItemType, GameStatus } from '../types'
import { STATUS_LABELS, getIGDBImageUrl } from '../constants'
import StarRating from './StarRating'

interface ActivityItemProps {
  activity: ActivityItemType
  onUserPress?: (userId: string, username: string) => void
  onGamePress?: (gameId: number) => void
}

function getActionText(activity: ActivityItemType): string {
  // If there's a review, prioritize showing "reviewed"
  if (activity.review && activity.review.trim().length > 0) {
    return 'reviewed'
  }
  // Otherwise show the status verb
  return getStatusVerb(activity.status)
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getStatusVerb(status: GameStatus): string {
  switch (status) {
    case 'playing': return 'started playing'
    case 'completed': return 'completed'
    case 'played': return 'played'
    case 'want_to_play': return 'wants to play'
    case 'on_hold': return 'put on hold'
    case 'dropped': return 'dropped'
    default: return 'logged'
  }
}

export default function ActivityItem({ activity, onUserPress, onGamePress }: ActivityItemProps) {
  const { user, game, status, rating, created_at } = activity
  const displayName = user.display_name || user.username
  const coverUrl = game.cover_url ? getIGDBImageUrl(game.cover_url, 'coverBig2x') : null

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={() => onUserPress?.(user.id, user.username)}
      >
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.text}>
          <Text
            style={styles.username}
            onPress={() => onUserPress?.(user.id, user.username)}
          >
            {displayName}
          </Text>
          {' '}{getActionText(activity)}{' '}
          <Text
            style={styles.gameName}
            onPress={() => onGamePress?.(game.id)}
          >
            {game.name}
          </Text>
        </Text>

        <View style={styles.meta}>
          {rating && (
            <View style={styles.ratingContainer}>
              <StarRating rating={rating} size={12} />
            </View>
          )}
          <Text style={styles.time}>{getRelativeTime(created_at)}</Text>
        </View>
      </View>

      {coverUrl && (
        <TouchableOpacity onPress={() => onGamePress?.(game.id)}>
          <Image source={{ uri: coverUrl }} style={styles.cover} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  avatarContainer: {
    marginRight: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  text: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  username: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },
  gameName: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accentLight,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  cover: {
    width: 48,
    height: 64,
    borderRadius: BorderRadius.md,
  },
})
