import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native'
import LoadingSpinner from '../components/LoadingSpinner'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/colors'
import { Fonts } from '../constants/fonts'
import { getIGDBImageUrl, STATUS_LABELS } from '../constants'
import { supabase } from '../lib/supabase'
import { MainStackParamList } from '../navigation'
import StarRating from '../components/StarRating'
import SweatDropIcon from '../components/SweatDropIcon'

type LibraryStatusRouteProp = RouteProp<MainStackParamList, 'LibraryStatus'>

const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_PADDING = Spacing.lg * 2
const GAP = Spacing.sm
const NUM_COLUMNS = 3
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

interface GameLogItem {
  id: string
  game_id: number
  status: string
  rating: number | null
  review: string | null
  game: {
    id: number
    name: string
    cover_url: string | null
  }
}

export default function LibraryStatusScreen() {
  const navigation = useNavigation()
  const route = useRoute<LibraryStatusRouteProp>()
  const { userId, status } = route.params

  const [gameLogs, setGameLogs] = useState<GameLogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const statusLabel = STATUS_LABELS[status] || status

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('game_logs')
          .select('id, game_id, status, rating, review, game:games_cache(id, name, cover_url)')
          .eq('user_id', userId)
          .eq('status', status)
          .order('updated_at', { ascending: false })

        if (error) throw error

        const logs = ((data || []) as any[])
          .filter((log: any) => log.game)
          .sort((a: any, b: any) => {
            if (a.rating !== null && b.rating !== null) return b.rating - a.rating
            if (a.rating !== null) return -1
            if (b.rating !== null) return 1
            return 0
          })

        setGameLogs(logs)
      } catch (err) {
        console.error('Failed to fetch library logs:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [userId, status])

  const handleGamePress = (gameId: number) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const renderItem = ({ item }: { item: GameLogItem }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => handleGamePress(item.game_id)}
      accessibilityLabel={item.game?.name || 'Game'}
      accessibilityRole="button"
    >
      {item.game?.cover_url ? (
        <Image
          source={{ uri: getIGDBImageUrl(item.game.cover_url, 'coverBig2x') }}
          style={styles.gameCover}
          accessibilityLabel={(item.game?.name || 'Game') + ' cover art'}
        />
      ) : (
        <View style={[styles.gameCover, styles.gameCoverPlaceholder]}>
          <SweatDropIcon size={20} variant="static" />
        </View>
      )}
      {(item.rating || item.review) && (
        <View style={styles.ratingBelow}>
          {item.rating && <StarRating rating={item.rating} size={12} filledOnly />}
          {item.review && item.review.trim().length > 0 && (
            <Ionicons
              name="chatbubble-outline"
              size={11}
              color={Colors.accent}
              style={item.rating ? { marginLeft: 3 } : undefined}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{statusLabel}</Text>
        <Text style={styles.headerCount}>{gameLogs.length}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      ) : gameLogs.length > 0 ? (
        <FlatList
          data={gameLogs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <SweatDropIcon size={48} variant="static" />
          <Text style={styles.emptyText}>No games here yet</Text>
        </View>
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
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  headerCount: {
    fontFamily: Fonts.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContent: {
    padding: Spacing.lg,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  gameCard: {
    width: CARD_WIDTH,
  },
  gameCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  gameCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBelow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
})
