import React from 'react'
import { View, Image, Text, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'
import { Fonts } from '../constants/fonts'

interface User {
  id: string
  avatar_url: string | null
  username: string
}

interface StackedAvatarsProps {
  users: User[]
  maxDisplay?: number
  size?: number
}

export default function StackedAvatars({
  users,
  maxDisplay = 3,
  size = 24,
}: StackedAvatarsProps) {
  if (users.length === 0) return null

  const displayUsers = users.slice(0, maxDisplay)
  const extraCount = users.length - maxDisplay
  const overlap = size * 0.4 // 40% overlap

  return (
    <View style={styles.container}>
      {/* Use row-reverse so first user appears on top */}
      <View style={[styles.avatarRow, { flexDirection: 'row-reverse' }]}>
        {/* Extra count badge */}
        {extraCount > 0 && (
          <View
            style={[
              styles.avatar,
              styles.extraBadge,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginLeft: 0,
              },
            ]}
          >
            <Text style={[styles.extraText, { fontSize: size * 0.45 }]}>
              +{extraCount}
            </Text>
          </View>
        )}

        {/* Avatar images (reversed for proper stacking) */}
        {displayUsers.reverse().map((user, index) => (
          <View
            key={user.id}
            style={[
              styles.avatar,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginLeft: index === 0 && extraCount === 0 ? 0 : -overlap,
              },
            ]}
          >
            {user.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={[
                  styles.avatarImage,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                  },
                ]}
                accessibilityLabel={user.username + ' avatar'}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={[styles.placeholderText, { fontSize: size * 0.45, lineHeight: size * 0.5 }]}>
                  {user.username[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    borderWidth: 2,
    borderColor: Colors.borderBright,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: Fonts.bodyBold,
    color: Colors.accent,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  extraBadge: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraText: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },
})
