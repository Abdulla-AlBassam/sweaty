import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import PressableScale from '../components/PressableScale'
import UserListRow from '../components/UserListRow'
import CreateListModal from '../components/CreateListModal'
import LoadingSpinner from '../components/LoadingSpinner'
import SweatDropIcon from '../components/SweatDropIcon'
import { useAuth } from '../contexts/AuthContext'
import { useUserLists } from '../hooks/useLists'
import { Colors, Spacing, FontSize } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import type { MainStackParamList } from '../navigation'
import type { GameListWithUser } from '../types'

type RouteProps = RouteProp<MainStackParamList, 'UserLists'>

export default function UserListsScreen() {
  const navigation = useNavigation()
  const route = useRoute<RouteProps>()
  const { userId } = route.params
  const { user } = useAuth()
  const isOwnProfile = user?.id === userId

  const { lists, isLoading, refetch } = useUserLists(userId, 10)
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)

  const visibleLists = useMemo(() => {
    return lists.filter((list) => {
      if ((list.preview_games || []).length === 0) return false
      if (!isOwnProfile && !list.is_public) return false
      return true
    })
  }, [lists, isOwnProfile])

  const renderItem = ({ item }: { item: GameListWithUser }) => (
    <UserListRow list={item} hideOwner maxGames={10} />
  )

  const handleListCreated = () => {
    refetch()
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <PressableScale
          onPress={() => navigation.goBack()}
          containerStyle={styles.iconButton}
          haptic="light"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>LISTS</Text>
        {isOwnProfile ? (
          <PressableScale
            onPress={() => setIsCreateModalVisible(true)}
            containerStyle={styles.iconButton}
            haptic="light"
            accessibilityLabel="Create new list"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={24} color={Colors.text} />
          </PressableScale>
        ) : (
          <View style={styles.iconButton} />
        )}
      </View>

      <FlatList
        data={visibleLists}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && visibleLists.length > 0}
            onRefresh={refetch}
            tintColor={Colors.cream}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={Colors.textMuted} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <SweatDropIcon size={40} variant="static" />
              <Text style={styles.emptyTitle}>
                {isOwnProfile ? 'No lists yet' : 'No public lists'}
              </Text>
              <Text style={styles.emptyText}>
                {isOwnProfile
                  ? 'Create a list to collect games you love, want to play, or want to share.'
                  : 'This user hasn\u2019t shared any lists yet.'}
              </Text>
            </View>
          )
        }
      />

      {isOwnProfile && (
        <CreateListModal
          visible={isCreateModalVisible}
          onClose={() => setIsCreateModalVisible(false)}
          onCreated={handleListCreated}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconButton: {
    padding: Spacing.sm,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  listContent: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    paddingTop: Spacing.xxxl * 2,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
})
