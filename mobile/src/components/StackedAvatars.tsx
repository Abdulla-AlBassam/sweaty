import React from 'react'
import { View, Image, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'

interface User {
  id: string
  avatar_url: string | null
  username: string
}

interface StackedAvatarsProps {
  users: User[]
  maxDisplay?: number
  size?: number
  inline?: boolean
}

export default function StackedAvatars({
  users,
  maxDisplay = 3,
  size = 24,
  inline = false,
}: StackedAvatarsProps) {
  if (users.length === 0) return null

  const displayUsers = users.slice(0, maxDisplay)
  const overlap = size * 0.3

  return (
    <View style={inline ? styles.containerInline : styles.container}>
      <View style={styles.avatarRow}>
        {/* First avatar fully visible, each next one tucked behind the previous */}
        {displayUsers.map((user, index) => (
          <View
            key={user.id}
            style={[
              styles.avatar,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginLeft: index === 0 ? 0 : -overlap,
                zIndex: displayUsers.length - index,
              },
            ]}
          >
            {user.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
                accessibilityLabel={(user.username || 'User') + ' avatar'}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={size * 0.5} color={Colors.textDim} />
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
  containerInline: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    borderWidth: 0.5,
    borderColor: Colors.textDim,
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
})
