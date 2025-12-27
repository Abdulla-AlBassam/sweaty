import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, RouteProp, CommonActions, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl } from '../constants'
import { MainStackParamList } from '../navigation'
import { useAuth } from '../contexts/AuthContext'
import { useListDetail, removeGameFromList, deleteList } from '../hooks/useLists'

type ListDetailRouteProp = RouteProp<MainStackParamList, 'ListDetail'>

export default function ListDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute<ListDetailRouteProp>()
  const { listId } = route.params
  const { user } = useAuth()

  const { list, isLoading, error, refetch } = useListDetail(listId)
  const [isDeleting, setIsDeleting] = useState(false)

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  const isOwner = user && list && user.id === list.user_id

  const handleGamePress = (gameId: number) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const handleGameLongPress = (gameId: number, gameName: string) => {
    if (!isOwner) return

    Alert.alert(
      'Remove Game',
      `Remove "${gameName}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeGameFromList(listId, gameId)
            if (error) {
              Alert.alert('Error', error)
            } else {
              refetch()
            }
          },
        },
      ]
    )
  }

  const handleDeleteList = () => {
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list?.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            const { error } = await deleteList(listId)
            setIsDeleting(false)
            if (error) {
              Alert.alert('Error', error)
            } else {
              navigation.goBack()
            }
          },
        },
      ]
    )
  }

  const handleEditList = () => {
    // TODO: Navigate to edit list screen or show edit modal
    Alert.alert('Coming Soon', 'Edit list functionality coming soon!')
  }

  const renderGame = ({ item }: { item: typeof list.items[0] }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => handleGamePress(item.game.id)}
      onLongPress={() => handleGameLongPress(item.game.id, item.game.name)}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      {item.game.cover_url ? (
        <Image
          source={{ uri: getIGDBImageUrl(item.game.cover_url, 'coverBig') }}
          style={styles.cover}
        />
      ) : (
        <View style={[styles.cover, styles.placeholderCover]}>
          <Text style={styles.placeholderText} numberOfLines={2}>
            {item.game.name}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )

  const renderHeader = () => {
    if (!list) return null

    return (
      <View style={styles.listInfo}>
        {/* Description */}
        {list.description && (
          <Text style={styles.description}>{list.description}</Text>
        )}

        {/* Privacy indicator */}
        {!list.is_public && (
          <View style={styles.privateTag}>
            <Ionicons name="lock-closed" size={12} color={Colors.textMuted} />
            <Text style={styles.privateText}>Private list</Text>
          </View>
        )}

        {/* Game count */}
        <Text style={styles.gameCount}>
          {list.item_count} {list.item_count === 1 ? 'game' : 'games'}
        </Text>

        {/* Long press hint for owners */}
        {isOwner && list.items.length > 0 && (
          <Text style={styles.hint}>Long press a game to remove it</Text>
        )}
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="game-controller-outline" size={48} color={Colors.textDim} />
      <Text style={styles.emptyText}>This list is empty</Text>
      <Text style={styles.emptySubtext}>
        {isOwner
          ? 'Add games from any game detail page'
          : 'No games have been added yet'}
      </Text>
    </View>
  )

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>List</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={styles.retryButton}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {list?.title || 'List'}
        </Text>

        {isOwner ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleEditList}
            >
              <Ionicons name="pencil" size={20} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleDeleteList}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : list?.items.length === 0 ? (
        <>
          {renderHeader()}
          {renderEmpty()}
        </>
      ) : (
        <FlatList
          data={list?.items || []}
          renderItem={renderGame}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerSpacer: {
    width: 40,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.accent,
  },
  listInfo: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  privateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  privateText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  gameCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: FontSize.xs,
    color: Colors.textDim,
    marginTop: Spacing.sm,
  },
  gridContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  row: {
    justifyContent: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  gameCard: {
    width: '30%',
  },
  cover: {
    width: '100%',
    aspectRatio: 3 / 4,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
})
