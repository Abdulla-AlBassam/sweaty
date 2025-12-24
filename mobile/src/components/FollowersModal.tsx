import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface FollowersModalProps {
  visible: boolean
  onClose: () => void
  userId: string
  type: 'followers' | 'following'
}

export default function FollowersModal({
  visible,
  onClose,
  userId,
  type,
}: FollowersModalProps) {
  const { user } = useAuth()
  const navigation = useNavigation()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loadingFollow, setLoadingFollow] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    fetchUsers()
  }, [visible, userId, type])

  const fetchUsers = async () => {
    setIsLoading(true)

    try {
      if (type === 'followers') {
        // Get users who follow this profile
        const { data, error } = await supabase
          .from('follows')
          .select(`
            follower:profiles!follows_follower_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('following_id', userId)

        if (!error && data) {
          const userList = data
            .map((row: any) => row.follower)
            .filter((p: any): p is UserProfile => p !== null)
          setUsers(userList)
        }
      } else {
        // Get users this profile follows
        const { data, error } = await supabase
          .from('follows')
          .select(`
            following:profiles!follows_following_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('follower_id', userId)

        if (!error && data) {
          const userList = data
            .map((row: any) => row.following)
            .filter((p: any): p is UserProfile => p !== null)
          setUsers(userList)
        }
      }

      // Get who the current user is following (to show correct button state)
      if (user) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)

        if (followingData) {
          setFollowingIds(new Set(followingData.map((f) => f.following_id)))
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async (targetUserId: string) => {
    if (!user) return

    setLoadingFollow(targetUserId)

    try {
      if (followingIds.has(targetUserId)) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)

        setFollowingIds((prev) => {
          const next = new Set(prev)
          next.delete(targetUserId)
          return next
        })
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          })

        setFollowingIds((prev) => new Set(prev).add(targetUserId))
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setLoadingFollow(null)
    }
  }

  const handleUserPress = (userProfile: UserProfile) => {
    onClose()
    // Small delay to let modal close first
    setTimeout(() => {
      if (user && userProfile.id === user.id) {
        // Navigate to own profile tab
        navigation.dispatch(
          CommonActions.navigate({
            name: 'MainTabs',
            params: { screen: 'Profile' },
          })
        )
      } else {
        navigation.dispatch(
          CommonActions.navigate({
            name: 'UserProfile',
            params: { username: userProfile.username, userId: userProfile.id },
          })
        )
      }
    }, 100)
  }

  const renderUser = ({ item }: { item: UserProfile }) => {
    const isFollowing = followingIds.has(item.id)
    const isCurrentUser = user?.id === item.id
    const isLoadingThis = loadingFollow === item.id

    return (
      <TouchableOpacity
        style={styles.userRow}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {(item.display_name || item.username)[0].toUpperCase()}
            </Text>
          </View>
        )}

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.displayName} numberOfLines={1}>
            {item.display_name || item.username}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{item.username}
          </Text>
        </View>

        {/* Follow Button (don't show for self) */}
        {user && !isCurrentUser && (
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={() => handleFollow(item.id)}
            disabled={isLoadingThis}
          >
            {isLoadingThis ? (
              <ActivityIndicator
                size="small"
                color={isFollowing ? Colors.text : Colors.background}
              />
            ) : (
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText,
                ]}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {type === 'followers' ? 'Followers' : 'Following'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.accent} />
          </View>
        ) : users.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={64} color={Colors.textDim} />
            <Text style={styles.emptyText}>
              {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: Spacing.md,
    padding: Spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  listContent: {
    padding: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 60,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.accentLight,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  displayName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  username: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  followButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 90,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  followButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.background,
  },
  followingButtonText: {
    color: Colors.text,
  },
})
