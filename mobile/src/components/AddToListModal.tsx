import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { useAuth } from '../contexts/AuthContext'
import { useUserLists, addGameToList, removeGameFromList } from '../hooks/useLists'
import { GameListWithUser } from '../types'
import CreateListModal from './CreateListModal'

interface AddToListModalProps {
  visible: boolean
  onClose: () => void
  gameId: number
  gameName?: string
}

export default function AddToListModal({ visible, onClose, gameId, gameName }: AddToListModalProps) {
  const { user } = useAuth()
  const { lists, isLoading, refetch } = useUserLists(user?.id)
  const [gameInLists, setGameInLists] = useState<Set<string>>(new Set())
  const [loadingLists, setLoadingLists] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Check which lists contain this game
  useEffect(() => {
    const checkGameInLists = async () => {
      if (!lists.length) return

      const inLists = new Set<string>()

      // Check each list's preview games for this game
      // For a more accurate check, we'd need to query list_items
      lists.forEach((list) => {
        const hasGame = list.preview_games?.some((g) => g.id === gameId)
        if (hasGame) {
          inLists.add(list.id)
        }
      })

      // For more accurate results, let's also check the database
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase
        .from('list_items')
        .select('list_id')
        .eq('game_id', gameId)
        .in('list_id', lists.map((l) => l.id))

      if (data) {
        data.forEach((item: any) => {
          inLists.add(item.list_id)
        })
      }

      setGameInLists(inLists)
    }

    if (visible) {
      checkGameInLists()
    }
  }, [lists, gameId, visible])

  const handleToggleList = async (listId: string) => {
    const isInList = gameInLists.has(listId)

    // Add to loading state
    setLoadingLists((prev) => new Set(prev).add(listId))

    if (isInList) {
      // Remove from list
      const { error } = await removeGameFromList(listId, gameId)
      if (!error) {
        setGameInLists((prev) => {
          const next = new Set(prev)
          next.delete(listId)
          return next
        })
      }
    } else {
      // Add to list
      const { error } = await addGameToList(listId, gameId)
      if (!error) {
        setGameInLists((prev) => new Set(prev).add(listId))
      }
    }

    // Remove from loading state
    setLoadingLists((prev) => {
      const next = new Set(prev)
      next.delete(listId)
      return next
    })

    // Refetch to update counts
    refetch()
  }

  const handleCreateList = () => {
    setShowCreateModal(true)
  }

  const handleListCreated = async (newList: any) => {
    setShowCreateModal(false)
    refetch()

    // Auto-add game to the newly created list
    setLoadingLists((prev) => new Set(prev).add(newList.id))
    const { error } = await addGameToList(newList.id, gameId)
    if (!error) {
      setGameInLists((prev) => new Set(prev).add(newList.id))
    }
    setLoadingLists((prev) => {
      const next = new Set(prev)
      next.delete(newList.id)
      return next
    })
    refetch()
  }

  const renderListItem = ({ item }: { item: GameListWithUser }) => {
    const isInList = gameInLists.has(item.id)
    const isLoadingItem = loadingLists.has(item.id)

    return (
      <TouchableOpacity
        style={styles.listRow}
        onPress={() => handleToggleList(item.id)}
        disabled={isLoadingItem}
        activeOpacity={0.7}
      >
        <View style={styles.listInfo}>
          <View style={styles.listTitleRow}>
            <Text style={styles.listTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.is_public && (
              <Ionicons name="lock-closed" size={12} color={Colors.textMuted} style={styles.lockIcon} />
            )}
          </View>
          <Text style={styles.listCount}>
            {item.item_count} {item.item_count === 1 ? 'game' : 'games'}
          </Text>
        </View>

        {isLoadingItem ? (
          <ActivityIndicator size="small" color={Colors.accent} />
        ) : isInList ? (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={18} color={Colors.background} />
          </View>
        ) : (
          <View style={styles.emptyCheck} />
        )}
      </TouchableOpacity>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="list-outline" size={48} color={Colors.textDim} />
      <Text style={styles.emptyText}>No lists yet</Text>
      <Text style={styles.emptySubtext}>Create your first list to start organizing games</Text>
    </View>
  )

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Add to List</Text>
              {gameName && (
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {gameName}
                </Text>
              )}
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
            </View>
          ) : (
            <FlatList
              data={lists}
              renderItem={renderListItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={renderEmpty}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Create New List Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateList}>
              <Ionicons name="add" size={20} color={Colors.background} />
              <Text style={styles.createButtonText}>Create New List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create List Modal */}
      <CreateListModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleListCreated}
      />
    </>
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
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  listInfo: {
    flex: 1,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    flex: 1,
  },
  lockIcon: {
    marginLeft: Spacing.xs,
  },
  listCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
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
    paddingHorizontal: Spacing.lg,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  createButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.background,
    marginLeft: Spacing.sm,
  },
})
