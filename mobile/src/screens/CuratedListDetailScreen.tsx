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
import { getIGDBImageUrl } from '../constants'
import { supabase } from '../lib/supabase'
import { MainStackParamList } from '../navigation'

type CuratedListDetailRouteProp = RouteProp<MainStackParamList, 'CuratedListDetail'>

// Calculate card width: (screen width - padding - gaps) / 3 columns
const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_PADDING = Spacing.lg * 2 // padding on both sides
const GAP = Spacing.md
const NUM_COLUMNS = 3
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS

interface GameItem {
  id: number
  name: string
  cover_url: string | null
  first_release_date?: string | null
}

export default function CuratedListDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute<CuratedListDetailRouteProp>()
  const { listTitle, gameIds, games: passedGames } = route.params

  const [games, setGames] = useState<GameItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGames = async () => {
      setIsLoading(true)

      // If games were passed directly (e.g., from recommendations), use them
      if (passedGames && passedGames.length > 0) {
        const mappedGames = passedGames.map(g => ({
          id: g.id,
          name: g.name,
          cover_url: g.coverUrl,
          first_release_date: g.first_release_date || null,
        }))
        // Sort by release date (newest first)
        mappedGames.sort((a, b) => {
          if (!a.first_release_date && !b.first_release_date) return 0
          if (!a.first_release_date) return 1
          if (!b.first_release_date) return -1
          return new Date(b.first_release_date).getTime() - new Date(a.first_release_date).getTime()
        })
        setGames(mappedGames)
        setIsLoading(false)
        return
      }

      // Otherwise, fetch from games_cache
      try {
        const { data, error } = await supabase
          .from('games_cache')
          .select('id, name, cover_url, first_release_date')
          .in('id', gameIds)

        if (error) throw error

        // Get all games from cache
        const fetchedGames: GameItem[] = (data || []).map((game: any) => ({
          id: game.id,
          name: game.name,
          cover_url: game.cover_url,
          first_release_date: game.first_release_date,
        }))

        // Sort by release date (newest first)
        fetchedGames.sort((a, b) => {
          if (!a.first_release_date && !b.first_release_date) return 0
          if (!a.first_release_date) return 1
          if (!b.first_release_date) return -1
          return new Date(b.first_release_date).getTime() - new Date(a.first_release_date).getTime()
        })

        setGames(fetchedGames)
      } catch (err) {
        console.error('Failed to fetch games:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGames()
  }, [gameIds, passedGames])

  const handleGamePress = (gameId: number) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'GameDetail',
        params: { gameId },
      })
    )
  }

  const renderGame = ({ item, index }: { item: GameItem; index: number }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => handleGamePress(item.id)}
      activeOpacity={0.7}
    >
      {item.cover_url ? (
        <Image
          source={{ uri: getIGDBImageUrl(item.cover_url, 'coverBig') }}
          style={styles.cover}
        />
      ) : (
        <View style={[styles.cover, styles.placeholderCover]}>
          <Text style={styles.placeholderText} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )

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
        <Text style={styles.headerTitle}>{listTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={games}
          renderItem={renderGame}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
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
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
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
    justifyContent: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  gameCard: {
    width: CARD_WIDTH,
  },
  cover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * (4 / 3), // 3:4 aspect ratio
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
})
